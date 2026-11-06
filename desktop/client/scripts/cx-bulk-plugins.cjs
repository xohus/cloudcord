const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

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

function inventoryHooks(source) {
    const hooks = new Set();
    const visit = node => {
        if (ts.isIdentifier(node)) for (const [group, pattern] of Object.entries(hookGroups)) {
            if (pattern.test(node.text)) hooks.add(group);
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
    return [...hooks].sort();
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

function inspectBetterDiscord(file, code, appearance) {
    const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const header = /^\s*\/\*\*[\s\S]*?\*\//.exec(code)?.[0];
    const name = header?.match(/^\s*\*\s*@name\s+([^\r\n*]+?)\s*$/m)?.[1];
    if (!name || !safeText(name) || name.length > 64) return;
    const record = { name, file, platform: "betterdiscord", hooks: inventoryHooks(source), flags: {} };
    const license = /SPDX-License-Identifier:\s*(?:GPL-3\.0-or-later|MIT|BSD-3-Clause|Apache-2\.0)\b/.test(code);
    const plugin = source.statements.length === 1 && exportAssignment(source.statements[0]);
    if (!license || source.parseDiagnostics.length || !plugin || !ts.isClassExpression(plugin) || plugin.heritageClauses?.length
        || plugin.members.length !== 2 || plugin.modifiers?.length) return record;
    const methods = new Map(plugin.members.map(member => [identifier(member.name), member]));
    const added = methods.has("start") && styleCall(methods.get("start"), "addStyle", 2);
    const removed = methods.has("stop") && styleCall(methods.get("stop"), "removeStyle", 1);
    if (!added || !removed || !added[0] || added[0] !== removed[0]) return record;
    const targets = [];
    let css = added[1].trim();
    while (css) {
        const target = Object.entries(appearance).find(([key, rule]) => !targets.some(([used]) => used === key) && css.startsWith(rule.css));
        if (!target) return record;
        targets.push(target);
        css = css.slice(target[1].css.length).trimStart();
    }
    if (!targets.length) return record;
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
};

function compileMobileFilter(name, file, plugin, source) {
    if (!/^ios\/runtime\/src\/core\/plugins\/(?:noblockedmessages|clientsideblock|blockkeywords)\/index\.tsx?$/.test(file)
        || !Object.prototype.hasOwnProperty.call(mobileFilterRecipes, name)
        || !fieldsAre(plugin, ["manifest", "start", "stop", "SettingsComponent"])
        || !imported(source, "filterMessages", "../shared/messageFilter")) return;
    const start = handler(plugin, "start");
    const stop = handler(plugin, "stop");
    const recipe = mobileFilterRecipes[name];
    if (!start || !stop || printed(start.body, source).replace(/\s+/g, " ") !== recipe.start) return;
    return {
        capability: "incoming-filter",
        lines: ["  needs messages.filterlocal", "  on incoming " + recipe.rule + " " + JSON.stringify(recipe.value)],
    };
}

function compileMobileClientCommands(file, plugin, source) {
    if (!/^ios\/runtime\/src\/core\/plugins\/(?:inrole|readallnotifications|spotifysharecommands)\/index\.ts$/.test(file)
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
        }
    }
    if (lines) return { capability: "client-command", lines: ["  needs commands.register", ...permissions.map(permission => "  needs " + permission), ...lines] };
}

function compileMobileNativeEffect(file, plugin, source, nativeEffects) {
    if (!file.startsWith("ios/runtime/src/core/plugins/") || !fieldsAre(plugin, ["manifest", "start", "stop"])) return;
    const start = handler(plugin, "start");
    const stop = handler(plugin, "stop");
    if (!start || !stop || !ts.isBlock(start.body)) return;
    const code = printed(start.body, source).replace(/\s+/g, " ");
    let effect;
    if (imported(source, "instead", "@lib/api/patcher")) {
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

function inspectPlugin(file, code, platform, appearance = {}, nativeEffects = {}) {
    if (platform === "betterdiscord") return inspectBetterDiscord(file, code, appearance);
    const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
    const entry = source.statements.find(ts.isExportAssignment);
    const call = entry && expression(entry.expression);
    const factory = call && ts.isCallExpression(call) && identifier(call.expression);
    if (!["definePlugin", "defineCorePlugin", "defineTweak"].includes(factory)) return;
    if (factory === "defineTweak") {
        const name = literal(call.arguments[0]);
        if (!name) return;
        const registered = Object.entries(appearance).find(([, target]) => target.plugin === name && target.css === literal(call.arguments[2]));
        const supported = registered && platform === "desktop" && !entry.isExportEquals && !source.parseDiagnostics.length
            && call.arguments.length >= 3 && call.arguments.length <= 4
            && source.statements.every(statement => statement === entry || ts.isImportDeclaration(statement)
                && statement.moduleSpecifier.text === "@utils/cloudcordTweak")
            && imported(source, "defineTweak", "@utils/cloudcordTweak");
        return {
            name, file, platform, hooks: ["appearance"], flags: { commands: false, outgoing: false, settings: false, ui: true, styles: true },
            ...(supported ? {
                capability: "appearance",
                cx: ["plugin " + JSON.stringify(name) + ":", ...appearanceLines([registered]), ""].join("\n"),
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
    const importModules = new Map([
        ["@api/Commands", ["findOption", "RequiredMessageOption", "OptionalMessageOption"]],
        ["@utils/constants", ["Devs", "SincordDevs"]],
        ["@utils/types", ["definePlugin"]],
    ]);
    const allowedDeclarations = !entry.isExportEquals && source.statements.every(node => {
        if (node === entry) return true;
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
    const compiled = platform === "mobile" && factory === "defineCorePlugin" && !source.parseDiagnostics.length
        ? compileMobileFilter(name, file, plugin, source) || compileMobileClientCommands(file, plugin, source)
            || compileMobileNativeEffect(file, plugin, source, nativeEffects)
        : supported && (compileCommands(plugin, source) || compileOutgoing(plugin));
    return {
        name, file, platform, flags, hooks: inventoryHooks(source),
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

function betterDiscordFiles(folder) {
    return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
        const location = path.join(folder, entry.name);
        if (entry.isFile() && entry.name.endsWith(".plugin.js")) return [location];
        if (entry.isDirectory() && entry.name !== "node_modules" && !entry.name.startsWith(".")) return betterDiscordFiles(location);
        return [];
    });
}

function scan(sourceDir) {
    const { cxAppearanceTargets, cxNativeEffects } = require("./sync-cx-catalog.cjs").loadCxRuntime();
    const existing = new Set(["character counter"]);
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
            const record = inspectPlugin(path.relative(root, file).replaceAll("\\", "/"), fs.readFileSync(file, "utf8"), platform, cxAppearanceTargets, cxNativeEffects);
            if (record) records.push(record);
        }
    }
    if (sourceDir) for (const file of betterDiscordFiles(sourceDir)) {
        const record = inspectPlugin(path.relative(sourceDir, file).replaceAll("\\", "/"), fs.readFileSync(file, "utf8"), "betterdiscord", cxAppearanceTargets);
        if (record) records.push(record);
    }
    const variants = new Map();
    for (const record of records) {
        const key = record.name.toLowerCase();
        const group = variants.get(key) ?? [];
        group.push(record);
        variants.set(key, group);
    }
    return records.map(({ cx, ...record }) => {
        const key = record.name.toLowerCase();
        const already = existing.has(key);
        const status = already ? "in-catalog"
            : !cx ? "needs-adapter"
                : record.platform === "mobile" && ["incoming-filter", "client-command", "native-effect"].includes(record.capability) ? "ready"
                    : variants.get(key).some(variant => variant.platform === "mobile") ? "compare-mobile"
                    : variants.get(key).length > 1 ? "compare-sources"
                        : "ready";
        return { ...record, status, ...(cx ? { cx } : {}) };
    });
}

function buildPlan(records) {
    const groups = new Map();
    const plugins = new Set();
    for (const { name, file, platform, hooks, status, capability } of records) {
        const normalized = name.toLowerCase();
        plugins.add(normalized);
        if (status === "in-catalog") continue;
        const key = hooks.join(" + ") || "unclassified";
        const group = groups.get(key) ?? new Map();
        const plugin = group.get(normalized) ?? { name, sources: [] };
        plugin.sources.push({ file, platform, status, ...(capability ? { capability } : {}) });
        group.set(normalized, plugin);
        groups.set(key, group);
    }
    return {
        sources: records.length,
        distinctPluginNames: plugins.size,
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
        const name = record.name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase() + ".cx";
        if (!/^[a-z][a-z0-9-]*\.cx$/.test(name) || files.has(name)) throw new Error("Ambiguous output name " + name);
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
    if (sourceDir && args[0] === "--add-ready") throw new Error("Export BetterDiscord candidates for source and license review first");
    const records = scan(sourceDir && path.resolve(sourceDir));
    if (args[0] === "--add-ready") {
        addReady(records.filter(record => record.status === "ready"));
        return;
    }
    if (output) {
        const ports = records.filter(record => record.cx && ["ready", "in-catalog"].includes(record.status));
        const files = portFiles(ports);
        verifyPorts(files);
        fs.mkdirSync(output);
        for (const [name, source] of files) fs.writeFileSync(path.join(output, name), source, { flag: "wx" });
        fs.writeFileSync(path.join(output, "sources.json"), JSON.stringify(ports.map(({ name, file, platform, status }) => ({ name, file, platform, status })), null, 2) + "\n");
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
    for (const status of ["ready", "compare-mobile", "compare-sources", "in-catalog", "needs-adapter"]) {
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
module.exports = { buildPlan, inspectPlugin, scan, verifyPorts };
