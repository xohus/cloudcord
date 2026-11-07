const fs = require("node:fs");
const { createHash } = require("node:crypto");
const path = require("node:path");
const { transformSync } = require("esbuild");
const ts = require("typescript");
const reviewedBetterDiscordSources = require("./cx-betterdiscord-sources.json");

const root = path.resolve(__dirname, "../../..");
const desktopGroups = ["plugins", "cloudcordplugins", "endcordplugins", "equicordplugins", "sincordplugins", "userplugins"];
const catalogFolder = path.join(root, "examples/cx/catalog/plugins");
const quotedPattern = /[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/u;
const printer = ts.createPrinter({ removeComments: true });

const hookGroups = {
    commands: /^(commands|registerCommand|unregisterCommand)$/,
    "outgoing-message": /^(onBeforeMessage(Send|Edit)|addMessagePre(Send|Edit)Listener|on(Send|Edit)Message)$/,
    "incoming-event": /^(flux|FluxDispatcher|subscribeToDispatch|intercept|addInterceptor)$/,
    "context-menu": /^(contextMenus|addContextMenuPatch|patchContextMenu|onContextMenu)$/,
    "component-render": /^(patches|onJsxCreate|chatBarButton|renderMessage|patcher|Patcher)$/,
    "app-state": /^(findByStoreName(Lazy)?|useStateFromStores|[A-Z]\w+Store)$/,
    settings: /^(settings|SettingsComponent|definePluginSettings|pluginSettings|loadData|saveData)$/,
    appearance: /^(defineTweak|addStyle|removeStyle|enableStyle|disableStyle)$/,
    network: /^(fetch|XMLHttpRequest|RestAPI|request)$/,
    "native-access": /^(VencordNative|DiscordNative|NativeModules|FileSystem|clipboard|Clipboard)$/,
};

function inventory(source) {
    const hooks = new Set();
    const targets = new Set();
    const event = /^(?:MESSAGE|VOICE|CHANNEL|GUILD|RELATIONSHIP|PRESENCE|TYPING|USER_PROFILE)_[A-Z][A-Z0-9_]*$/;
    const visit = node => {
        if (ts.isIdentifier(node)) {
            for (const [group, pattern] of Object.entries(hookGroups)) if (pattern.test(node.text)) hooks.add(group);
            if (event.test(node.text) && (ts.isMethodDeclaration(node.parent) || ts.isPropertyAssignment(node.parent)))
                targets.add("event:" + node.text);
            if (/^[A-Z][a-zA-Z0-9]+Store$/.test(node.text)) targets.add("store:" + node.text);
        }
        if (ts.isStringLiteralLike(node) && event.test(node.text)) targets.add("event:" + node.text);
        if (ts.isCallExpression(node)) {
            const callee = ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text : identifier(node.expression);
            const first = literal(node.arguments[0]);
            if (/^(?:findByProps(?:Lazy)?|getByKeys)$/.test(callee ?? "")) {
                for (const argument of node.arguments) {
                    const key = literal(argument);
                    if (key && /^[a-zA-Z_$][\w$]{2,79}$/.test(key)) targets.add("module:" + key);
                }
            } else if (/^(?:find(?:By)?Store(?:Name)?(?:Lazy)?|getStore)$/.test(callee ?? "") && first && /^[A-Z]\w+Store$/.test(first)) {
                targets.add("store:" + first);
            } else if (callee === "onJsxCreate" && first && /^[A-Z][\w$]{2,79}$/.test(first)) {
                targets.add("component:" + first);
            } else if (callee === "defineTweak") {
                const css = literal(node.arguments[2]) ?? "";
                for (const match of css.matchAll(/(?:\{|;)\s*([a-z-]+)\s*:/g)) targets.add("css:" + match[1]);
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
    return { hooks: [...hooks].sort(), targets: [...targets].sort() };
}

function property(object, key) {
    if (!object || !ts.isObjectLiteralExpression(object)) return;
    return object.properties.find(entry => entry.name && ts.isIdentifier(entry.name) && entry.name.text === key);
}

function exportAssignment(node) {
    if (!ts.isExpressionStatement(node)) return;
    const assignment = node.expression;
    if (!ts.isBinaryExpression(assignment) || assignment.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return;
    const target = assignment.left;
    if (ts.isPropertyAccessExpression(target) && identifier(target.expression) === "module" && target.name.text === "exports")
        return expression(assignment.right);
}

function styleCall(method, operation, count) {
    if (!ts.isMethodDeclaration(method) || method.modifiers?.length || method.asteriskToken || method.parameters.length
        || method.body?.statements.length !== 1) return;
    const statement = method.body.statements[0];
    if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) return;
    const call = statement.expression;
    if (call.questionDotToken || call.typeArguments?.length || call.arguments.length !== count
        || printed(call.expression, method.getSourceFile()) !== "BdApi.DOM." + operation) return;
    const args = call.arguments.map(literal);
    if (args.every(arg => arg !== undefined)) return args;
}

function appearanceLines(targets) {
    const instructions = targets.map(([target, rule]) => ("style" in rule ? "style " : "hide ") + target);
    const permissions = new Set(instructions.map(instruction => "  needs appearance." + instruction.split(" ")[0]));
    return [...permissions, ...instructions.map(instruction => "  " + instruction)];
}

function normalizeAppearanceStyles(stylesheet) {
    const result = transformSync(stylesheet, { loader: "css", minifyWhitespace: true, legalComments: "none", logLevel: "silent" });
    if (!result.warnings.length) return result.code.trim();
}

const appearanceMatchers = new WeakMap();
function matchAppearanceStyles(stylesheet, appearance) {
    if (!stylesheet) return;
    let rules = appearanceMatchers.get(appearance);
    if (!rules) {
        rules = Object.entries(appearance).map(target => ({ target, css: normalizeAppearanceStyles(target[1].css) }))
            .filter(rule => rule.css).sort((a, b) => b.css.length - a.css.length);
        appearanceMatchers.set(appearance, rules);
    }
    const targets = [];
    let css;
    try { css = normalizeAppearanceStyles(stylesheet); }
    catch { return; }
    while (css) {
        const rule = rules.find(rule => css.startsWith(rule.css));
        if (!rule || targets.includes(rule.target)) return;
        targets.push(rule.target);
        css = css.slice(rule.css.length);
    }
    if (targets.length) return targets;
}

function compileBetterDiscordTypingRules(source) {
    const plugin = source.statements.length === 1 && exportAssignment(source.statements[0]);
    const constructor = plugin && ts.isClassExpression(plugin) && plugin.members.find(ts.isConstructorDeclaration);
    const setup = constructor?.body?.statements.find(statement => ts.isExpressionStatement(statement)
        && ts.isBinaryExpression(statement.expression) && printed(statement.expression.left, source) === "this.quirkPatterns");
    const rules = setup?.expression.right;
    if (!rules || !ts.isArrayLiteralExpression(rules)) return;
    const lines = [];
    for (const rule of rules.elements) {
        if (!fieldsAre(rule, ["name", "regex", "replace"])) return;
        const regex = value(rule, "regex");
        const replacement = value(rule, "replace");
        if (!regex || !ts.isRegularExpressionLiteral(regex) || !replacement) return;
        const [, pattern, flags] = /^\/(.+)\/([a-z]*)$/.exec(regex.text) ?? [];
        const replacementText = literal(replacement);
        if (pattern === "^" && flags === "" && safeText(replacementText)) {
            lines.push("    prefix " + JSON.stringify(replacementText));
            continue;
        }
        if (ts.isArrowFunction(replacement) && pattern === String.raw`[\s\S]*` && flags === "") {
            lines.push("    alternate-case");
            continue;
        }
        if (ts.isArrowFunction(replacement) && pattern === "E+" && flags === "g") {
            lines.push('    shorten-run "E" with "-"');
            continue;
        }
        if (!pattern || !["g", "gi"].includes(flags) || !safeText(replacementText, true) || /\$[$&'\x60\d]/.test(replacementText)) return;
        const wholeWord = pattern.startsWith("\\b") && pattern.endsWith("\\b");
        let literalPattern = wholeWord ? pattern.slice(2, -2) : pattern;
        let alternatives;
        if (/^(?:\[[A-Za-z]+\])+$/.test(literalPattern)) {
            alternatives = [""];
            for (const [, characters] of literalPattern.matchAll(/\[([A-Za-z]+)\]/g)) {
                alternatives = [...new Set(alternatives.flatMap(word => [...characters].map(character => word + character)))];
                if (alternatives.length > 16) return;
            }
        } else {
            if (literalPattern.startsWith("(") && literalPattern.endsWith(")")) literalPattern = literalPattern.slice(1, -1);
            alternatives = literalPattern.split("|");
            if (alternatives.some(word => !word.trim() || /[.*+?^$(){}\[\]\\]/.test(word))) return;
        }
        lines.push("    replace " + JSON.stringify(alternatives) + " with " + JSON.stringify(replacementText)
            + (flags === "gi" ? " ignore-case" : "") + (wholeWord ? " whole-word" : ""));
    }
    if (lines.length) return ["  needs messages.transform", "  before send rewrite-text:", ...lines];
}

function inspectBetterDiscord(file, code, appearance) {
    const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const header = /^\s*\/\*\*[\s\S]*?\*\//.exec(code)?.[0];
    const name = header?.match(/^\s*\*\s*@name\s+([^\r\n*]+?)\s*$/m)?.[1];
    if (!name || !safeText(name) || name.length > 64) return;
    const inventoryResult = inventory(source);
    const hooks = new Set(inventoryResult.hooks);
    if (/\b(?:Webpack|BDFDB\.LibraryModules)\b/.test(code)) hooks.add("app-state");
    if (/\b(?:Patcher|BDFDB\.PatchUtils)\b/.test(code)) hooks.add("component-render");
    if (/\b(?:buildSettingsPanel|getSettingsPanel|BDFDB\.DataUtils)\b/.test(code)) hooks.add("settings");
    if (/\b(?:addStyle|removeStyle|BDFDB\.DOMUtils)\b/.test(code)) hooks.add("appearance");
    const record = { name, file, platform: "betterdiscord", hooks: [...hooks].sort(), targets: inventoryResult.targets, flags: {
        commands: hooks.has("commands"), outgoing: hooks.has("outgoing-message"), settings: hooks.has("settings"),
        ui: hooks.has("component-render"), styles: hooks.has("appearance"),
    } };
    const rawSha256 = createHash("sha256").update(code, "utf8").digest("hex");
    const sha256 = reviewedBetterDiscordSources[rawSha256] ? rawSha256
        : createHash("sha256").update(code.replaceAll("\r\n", "\n"), "utf8").digest("hex");
    const review = reviewedBetterDiscordSources[sha256];
    if (review?.name === name && review.recipe === "typing-rules" && !source.parseDiagnostics.length) {
        const lines = compileBetterDiscordTypingRules(source);
        if (lines) return { ...record, review: { ...review, sha256 }, capability: "outgoing-text",
            cx: ["plugin " + JSON.stringify(name) + ":", ...lines, ""].join("\n") };
    }
    if (review?.name === name && review.recipe === "reply-ping-default" && !source.parseDiagnostics.length) {
        return {
            ...record, review: { ...review, sha256 }, capability: "reply-default",
            cx: ["plugin " + JSON.stringify(name) + ":", "  needs replies.suppressping",
                '  on incoming reply-ping-default ""', ""].join("\n"),
        };
    }
    if (review?.name === name && review.recipe === "avatar-resolution" && !source.parseDiagnostics.length) {
        const sizes = source.statements.filter(ts.isVariableStatement).flatMap(statement => [...statement.declarationList.declarations])
            .find(declaration => identifier(declaration.name) === "VALID_SIZES")?.initializer;
        const first = sizes && ts.isArrayLiteralExpression(sizes) && sizes.elements[0];
        if (first && ts.isNumericLiteral(first)) {
            return {
                ...record, review: { ...review, sha256 }, capability: "native-effect",
                cx: ["plugin " + JSON.stringify(name) + ":", "  needs appearance.avatarresolution", "  use avatar-resolution " + first.text, ""].join("\n"),
            };
        }
    }
    const license = /SPDX-License-Identifier:\s*(?:GPL-3\.0-or-later|MIT|BSD-3-Clause|Apache-2\.0)\b/.test(code);
    const plugin = source.statements.length === 1 && exportAssignment(source.statements[0]);
    if (!license || source.parseDiagnostics.length || !plugin || !ts.isClassExpression(plugin) || plugin.heritageClauses?.length
        || plugin.members.length !== 2 || plugin.modifiers?.length) return record;
    const methods = new Map(plugin.members.map(member => [identifier(member.name), member]));
    const added = methods.has("start") && styleCall(methods.get("start"), "addStyle", 2);
    const removed = methods.has("stop") && styleCall(methods.get("stop"), "removeStyle", 1);
    if (!added || !removed || !added[0] || added[0] !== removed[0]) return record;
    const targets = matchAppearanceStyles(added[1], appearance);
    if (!targets) return record;
    return {
        ...record,
        capability: "appearance",
        cx: ["plugin " + JSON.stringify(name) + ":", ...appearanceLines(targets), ""].join("\n"),
    };
}

function value(object, key) {
    const field = property(object, key);
    return field && ts.isPropertyAssignment(field) ? field.initializer : undefined;
}

function literal(node) {
    return node && ts.isStringLiteralLike(node) ? node.text : undefined;
}

function expression(node) {
    while (node && ts.isParenthesizedExpression(node)) node = node.expression;
    return node;
}

function safeText(text, empty = false) {
    return typeof text === "string" && (empty || Boolean(text.trim())) && text.length <= 240 && !quotedPattern.test(text);
}

function identifier(node) {
    return node && ts.isIdentifier(node) ? node.text : undefined;
}

function fieldsAre(object, allowed) {
    const seen = new Set();
    return ts.isObjectLiteralExpression(object) && object.properties.every(field => {
        const name = identifier(field.name);
        if (!allowed.includes(name) || seen.has(name)) return false;
        if (!ts.isPropertyAssignment(field) && !ts.isMethodDeclaration(field)) return false;
        seen.add(name);
        return true;
    });
}

function printed(node, source) {
    return printer.printNode(ts.EmitHint.Unspecified, node, source);
}

function imported(source, name, module) {
    return source.statements.some(node => {
        if (!ts.isImportDeclaration(node) || node.moduleSpecifier.text !== module) return false;
        const clause = node.importClause;
        if (clause?.name?.text === name) return true;
        const bindings = clause?.namedBindings;
        return bindings && ts.isNamedImports(bindings)
            && bindings.elements.some(entry => !entry.propertyName && entry.name.text === name);
    });
}

function handler(object, name) {
    const field = property(object, name);
    if (!field) return;
    const method = ts.isMethodDeclaration(field) ? field : value(object, name);
    if (!method || (!ts.isMethodDeclaration(method) && !ts.isArrowFunction(method))
        || method.asteriskToken || method.modifiers?.length || method.parameters.some(p => !identifier(p.name) || p.initializer || p.dotDotDotToken)) return;
    return method;
}

function returnedContent(method) {
    const body = method?.body;
    if (!body) return;
    const statements = ts.isBlock(body) ? [...body.statements] : [];
    const last = statements.pop();
    const returned = expression(ts.isBlock(body) ? (last && ts.isReturnStatement(last) ? last.expression : undefined) : body);
    if (!returned || !fieldsAre(returned, ["content"])) return;
    return { content: value(returned, "content"), statements };
}

function localText(node, parameter, input, source) {
    return node && ts.isCallExpression(node) && identifier(node.expression) === "findOption"
        && imported(source, "findOption", "@api/Commands") && node.arguments.length === 3
        && identifier(node.arguments[0]) === parameter && literal(node.arguments[1]) === input
        && literal(node.arguments[2]) === "";
}

function commandMessage(node, isInput, input, source) {
    const text = literal(node);
    if (text !== undefined) return text.includes("$" + "{") ? undefined : text;
    if (isInput(node)) return "$" + "{message}";
    if (node && input) {
        const code = printed(node, source).replace(/\s+(?=\.)/g, "");
        const portable = new Map([
            ["[..." + input + '].reverse().join("")', "reverse"],
            [input + '.split("").join(" ")', "spaced"],
            [input + '.split(/\\s+/).filter(Boolean).join(" 👏 ")', "clap"],
        ]).get(code);
        if (portable) return "$" + "{" + portable + "(message)}";
    }
    if (!node || !ts.isTemplateExpression(node) || node.head.text.includes("$" + "{")) return;
    let output = node.head.text;
    for (const span of node.templateSpans) {
        if (!isInput(span.expression) || span.literal.text.includes("$" + "{")) return;
        output += "$" + "{message}" + span.literal.text;
    }
    return output;
}

function randomMessages(node, source) {
    if (!node || !ts.isElementAccessExpression(node)) return;
    const name = identifier(node.expression);
    if (!name || name === "Math" || printed(node.argumentExpression, source) !== "Math.floor(Math.random() * " + name + ".length)") return;
    const declarations = source.statements.filter(ts.isVariableStatement);
    if (declarations.length !== 1) return;
    const list = declarations[0].declarationList;
    if (!(list.flags & ts.NodeFlags.Const) || list.declarations.length !== 1) return;
    const declaration = list.declarations[0];
    const items = declaration.initializer;
    if (identifier(declaration.name) !== name || !items || !ts.isArrayLiteralExpression(items)) return;
    const choices = items.elements.map(literal);
    if (choices.length && choices.length <= 24 && choices.every(choice => safeText(choice) && !choice.includes("$" + "{"))) return choices;
}

function compileCommands(plugin, source) {
    if (!fieldsAre(plugin, ["name", "description", "authors", "tags", "searchTerms", "dependencies", "commands"])) return;
    const commands = value(plugin, "commands");
    if (!commands || !ts.isArrayLiteralExpression(commands) || !commands.elements.length || commands.elements.length > 48) return;
    const lines = ["  needs commands.register", "  needs messages.send"];
    const names = new Set();
    for (const command of commands.elements) {
        if (!fieldsAre(command, ["name", "description", "options", "execute"])) return;
        const name = literal(value(command, "name"));
        if (!name || !/^[a-z][a-z0-9_-]{0,31}$/.test(name) || names.has(name)) return;
        names.add(name);
        const execute = handler(command, "execute");
        const result = returnedContent(execute);
        if (!result || execute.parameters.length > 1) return;
        const options = value(command, "options");
        if (options && (!ts.isArrayLiteralExpression(options) || options.elements.length > 1)) return;
        const option = options && identifier(options.elements[0]);
        if (options?.elements.length && (!["RequiredMessageOption", "OptionalMessageOption"].includes(option)
            || !imported(source, option, "@api/Commands"))) return;
        const parameter = identifier(execute.parameters[0]?.name);
        const { content, statements } = result;
        let variable;
        if (statements.length === 1 && option && parameter && ts.isVariableStatement(statements[0])) {
            const list = statements[0].declarationList;
            const declaration = list.declarations[0];
            const local = identifier(declaration.name);
            if (!(list.flags & ts.NodeFlags.Const) || list.declarations.length !== 1 || !local || local === parameter || local === "findOption"
                || !localText(declaration.initializer, parameter, "message", source)) return;
            variable = local;
        } else if (statements.length) return;
        const isInput = node => Boolean(option && parameter && ((variable && identifier(node) === variable)
            || localText(node, parameter, "message", source)));
        const input = option && parameter ? (variable ?? "findOption(" + parameter + ', "message", "")') : undefined;
        const message = commandMessage(content, isInput, input, source);
        const choices = !option && randomMessages(content, source);
        if (!safeText(message) && !choices) return;
        lines.push("  on command " + JSON.stringify(name) + ":");
        if (option) lines.push('    input "message" text' + (option === "OptionalMessageOption" ? " optional" : ""));
        lines.push(choices ? "    send one of " + JSON.stringify(choices) : "    send " + JSON.stringify(message));
    }
    return { capability: "commands", lines };
}

function compileOutgoing(plugin) {
    if (!fieldsAre(plugin, ["name", "description", "authors", "tags", "searchTerms", "dependencies", "onBeforeMessageSend", "onBeforeMessageEdit"])) return;
    const permissions = [];
    const rules = [];
    for (const [stage, hook, args, permission] of [
        ["send", "onBeforeMessageSend", 2, "messages.transform"],
        ["edit", "onBeforeMessageEdit", 3, "messages.edit.transform"],
    ]) {
        if (!property(plugin, hook)) continue;
        const method = handler(plugin, hook);
        if (!method || method.parameters.length !== args || !ts.isBlock(method.body) || method.body.statements.length !== 1) return;
        const message = identifier(method.parameters[args - 1].name);
        const statement = method.body.statements[0];
        const assignment = ts.isExpressionStatement(statement) && statement.expression;
        if (!assignment || !ts.isBinaryExpression(assignment) || assignment.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return;
        const isContent = node => ts.isPropertyAccessExpression(node) && identifier(node.expression) === message && node.name.text === "content";
        const call = assignment.right;
        if (!isContent(assignment.left) || !ts.isCallExpression(call) || !ts.isPropertyAccessExpression(call.expression)
            || call.expression.name.text !== "replaceAll" || !isContent(call.expression.expression) || call.arguments.length !== 2) return;
        const [find, replacement] = call.arguments.map(literal);
        if (!safeText(find) || !safeText(replacement, true) || replacement.includes("$")) return;
        permissions.push("  needs " + permission);
        rules.push("  before " + stage + " replace " + JSON.stringify(find) + " with " + JSON.stringify(replacement));
    }
    if (rules.length) return { capability: "outgoing-text", lines: [...permissions, ...rules] };
}

function compileOriginRewrites(plugin, source) {
    if (!fieldsAre(plugin, ["name", "description", "authors", "tags", "searchTerms", "dependencies", "replaceUrl", "onBeforeMessageSend"])) return;
    const declarations = source.statements.filter(ts.isVariableStatement);
    if (declarations.length !== 1) return;
    const list = declarations[0].declarationList;
    if (!(list.flags & ts.NodeFlags.Const) || list.declarations.length !== 1) return;
    const { name, initializer } = list.declarations[0];
    const map = identifier(name);
    if (!map || !initializer || !ts.isNewExpression(initializer) || identifier(initializer.expression) !== "Map"
        || initializer.arguments?.length !== 1 || !ts.isArrayLiteralExpression(initializer.arguments[0])) return;
    const entries = initializer.arguments[0].elements.map(item => ts.isArrayLiteralExpression(item) && item.elements.map(literal));
    const origin = /^https:\/\/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,62}$/i;
    if (!entries.length || entries.length > 32 || entries.some(pair => !pair || pair.length !== 2
        || pair.some(value => !safeText(value) || !origin.test(value)) || pair[0].toLowerCase() === pair[1].toLowerCase())
        || new Set(entries.map(([key]) => key.toLowerCase())).size !== entries.length) return;
    const replace = handler(plugin, "replaceUrl");
    const send = handler(plugin, "onBeforeMessageSend");
    const arg = identifier(replace?.parameters[0]?.name);
    const draft = identifier(send?.parameters[1]?.name);
    if (!arg || !draft || replace.parameters.length !== 1 || send.parameters.length !== 2) return;
    const helper = printed(replace.body, source).replace(/\s+/g, " ");
    const match = /^\{ try \{ var ([a-zA-Z_$][\w$]*) = new URL\(/.exec(helper);
    if (!match) return;
    const url = match[1];
    const expected = "{ try { var " + url + " = new URL(" + arg + "); } catch (error) { return " + arg + "; } "
        + "if (" + map + ".has(" + url + ".origin)) { return " + map + ".get(" + url + ".origin) + "
        + url + ".pathname + " + url + ".search; } return " + arg + "; }";
    if (helper !== expected) return;
    const content = draft + ".content";
    const assignment = content + " = this.replaceUrl(" + content + ");";
    const hook = printed(send.body, source).replace(/\s+/g, " ");
    if (hook !== "{ " + assignment + " }" && hook !== "{ if (/https:\\/\\//.test(" + content + ")) { " + assignment + " } }") return;
    return {
        declaration: declarations[0],
        capability: "origin-rewrite",
        lines: ["  needs messages.transform", "  needs messages.redirectlinks", ...entries.map(([from, to]) =>
            "  before send rewrite-origin " + JSON.stringify(from) + " with " + JSON.stringify(to)
        )],
    };
}

// These three built-in mobile plugins share the same event filter. Match the
// original start hook before generating its portable CX counterpart.
const mobileFilterRecipes = {
    NoBlockedMessages: {
        start: '{ const relationships = findByStoreName("RelationshipStore"); '
            + 'stopFilter = filterMessages(message => !!message.author?.id && relationships?.isBlocked?.(message.author.id) === true); }',
        rule: "hide-blocked", value: "blocked,ignored",
    },
    ClientSideBlock: {
        start: '{ stop = filterMessages(message => !!message.author?.id && '
            + 'new Set(String(settings.get("usersToBlock") || "").split(/[\\s,]+/).filter(Boolean)).has(message.author.id)); }',
        rule: "hide-users", value: "",
    },
    BlockKeywords: {
        start: '{ void awaitStorage(storage).then(() => { stopFilter = filterMessages(message => { '
            + 'const tests = matchers(); if (!tests.length) return false; '
            + 'const texts = [message.content || "", ...(message.embeds || []).flatMap(embed => [embed.title || "", embed.description || ""])]; '
            + 'return texts.some(text => text && tests.some(test => test(text))); }); }); }',
        rule: "hide-keywords", value: "",
    },
    NoProfileThemes: {
        start: '{ stop = onProfileLoad((profile, userId) => { '
            + 'if (userId === findByStoreName("UserStore")?.getCurrentUser?.()?.id) return; '
            + 'delete profile.theme_colors; delete profile.themeColors; }); }',
        rule: "hide-profile-themes", value: "", permission: "appearance.style",
        helper: ["onProfileLoad", "../shared/profiles"],
    },
};

function compileMobileFilter(name, file, plugin, source) {
    if (!/^ios\/runtime\/src\/core\/plugins\/(?:noblockedmessages|clientsideblock|blockkeywords|noprofilethemes)\/index\.tsx?$/.test(file)
        || !Object.prototype.hasOwnProperty.call(mobileFilterRecipes, name)
        || !fieldsAre(plugin, ["manifest", "start", "stop", "SettingsComponent"])) return;
    const start = handler(plugin, "start");
    const stop = handler(plugin, "stop");
    const recipe = mobileFilterRecipes[name];
    if (!start || !stop || !imported(source, ...(recipe.helper ?? ["filterMessages", "../shared/messageFilter"]))
        || printed(start.body, source).replace(/\s+/g, " ") !== recipe.start) return;
    return {
        capability: "incoming-filter",
        lines: ["  needs " + (recipe.permission ?? "messages.filterlocal"), "  on incoming " + recipe.rule + " " + JSON.stringify(recipe.value)],
    };
}

function compileMobileClientCommands(file, plugin, source) {
    if (!/^ios\/runtime\/src\/core\/plugins\/(?:atsomeone|friendinvites|inrole|readallnotifications|spotifysharecommands)\/index\.ts$/.test(file)
        || !fieldsAre(plugin, ["manifest", "start", "stop"])
        || !imported(source, "registerCommand", "@lib/api/commands")) return;
    const start = handler(plugin, "start");
    if (!start || !ts.isBlock(start.body) || start.body.statements.length !== 1) return;
    const code = printed(start.body, source);
    const startStatement = start.body.statements[0];
    if (!ts.isExpressionStatement(startStatement) || !ts.isBinaryExpression(startStatement.expression)
        || startStatement.expression.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return;
    const call = startStatement.expression.right;
    if (!ts.isCallExpression(call)) return;
    let permissions, lines;
    if (identifier(call.expression) === "registerCommand" && call.arguments.length === 1 && ts.isAsExpression(call.arguments[0])) {
        const command = call.arguments[0].expression;
        const name = literal(value(command, "name"));
        if (!fieldsAre(command, ["name", "description", "options", "execute"])) return;
        if (name === "inrole" && code.includes('findByStoreName("GuildMemberStore")') && code.includes("ApplicationCommandOptionType.ROLE")) {
            permissions = ["guild.members", "reply.local"];
            lines = ['  on command "inrole":', '    input "role" role', '    reply "${roleMembers(role)}"'];
        } else if (name === "readall" && code.includes("unreadChannels()") && code.includes('type: "BULK_ACK"')) {
            permissions = ["servers.markread", "reply.local"];
            lines = ['  on command "readall":', "    mark servers read"];
        } else if (name === "someone" && code.includes('findByStoreName("GuildMemberStore")?.getMemberIds?.(guildId)')
            && code.includes('ids.filter(id => id !== me)') && code.includes('others[Math.floor(Math.random() * others.length)]')
            && code.includes('arg?.name === "message"')) {
            permissions = ["guild.randommember", "messages.send", "reply.local"];
            lines = ['  on command "someone":', '    input "message" text optional',
                '    send "${randomMember(message)}" else "No other loaded members in this server."'];
        }
    } else if (/unregisters = COMMANDS\.map\(command => registerCommand\(\{ \.\.\.command, options: \[\] \} as any\)\);/.test(code)) {
        const commands = source.statements.filter(ts.isVariableStatement)
            .flatMap(statement => [...statement.declarationList.declarations])
            .find(declaration => identifier(declaration.name) === "COMMANDS")?.initializer;
        const names = commands && ts.isArrayLiteralExpression(commands) && commands.elements.map(item =>
            fieldsAre(item, ["name", "description", "execute"]) && literal(value(item, "name")));
        if (Array.isArray(names) && names.join(",") === "track,album,artist") {
            permissions = ["spotify.activity", "messages.send", "reply.local"];
            lines = names.flatMap(name => {
                const expression = "spotify" + name[0].toUpperCase() + name.slice(1) + "(message)";
                return ["  on command " + JSON.stringify(name) + ":", '    input "message" text optional',
                    '    send "${' + expression + '}" else "No Spotify ' + name + ' to share."'];
            });
        } else if (Array.isArray(names) && names.join(",") === "create friend invite,view friend invites,revoke friend invites"
            && imported(source, "findByProps", "@metro")) {
            const methods = ["createFriendInvite", "getAllFriendInvites", "revokeFriendInvites"];
            const operations = ["create", "list", "revoke"];
            if (!commands.elements.every((item, index) => {
                const execute = expression(value(item, "execute"));
                return execute && ts.isCallExpression(execute) && identifier(execute.expression) === "run"
                    && execute.arguments.length === 1 && ts.isArrowFunction(execute.arguments[0])
                    && printed(execute.arguments[0].body, source).includes("await invitesModule()." + methods[index] + "()");
            })) return;
            permissions = ["reply.local", ...operations.map(operation => "friends.invites." + operation)];
            lines = names.flatMap((name, index) => ["  on command " + JSON.stringify(name.replaceAll(" ", "-")) + ":",
                "    " + operations[index] + " friend invites"]);
        }
    }
    if (lines) return { capability: "client-command", lines: ["  needs commands.register", ...permissions.map(permission => "  needs " + permission), ...lines] };
}

function compileMobileNativeEffect(file, plugin, source, nativeEffects) {
    if (!file.startsWith("ios/runtime/src/core/plugins/") || !fieldsAre(plugin, ["manifest", "start", "stop"])) return;
    if (file === "ios/runtime/src/core/plugins/betterplusreacts/index.ts") {
        const sha256 = createHash("sha256").update(source.text.replaceAll("\r\n", "\n"), "utf8").digest("hex");
        if (sha256 !== "186ed4cdbf4ffd0b3bfa71efb68a7d9bf058a1e2b4e1a2263fc9b7091ec1532e" || !nativeEffects["plus-reactions"]) return;
        return { capability: "native-effect", lines: ["  needs " + nativeEffects["plus-reactions"].permission, "  use plus-reactions"] };
    }
    const start = handler(plugin, "start");
    const stop = handler(plugin, "stop");
    if (!start || !stop || !ts.isBlock(start.body)) return;
    const code = printed(start.body, source).replace(/\s+/g, " ");
    let effect;
    if (imported(source, "findByProps", "@metro")
        && code === '{ findByProps("relativeTimeRounding", "locale")?.relativeTimeRounding?.(Math.floor); }'
        && printed(stop.body, source).replace(/\s+/g, " ") === '{ findByProps("relativeTimeRounding", "locale")?.relativeTimeRounding?.(Math.round); }') {
        effect = "floor-relative-time";
    } else if (imported(source, "instead", "@lib/api/patcher")) {
        if (/^\{ const typing = findByProps\("startTyping", "stopTyping"\); if \(!typing\) return; unpatches = \["startTyping", "stopTyping"\]\.map\(name => instead\(name, typing, \(\) => undefined\)\); \}$/.test(code))
            effect = "silent-typing";
        else if (/^\{ const relationships = findByStoreName\("RelationshipStore"\); for \(const name of \["getPendingCount", "getPendingIncomingCount"\]\) \{ if \(typeof relationships\?\.\[name\] === "function"\) unpatches\.push\(instead\(name, relationships, \(\) => 0\)\); \} \}$/.test(code))
            effect = "pending-friend-count";
    } else if (imported(source, "before", "@lib/api/patcher")) {
        const animate = '{ const icons = findByProps("getUserAvatarURL", "getGuildIconURL"); if (!icons) return; '
            + 'for (const name of ["getUserAvatarURL", "getUserBannerURL", "getGuildMemberAvatarURL"]) { '
            + 'if (typeof icons[name] === "function") unpatches.push(before(name, icons, args => { args[1] = true; return args; })); } '
            + 'if (typeof icons.getGuildIconURL === "function") unpatches.push(before("getGuildIconURL", icons, args => { '
            + 'if (args[0] && typeof args[0] === "object") args[0] = { ...args[0], canAnimate: true }; return args; })); }';
        if (code === animate) effect = "animated-assets";
    }
    if (effect && nativeEffects[effect]) return {
        capability: "native-effect",
        lines: ["  needs " + nativeEffects[effect].permission, "  use " + effect],
    };
}

// Only translate reviewed patch bodies into named runtime adapters. The
// emitted CX never carries Webpack source, store names, or replacement code.
const desktopEffectRecipes = {
    AnonymiseFileNames: {
        sha256: "c1c808212ec54cf39a833cb7be196e02793a81d88fb9b11aab450a6233324f8d",
        uploadNaming: true,
    },
    FixFileExtensions: {
        effect: "fix-file-extensions",
        sha256: "bb47394a4de5d34df3b8d59b9d53e34196d451db664eaa20e0664ec1638a330e",
    },
    BetterPlusReacts: {
        effect: "plus-reactions",
        sha256: "00d8cac138cbb241679d85eba94441e58031ce12ed2ba456c908793ba4ab6fe5",
    },
    NoTypingAnimation: {
        effect: "static-typing-dots",
        sha256: "845c1713b901057cb0fedbbb30db70238b3480da8170f79fccf6b64def7b055a",
    },
    StopAutoUnread: {
        effect: "stop-auto-unread",
        find: "}maybeAutoUpgradeChannel(",
        match: String.raw`/maybeAutoUpgradeChannel\(\i\){/`,
        replace: "$&return !1;",
    },
};

function compileDesktopEffect(name, plugin, source, entry, nativeEffects) {
    if (!Object.hasOwn(desktopEffectRecipes, name)) return;
    const recipe = desktopEffectRecipes[name];
    if (recipe.uploadNaming) {
        const sha256 = createHash("sha256").update(source.text.replaceAll("\r\n", "\n"), "utf8").digest("hex");
        if (sha256 !== recipe.sha256) return;
        return { capability: "upload-naming", lines: [
            "  needs uploads.rename", "  needs commands.register", "  needs reply.local",
            "  before upload anonymise random 7", '  on command "spoiler":',
            '    input "value" boolean optional', '    set upload spoilers "value"',
        ] };
    }
    const effect = nativeEffects[recipe.effect];
    if (!effect) return;
    const compiled = { capability: "native-effect", lines: ["  needs " + effect.permission, "  use " + recipe.effect] };
    if (recipe.sha256) {
        const sha256 = createHash("sha256").update(source.text.replaceAll("\r\n", "\n"), "utf8").digest("hex");
        return sha256 === recipe.sha256 ? compiled : undefined;
    }
    if (!fieldsAre(plugin, ["name", "description", "authors", "tags", "patches"])
        || !source.statements.every(node => node === entry || ts.isImportDeclaration(node)
            && ["@utils/constants", "@utils/types"].includes(node.moduleSpecifier.text))) return;
    const patches = value(plugin, "patches");
    if (!patches || !ts.isArrayLiteralExpression(patches) || patches.elements.length !== 1) return;
    const [patch] = patches.elements;
    if (!fieldsAre(patch, ["find", "replacement"]) || literal(value(patch, "find")) !== recipe.find) return;
    const replacement = value(patch, "replacement");
    if (!replacement || !fieldsAre(replacement, ["match", "replace"])) return;
    const match = value(replacement, "match");
    if (!match || !ts.isRegularExpressionLiteral(match) || match.text !== recipe.match
        || literal(value(replacement, "replace")) !== recipe.replace) return;
    return compiled;
}

const externalLookupRecipes = {
    WikiLookup: {
        sha256: "0aa611e0a6bcb1b062b66ab7193f8ef03445eac2aee57bc2c0b0feae627f614d",
        command: "wiki",
        service: "wikipedia",
        input: "message",
    },
};

function compileExternalLookup(name, code) {
    if (!Object.hasOwn(externalLookupRecipes, name)) return;
    const recipe = externalLookupRecipes[name];
    const sha256 = createHash("sha256").update(code.replaceAll("\r\n", "\n"), "utf8").digest("hex");
    if (sha256 !== recipe.sha256) return;
    return { capability: "external-lookup", lines: [
        "  needs commands.register", "  needs reply.local", "  needs lookup." + recipe.service,
        "  on command " + JSON.stringify(recipe.command) + ":",
        "    input " + JSON.stringify(recipe.input) + " text",
        "    lookup " + recipe.service + " " + JSON.stringify(recipe.input),
    ] };
}

const mobileSocialRecipes = {
    voicejoinmessages: { event: "VOICE_STATE_UPDATES", rule: "friends-voice", permission: "voice.notifyfriends",
        signatures: ['relationships?.isFriend?.(state.userId)', 'lastChannel.set(state.userId, state.channelId ?? null)', 'showToast('] },
    followvoiceuser: { event: "VOICE_STATE_UPDATES", rule: "follow-voice", permission: "voice.followfriend",
        signatures: ['settings.get("userId")', 's.userId === target', 'joinVoice(state.channelId!)'] },
    relationshipnotifier: { event: "RELATIONSHIP_REMOVE", rule: "friend-removals", permission: "friends.notifyremoval",
        signatures: ['before("removeRelationship", actions', 'removedByMe.get(id)', 'payload.relationship?.type === FRIEND'] },
};

function compileMobileSocialEvents(file, plugin, source) {
    const key = /^ios\/runtime\/src\/core\/plugins\/([a-z]+)\/index\.ts$/.exec(file)?.[1];
    if (!key || !Object.prototype.hasOwnProperty.call(mobileSocialRecipes, key)
        || !fieldsAre(plugin, ["manifest", "start", "stop", "SettingsComponent"])
        || !imported(source, "intercept", "@lib/api/flux")) return;
    const start = handler(plugin, "start");
    if (!start || !handler(plugin, "stop")) return;
    const code = printed(start.body, source);
    const recipe = mobileSocialRecipes[key];
    if (!code.includes("intercept(payload =>") || !code.includes('payload.type !== "' + recipe.event + '"')
        || !recipe.signatures.every(signature => code.includes(signature))) return;
    return { capability: "social-event", lines: ["  needs " + recipe.permission, '  on incoming ' + recipe.rule + ' ""'] };
}

function compileMobilePreviousEdit(file, plugin, source) {
    if (!/^ios\/runtime\/src\/core\/plugins\/(?:sedenhanced|messageburst)\/index\.ts$/.test(file)
        || !fieldsAre(plugin, ["manifest", "start", "stop", "SettingsComponent"])
        || !imported(source, "instead", "@lib/api/patcher")
        || !imported(source, "messageUtil", "@metro/common")) return;
    const start = handler(plugin, "start");
    if (!start || !ts.isBlock(start.body) || start.body.statements.length !== 1) return;
    const code = printed(start.body, source);
    if (!code.includes('unpatch = instead("sendMessage", messageUtil,') || !code.includes('findByProps("editMessage", "startEditMessage")')) return;
    let rule;
    if (code.includes("applySed(content.trim(), mine.content)") && code.includes("m.author?.id === me")) {
        rule = "correct-previous";
    } else if (code.includes("last.author?.id === me") && code.includes("last.content + (settings.get(\"useSpace\")")) {
        const settings = source.statements.filter(ts.isVariableStatement).flatMap(statement => [...statement.declarationList.declarations])
            .find(declaration => identifier(declaration.name) === "settings")?.initializer;
        if (!settings || !ts.isCallExpression(settings) || identifier(settings.expression) !== "pluginSettings") return;
        const defaults = settings.arguments[1];
        const seconds = literal(value(defaults, "seconds"));
        const space = value(defaults, "useSpace")?.kind;
        if (!seconds || !/^([1-9]|[12][0-9]|30)$/.test(seconds) || ![ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword].includes(space)) return;
        rule = "merge-previous " + seconds + (space === ts.SyntaxKind.TrueKeyword ? " space" : "");
    }
    if (rule) return { capability: "previous-edit", lines: ["  needs messages.editprevious", "  before send " + rule] };
}

function compileManagedStyle(plugin, source, entry, appearance, readStylesheet) {
    if (!readStylesheet || !fieldsAre(plugin, ["name", "description", "authors", "tags", "searchTerms", "start", "stop"])) return;
    const imports = new Map([
        ["@api/Styles", ["enableStyle", "disableStyle"]],
        ["@utils/constants", ["Devs", "SincordDevs"]],
    ]);
    let stylesheet, binding;
    for (const statement of source.statements) {
        if (statement === entry) continue;
        if (!ts.isImportDeclaration(statement) || !statement.importClause || statement.importClause.isTypeOnly) return;
        const specifier = literal(statement.moduleSpecifier);
        const { name, namedBindings } = statement.importClause;
        const allowed = imports.get(specifier);
        if (specifier === "@utils/types") {
            if (name?.text !== "definePlugin" || namedBindings) return;
        } else if (allowed) {
            if (name || !namedBindings || !ts.isNamedImports(namedBindings)
                || namedBindings.elements.some(item => item.propertyName || item.isTypeOnly || !allowed.includes(item.name.text))) return;
        } else {
            const match = /^\.\/([\w.-]+\.css)\?managed$/.exec(specifier ?? "");
            if (!match || stylesheet || !name || namedBindings) return;
            stylesheet = match[1];
            binding = name.text;
        }
    }
    if (!stylesheet) return;
    for (const [hook, action] of [["start", "enableStyle"], ["stop", "disableStyle"]]) {
        const method = handler(plugin, hook);
        if (!method || method.parameters.length || !imported(source, action, "@api/Styles")) return;
        let body = method.body;
        if (ts.isBlock(body)) {
            const statement = body.statements[0];
            if (body.statements.length !== 1 || !ts.isExpressionStatement(statement)) return;
            body = statement.expression;
        }
        if (!ts.isCallExpression(body) || body.questionDotToken || body.typeArguments?.length || identifier(body.expression) !== action
            || body.arguments.length !== 1 || identifier(body.arguments[0]) !== binding) return;
    }
    const targets = matchAppearanceStyles(readStylesheet(stylesheet), appearance);
    if (targets) return { capability: "appearance", lines: appearanceLines(targets) };
}

function inspectPlugin(file, code, platform, appearance = {}, nativeEffects = {}, readStylesheet) {
    if (platform === "betterdiscord") return inspectBetterDiscord(file, code, appearance);
    const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
    const entry = source.statements.find(ts.isExportAssignment);
    const call = entry && expression(entry.expression);
    const factory = call && ts.isCallExpression(call) && identifier(call.expression);
    if (!["definePlugin", "defineCorePlugin", "defineTweak"].includes(factory)) return;
    if (factory === "defineTweak") {
        const name = literal(call.arguments[0]);
        if (!name) return;
        const css = literal(call.arguments[2]);
        const targets = matchAppearanceStyles(css, appearance);
        const hideSystem = name === "HideSystemMessages" && css === '[class*="systemMessage"] { display: none !important; }';
        const supported = (targets || hideSystem) && platform === "desktop" && !entry.isExportEquals && !source.parseDiagnostics.length
            && safeText(name) && name.length <= 64
            && call.arguments.length >= 3 && call.arguments.length <= 4
            && literal(call.arguments[1]) !== undefined
            && (call.arguments.length === 3 || ts.isArrayLiteralExpression(call.arguments[3])
                && call.arguments[3].elements.every(element => literal(element) !== undefined))
            && source.statements.every(statement => statement === entry || ts.isImportDeclaration(statement)
                && statement.moduleSpecifier.text === "@utils/cloudcordTweak")
            && imported(source, "defineTweak", "@utils/cloudcordTweak");
        return {
            name, file, platform, ...inventory(source), flags: { commands: false, outgoing: false, settings: false, ui: true, styles: true },
            ...(supported ? {
                capability: hideSystem ? "incoming-filter" : "appearance",
                cx: ["plugin " + JSON.stringify(name) + ":", ...(hideSystem
                    ? ["  needs messages.filterlocal", '  on incoming hide-system "pins,joins,boosts"']
                    : appearanceLines(targets)), ""].join("\n"),
            } : {}),
        };
    }
    if (call.arguments.length !== 1) return;
    const plugin = expression(call.arguments[0]);
    const manifest = value(plugin, "manifest");
    const name = literal(value(plugin, "name")) ?? literal(value(value(manifest, "display"), "name"));
    if (!name) return;
    const flags = {
        commands: Boolean(property(plugin, "commands")) || /\bregisterCommand\s*\(/.test(code),
        outgoing: /\b(?:onBeforeMessage(?:Send|Edit)|addMessagePre(?:Send|Edit)Listener|on(?:Send|Edit)Message)\b/.test(code),
        settings: /\b(?:settings|SettingsComponent|definePluginSettings|pluginSettings)\b/.test(code),
        ui: /\b(?:contextMenus|chatBarButton|patches|renderMessage|onJsxCreate)\b/.test(code),
    };
    const dependencies = value(plugin, "dependencies");
    const originRewrite = platform === "desktop" && compileOriginRewrites(plugin, source);
    const importModules = new Map([
        ["@api/Commands", ["findOption", "RequiredMessageOption", "OptionalMessageOption"]],
        ["@utils/constants", ["Devs", "SincordDevs"]],
        ["@utils/types", ["definePlugin"]],
    ]);
    const allowedDeclarations = !entry.isExportEquals && source.statements.every(node => {
        if (node === entry || node === originRewrite?.declaration) return true;
        if (ts.isVariableStatement(node)) return node.declarationList.flags & ts.NodeFlags.Const
            && node.declarationList.declarations.every(declaration => identifier(declaration.name) && declaration.initializer
                && ts.isArrayLiteralExpression(declaration.initializer) && declaration.initializer.elements.every(item => literal(item) !== undefined));
        if (!ts.isImportDeclaration(node)) return false;
        const allowed = importModules.get(node.moduleSpecifier.text);
        const clause = node.importClause;
        if (!clause || !allowed || (clause.name && !allowed.includes(clause.name.text))) return false;
        const bindings = clause.namedBindings;
        return !bindings || ts.isNamedImports(bindings)
            && bindings.elements.every(binding => !binding.propertyName && allowed.includes(binding.name.text));
    });
    const simpleDependencies = !dependencies || ts.isArrayLiteralExpression(dependencies)
        && dependencies.elements.every(dependency => ["CommandsAPI", "MessageEventsAPI"].includes(literal(dependency)));
    const hasLicense = /SPDX-License-Identifier:\s*GPL-3\.0-or-later\b|GNU General Public License/.test(code);
    const supported = platform === "desktop" && factory === "definePlugin" && imported(source, "definePlugin", "@utils/types")
        && allowedDeclarations && simpleDependencies && !source.parseDiagnostics.length && hasLicense && safeText(name) && name.length <= 64;
    const managedStyle = platform === "desktop" && factory === "definePlugin" && !entry.isExportEquals
        && imported(source, "definePlugin", "@utils/types") && !source.parseDiagnostics.length && hasLicense
        && safeText(name) && name.length <= 64 && compileManagedStyle(plugin, source, entry, appearance, readStylesheet);
    const storeEffect = platform === "desktop" && factory === "definePlugin" && !entry.isExportEquals
        && imported(source, "definePlugin", "@utils/types") && !source.parseDiagnostics.length && hasLicense
        && compileDesktopEffect(name, plugin, source, entry, nativeEffects);
    const externalLookup = platform === "desktop" && compileExternalLookup(name, code);
    const compiled = platform === "mobile" && factory === "defineCorePlugin" && !source.parseDiagnostics.length
        ? compileMobileFilter(name, file, plugin, source) || compileMobileClientCommands(file, plugin, source)
            || compileMobileNativeEffect(file, plugin, source, nativeEffects) || compileMobilePreviousEdit(file, plugin, source)
            || compileMobileSocialEvents(file, plugin, source)
        : externalLookup || storeEffect || managedStyle || supported && (originRewrite || compileCommands(plugin, source) || compileOutgoing(plugin));
    return {
        name, file, platform, flags, ...inventory(source),
        ...(compiled ? { capability: compiled.capability, cx: ["plugin " + JSON.stringify(name) + ":", ...compiled.lines, ""].join("\n") } : {}),
    };
}

function entryFiles(folder) {
    if (!fs.existsSync(folder)) return [];
    return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
        const location = path.join(folder, entry.name);
        if (entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name)) return [location];
        if (!entry.isDirectory()) return [];
        return ["index.ts", "index.tsx"].map(name => path.join(location, name)).filter(file => fs.existsSync(file));
    });
}

function inspectCompanions(entry, code) {
    const directory = fs.realpathSync(path.dirname(entry));
    const pending = [[fs.realpathSync(entry), code]];
    const seen = new Set([pending[0][0]]);
    const hooks = new Set();
    const targets = new Set();
    const companions = [];
    function withinPlugin(file) {
        const local = path.relative(directory, file);
        return local !== ".." && !local.startsWith(".." + path.sep) && !path.isAbsolute(local);
    }
    for (const [file, text] of pending) {
        if (file.endsWith(".css")) {
            hooks.add("appearance");
            for (const [, property] of text.matchAll(/(?:\{|;)\s*([a-z-]+)\s*:/gi)) targets.add("css:" + property.toLowerCase());
            continue;
        }
        const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
        if (file !== pending[0][0]) {
            const found = inventory(source);
            for (const hook of found.hooks) hooks.add(hook);
            for (const target of found.targets) targets.add(target);
        }
        function visit(node) {
            ts.forEachChild(node, visit);
            let imported;
            if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) imported = literal(node.moduleSpecifier);
            if (ts.isExportDeclaration(node) && !node.isTypeOnly) imported = literal(node.moduleSpecifier);
            if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || identifier(node.expression) === "require"))
                imported = literal(node.arguments[0]);
            if (!imported?.startsWith("./") && !imported?.startsWith("../")) return;
            const base = path.resolve(path.dirname(file), imported.replace(/\.css\?managed$/, ".css"));
            if (!withinPlugin(base)) return;
            const resolved = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"]
                .map(suffix => base + suffix).find(candidate => /\.(?:[jt]sx?|css)$/.test(candidate) && fs.statSync(candidate, { throwIfNoEntry: false })?.isFile());
            if (!resolved) return;
            const real = fs.realpathSync(resolved);
            if (seen.has(real) || !withinPlugin(real)) return;
            seen.add(real);
            companions.push(real);
            pending.push([real, fs.readFileSync(real, "utf8")]);
        }
        visit(source);
    }
    return { companions, hooks, targets };
}

function betterDiscordFiles(folder) {
    return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
        const location = path.join(folder, entry.name);
        if (entry.isFile() && entry.name.endsWith(".plugin.js")) return [location];
        if (entry.isDirectory() && entry.name !== "node_modules" && !entry.name.startsWith(".")) return betterDiscordFiles(location);
        return [];
    });
}

function classifyPorts(records, existing, hasLegacyCounter) {
    const variants = new Map();
    for (const record of records) {
        const key = record.name.toLowerCase();
        const group = variants.get(key) ?? [];
        group.push(record);
        variants.set(key, group);
    }
    return records.map(entry => {
        const { cx, ...record } = entry;
        const key = record.name.toLowerCase();
        const group = variants.get(key);
        const already = existing.has(key) || hasLegacyCounter && record.file === "desktop/client/src/sincordplugins/ccpCharacterCounter/index.ts";
        const equivalent = cx && group.length > 1 && group.every(variant =>
            variant.cx === cx && (variant.platform !== "betterdiscord" || variant.review));
        const status = already ? "in-catalog"
            : !cx ? "needs-adapter"
                : record.platform === "betterdiscord" && !record.review ? "source-review"
                : equivalent ? group[0] === entry ? "ready" : "equivalent-source"
                    : record.platform === "mobile" && ["incoming-filter", "client-command", "native-effect", "previous-edit", "social-event"].includes(record.capability) ? "ready"
                        : group.some(variant => variant.platform === "mobile") ? "compare-mobile"
                            : group.length > 1 ? "compare-sources"
                                : "ready";
        return { ...record, status, ...(cx ? { cx } : {}) };
    });
}

function scan(sourceDir, { includeCompanions = false } = {}) {
    const { parseCx, cxAppearanceTargets, cxNativeEffects } = require("./sync-cx-catalog.cjs").loadCxRuntime();
    const existing = new Set(["character counter"]);
    const counter = parseCx(fs.readFileSync(path.join(root, "examples/cx/pilot/character-counter.cx"), "utf8"));
    const hasLegacyCounter = counter.commands.some(command => command.name === "ccp-count")
        && counter.commands.some(command => command.name === "ccp-inspect" && command.actions.some(action => action.kind === "copy-diagnostics"));
    for (const name of fs.readdirSync(catalogFolder).filter(name => name.endsWith(".cx"))) {
        const source = fs.readFileSync(path.join(catalogFolder, name), "utf8");
        const header = /^plugin ("(?:[^"\\]|\\.)*"):/m.exec(source);
        if (header) existing.add(JSON.parse(header[1]).toLowerCase());
    }
    const records = [];
    for (const [platform, folders] of [
        ["desktop", desktopGroups.map(group => "desktop/client/src/" + group)],
        ["mobile", ["ios/runtime/src/core/plugins"]],
    ]) {
        for (const folder of folders) for (const file of entryFiles(path.join(root, folder))) {
            const code = fs.readFileSync(file, "utf8");
            const record = inspectPlugin(path.relative(root, file).replaceAll("\\", "/"), code, platform, cxAppearanceTargets, cxNativeEffects, name => {
                const directory = fs.realpathSync(path.dirname(file));
                const stylesheet = path.join(directory, name);
                if (fs.lstatSync(stylesheet, { throwIfNoEntry: false })?.isFile()) return fs.readFileSync(stylesheet, "utf8");
            });
            if (!record) continue;
            if (includeCompanions && !record.cx && path.dirname(file) !== path.join(root, folder)) {
                const { companions, hooks, targets } = inspectCompanions(file, code);
                if (companions.length) {
                    record.companions = companions.map(source => path.relative(root, source).replaceAll("\\", "/")).sort();
                    record.hooks = [...new Set([...record.hooks, ...hooks])].sort();
                    record.targets = [...new Set([...record.targets, ...targets])].sort();
                }
            }
            records.push(record);
        }
    }
    if (sourceDir) for (const file of betterDiscordFiles(sourceDir)) {
        const record = inspectPlugin(path.relative(sourceDir, file).replaceAll("\\", "/"), fs.readFileSync(file, "utf8"), "betterdiscord", cxAppearanceTargets);
        if (record) records.push(record);
    }
    return classifyPorts(records, existing, hasLegacyCounter);
}

function buildPlan(records) {
    const groups = new Map();
    const adapters = new Map();
    const plugins = new Set();
    for (const { name, file, platform, hooks, targets, status, capability, companions } of records) {
        const normalized = name.toLowerCase();
        plugins.add(normalized);
        if (status === "in-catalog") continue;
        const key = hooks.join(" + ") || "unclassified";
        const group = groups.get(key) ?? new Map();
        const plugin = group.get(normalized) ?? { name, sources: [] };
        plugin.sources.push({ file, platform, status, ...(capability ? { capability } : {}), ...(companions ? { companions } : {}) });
        group.set(normalized, plugin);
        groups.set(key, group);
        for (const target of targets ?? []) {
            const queue = adapters.get(target) ?? new Map();
            const candidate = queue.get(normalized) ?? { name, platforms: new Set() };
            candidate.platforms.add(platform);
            queue.set(normalized, candidate);
            adapters.set(target, queue);
        }
    }
    return {
        sources: records.length,
        distinctPluginNames: plugins.size,
        adapterQueues: [...adapters].filter(([, plugins]) => plugins.size > 1)
            .map(([target, plugins]) => ({
                target, count: plugins.size,
                plugins: [...plugins.values()].map(({ name, platforms }) => ({ name, platforms: [...platforms].sort() })),
            })).sort((a, b) => b.count - a.count || a.target.localeCompare(b.target)),
        groups: [...groups].map(([hooks, plugins]) => ({
            hooks, count: plugins.size, plugins: [...plugins.values()],
        })).sort((a, b) => b.count - a.count || a.hooks.localeCompare(b.hooks)),
    };
}

function verifyPorts(files) {
    const { parseCx, activateCx } = require("./sync-cx-catalog.cjs").loadCxRuntime();
    for (const [file, source] of files) {
        try {
            const plugin = parseCx(source);
            if (plugin.kind !== "plugin") throw new Error("Expected a plugin");
            let registrations = 0;
            function register() {
                registrations++;
                return () => registrations--;
            }
            const host = {
                registerCommand: register,
                registerMessageTransform: register,
                registerMessageEditTransform: register,
                registerIncomingRules: register,
                registerNativeEffect: register,
                registerUploadAnonymiser: register,
                registerPreviousMessageRule: register,
                hideAppearanceTarget: register,
                styleAppearanceTarget: register,
            };
            const stop = activateCx(source, host, plugin.permissions);
            if (!registrations) throw new Error("No supported behavior registered");
            stop();
            if (registrations) throw new Error("Plugin did not remove its hooks");
        } catch (error) {
            throw new Error(file + ": " + error.message);
        }
    }
}

const usage = "Usage: node cx-bulk-plugins.cjs [--json | --plan | --out-dir <new-folder> | --add-ready] [--source-dir <BetterDiscord sources>]";

function portFiles(ports) {
    const files = new Map();
    for (const record of ports) {
        const name = record.name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + ".cx";
        if (!/^[a-z][a-z0-9-]*\.cx$/.test(name)) throw new Error("Invalid output name " + name);
        if (files.has(name)) {
            if (files.get(name) !== record.cx) throw new Error("Ambiguous output name " + name);
            continue;
        }
        files.set(name, record.cx);
    }
    return files;
}

function addReady(ports) {
    if (!ports.length) {
        console.log("No new CX ports are ready.");
        return;
    }
    const { buildCatalog, catalogPath } = require("./sync-cx-catalog.cjs");
    const files = portFiles(ports);
    verifyPorts(files);
    const catalog = buildCatalog(files);
    const created = [];
    const nextCatalog = catalogPath + "." + process.pid + ".tmp";
    function writeNew(file, source) {
        const fd = fs.openSync(file, "wx");
        created.push(file);
        try { fs.writeFileSync(fd, source); }
        finally { fs.closeSync(fd); }
    }
    try {
        for (const [name, source] of files) writeNew(path.join(catalogFolder, name), source);
        writeNew(nextCatalog, catalog.source);
        fs.renameSync(nextCatalog, catalogPath);
    } catch (error) {
        for (const file of created) fs.unlinkSync(file);
        throw error;
    }
    console.log("Added " + files.size + " CX ports. Catalog has " + catalog.plugins + "/600 plugins.");
}

function main(rawArgs) {
    const args = [...rawArgs];
    if (args.length === 1 && args[0] === "--help") {
        console.log(usage);
        console.log("Scan source patterns, export candidates for review, or add ready ports to the shared catalog.");
        return;
    }
    const sourceIndex = args.indexOf("--source-dir");
    const sourceDir = sourceIndex === -1 ? undefined : args.splice(sourceIndex, 2)[1];
    if (sourceIndex !== -1 && (!sourceDir || sourceDir.startsWith("--"))) throw new Error(usage);
    const output = args.length === 2 && args[0] === "--out-dir" ? path.resolve(args[1]) : undefined;
    if (!output && (args.length > 1 || args.length === 1 && !["--json", "--plan", "--add-ready"].includes(args[0])))
        throw new Error(usage);
    const records = scan(sourceDir && path.resolve(sourceDir), { includeCompanions: args.includes("--plan") || args.includes("--json") });
    if (args[0] === "--add-ready") {
        addReady(records.filter(record => record.status === "ready"));
        return;
    }
    if (output) {
        const ports = records.filter(record => record.cx && ["ready", "equivalent-source", "in-catalog", "source-review"].includes(record.status));
        const files = portFiles(ports);
        verifyPorts(files);
        fs.mkdirSync(output);
        for (const [name, source] of files) fs.writeFileSync(path.join(output, name), source, { flag: "wx" });
        fs.writeFileSync(path.join(output, "sources.json"), JSON.stringify(ports.map(({ name, file, platform, status, review }) => ({ name, file, platform, status, review })), null, 2) + "\n");
        console.log("Exported " + files.size + " validated CX ports to " + output);
    }
    if (args.includes("--json")) {
        process.stdout.write(JSON.stringify(records, null, 2) + "\n");
        return;
    }
    if (args.includes("--plan")) {
        process.stdout.write(JSON.stringify(buildPlan(records), null, 2) + "\n");
        return;
    }
    const counts = ["desktop", "mobile", "betterdiscord"].map(platform =>
        records.filter(record => record.platform === platform).length + " " + platform);
    console.log("Inspected " + counts.join(", ") + " plugin sources.");
    for (const status of ["ready", "equivalent-source", "source-review", "compare-mobile", "compare-sources", "in-catalog", "needs-adapter"]) {
        const matches = records.filter(record => record.status === status);
        console.log(status + ": " + matches.length + (matches.length && matches.length <= 20 ? " (" + matches.map(record => record.name).join(", ") + ")" : ""));
    }
    const unsupported = records.filter(record => record.status === "needs-adapter");
    console.log("Unsupported patterns (groups overlap): " + ["commands", "outgoing", "settings", "ui", "styles"]
        .map(key => key + "=" + unsupported.filter(record => record.flags[key]).length).join(", "));
}

if (require.main === module) {
    try { main(process.argv.slice(2)); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { buildPlan, classifyPorts, inspectPlugin, portFiles, scan, verifyPorts };
