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

// Shared hook names identify where a plugin runs. Group by the operation it
// performs as well so a new host capability can serve several plugins.
const operationGroups = {
    clipboard: /^(?:copyToClipboard|setClipboardString)$/,
    "open-link": /^(?:openExternal|openURL|openLink)$/,
    "message-send": /^(?:sendMessage|_sendMessage)$/,
    "message-edit": /^(?:editMessage|startEditMessage)$/,
    "message-delete": /^(?:deleteMessage|deleteMessages|bulkDeleteMessages)$/,
    "message-reaction": /^(?:addReaction|removeReaction)$/,
    "channel-navigation": /^(?:selectChannel|selectPrivateChannel|transitionToChannel)$/,
    "voice-navigation": /^(?:selectVoiceChannel|disconnectFromVoiceChannel)$/,
    notification: /^(?:showToast|showNotification|createToast)$/,
    modal: /^(?:openModal|openModalLazy|showConfirmationModal|showAlert)$/,
    persistence: /^(?:loadData|saveData|deleteData)$/,
};
const operationNames = Object.entries(operationGroups);
const namedMenuHooks = {
    onMessageContextMenu: "message",
    onUserContextMenu: "user-context",
    onGuildContextMenu: "guild-context",
    onChannelContextMenu: "channel-context",
};

function operationForCall(callee, receiver) {
    if (!callee) return;
    if (/^(?:copy|writeText|setString)$/.test(callee) && /^(?:Clipboard|clipboard|NativeClipboard)$/.test(receiver)) return "clipboard";
    if (/^(?:load|save|delete)$/.test(callee) && /^(?:Data|DataUtils|DataStore)$/.test(receiver)) return "persistence";
    return operationNames.find(([, pattern]) => pattern.test(callee))?.[0];
}

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

function inventoryStyles(stylesheet, targets, standalone = false) {
    for (const [, property] of stylesheet.matchAll(/(?:\{|;)\s*([a-z-]+)\s*:/gi)) targets.add("css:" + property.toLowerCase());
    if (!standalone) return;
    // Keep grouping conservative. At-rules and nested selectors need their own recipe.
    const rules = [...stylesheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    if (rules.map(rule => rule[0]).join("").trim() !== stylesheet.trim()) return;
    for (const [, selector, declarations] of rules) {
        const scope = selector.trim().replace(/\s*,\s*/g, ",").replace(/\s+/g, " ");
        if (!scope || scope.length > 160 || /[@/*]/.test(scope.replace(/\*=/g, ""))) continue;
        const properties = [...new Set([...declarations.matchAll(/(?:^|;)\s*([a-z-]+)\s*:/gi)]
            .map(([, property]) => property.toLowerCase()))].sort();
        targets.add("selector:" + scope);
        if (properties.length) targets.add("style:" + scope + " → " + properties.join(", "));
    }
}

function inventory(source) {
    const hooks = new Set();
    const targets = new Set();
    const operations = new Set();
    const behaviors = new Set();
    const importedNames = new Map();
    for (const statement of source.statements) {
        if (!ts.isImportDeclaration(statement)) continue;
        const bindings = statement.importClause?.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) {
            for (const binding of bindings.elements) {
                if (binding.propertyName) importedNames.set(binding.name.text, binding.propertyName.text);
            }
        }
    }
    const event = /^(?:MESSAGE|VOICE|CHANNEL|GUILD|RELATIONSHIP|PRESENCE|TYPING|USER_PROFILE)_[A-Z][A-Z0-9_]*$/;
    const menuId = /^[a-z][a-z0-9-]{2,63}$/;
    const namedTarget = /^[A-Z][\w$]{2,79}$/;
    const visit = node => {
        if (ts.isIdentifier(node)) {
            for (const [group, pattern] of Object.entries(hookGroups)) if (pattern.test(node.text)) hooks.add(group);
            if (event.test(node.text) && (ts.isMethodDeclaration(node.parent) || ts.isPropertyAssignment(node.parent)))
                targets.add("event:" + node.text);
            if (/^[A-Z][a-zA-Z0-9]+Store$/.test(node.text)) targets.add("store:" + node.text);
        }
        if (ts.isStringLiteralLike(node) && event.test(node.text)) {
            const parent = node.parent;
            const call = ts.isCallExpression(parent) && (ts.isPropertyAccessExpression(parent.expression)
                ? parent.expression.name.text : identifier(parent.expression));
            const isActionType = ts.isPropertyAssignment(parent) && identifier(parent.name) === "type";
            const compared = ts.isBinaryExpression(parent) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(parent.operatorToken.kind)
                && (parent.left === node ? parent.right : parent.right === node ? parent.left : undefined);
            const comparesType = compared && ts.isPropertyAccessExpression(compared) && compared.name.text === "type";
            if (isActionType || comparesType || /^(?:subscribe|unsubscribe|subscribeToDispatch|waitFor|dispatch)$/.test(call || "") || ts.isCaseClause(parent))
                targets.add("event:" + node.text);
        }
        if (ts.isObjectLiteralExpression(node)) {
            if (property(node, "replacement")) {
                const find = literal(value(node, "find"));
                if (safeText(find) && find.length >= 5 && find.length <= 96) targets.add("patch:" + find);
            }
            const menus = value(node, "contextMenus");
            if (menus && ts.isObjectLiteralExpression(menus)) {
                for (const { name } of menus.properties) {
                    const key = identifier(name) ?? literal(name);
                    if (menuId.test(key ?? "")) targets.add("menu:" + key);
                }
            }
            const parent = node.parent;
            const patchTable = ts.isBinaryExpression(parent) && parent.right === node
                && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(parent.left)
                && parent.left.name.text === "modulePatches" && parent.left.expression.kind === ts.SyntaxKind.ThisKeyword;
            if (patchTable) {
                for (const phase of ["before", "after", "instead"]) {
                    const list = value(node, phase);
                    if (!list || !ts.isArrayLiteralExpression(list)) continue;
                    for (const entry of list.elements) {
                        const name = literal(entry);
                        if (namedTarget.test(name ?? "")) targets.add("component:" + name);
                    }
                }
            }
        }
        if (ts.isCallExpression(node)) {
            const access = ts.isPropertyAccessExpression(node.expression) ? node.expression : undefined;
            const callee = access?.name.text ?? identifier(node.expression);
            const receiver = access && (ts.isPropertyAccessExpression(access.expression) ? access.expression.name.text : identifier(access.expression));
            const first = literal(node.arguments[0]);
            const operation = operationForCall(importedNames.get(callee) ?? callee, importedNames.get(receiver) ?? receiver);
            if (operation) {
                operations.add(operation);
                const context = operationContext(node, importedNames);
                if (context) behaviors.add(context + " → " + operation);
            }
            if (/^(?:findByProps(?:Lazy)?|getByKeys)$/.test(callee ?? "") || callee === "byKeys" && receiver === "Filters") {
                for (const argument of node.arguments) {
                    const key = literal(argument);
                    if (key && /^[a-zA-Z_$][\w$]{2,79}$/.test(key)) targets.add("module:" + key);
                }
            } else if (/^(?:find(?:By)?Store(?:Name)?(?:Lazy)?|getStore)$/.test(callee ?? "") && first && /^[A-Z]\w+Store$/.test(first)) {
                targets.add("store:" + first);
            } else if (callee === "findByFilePath" && first && /^(?:modules|design)\/[\w./-]+\.tsx?$/.test(first)) {
                targets.add("native:" + first);
                const name = first.slice(first.lastIndexOf("/") + 1).replace(/\.tsx?$/, "");
                if (namedTarget.test(name)) targets.add("component:" + name);
            } else if (callee === "onJsxCreate" && first && namedTarget.test(first)) {
                targets.add("component:" + first);
            } else if ((/^(?:addContextMenuPatch|patchContextMenu)$/.test(callee ?? "") || callee === "patch" && receiver === "ContextMenu")
                && first && menuId.test(first)) {
                targets.add("menu:" + first);
                hooks.add("context-menu");
            } else if (/^(?:after|before|instead)$/.test(callee ?? "") && receiver === "Patcher") {
                const method = literal(node.arguments.at(-2));
                const owner = identifier(node.arguments.at(-3));
                if (owner && /^[A-Z]\w+Store$/.test(owner) && /^[a-z]\w{2,79}$/.test(method ?? "")) {
                    targets.add("method:" + owner + "." + method);
                }
            } else if (callee === "addStyle" && receiver === "DOM") {
                const css = literal(node.arguments[1]);
                if (css) inventoryStyles(css, targets, true);
            } else if (callee === "defineTweak") {
                const css = literal(node.arguments[2]) ?? "";
                inventoryStyles(css, targets, true);
                if (/\{\s*display\s*:\s*none\s*!important\s*;?\s*\}\s*$/i.test(css)
                    && css.indexOf("{") === css.lastIndexOf("{")) targets.add("recipe:hide-component");
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
    return {
        hooks: [...hooks].sort(), targets: [...targets].sort(),
        ...(operations.size && { operations: [...operations].sort() }),
        ...(behaviors.size && { behaviors: [...behaviors].sort() }),
    };
}

// Only associate an action with a concrete callback or hook that encloses
// it. Plugin-wide operation counts also include unrelated setup and settings.
function operationContext(node, importedNames) {
    for (let child = node, parent = node.parent; parent; child = parent, parent = parent.parent) {
        if (ts.isPropertyAssignment(parent) || ts.isMethodDeclaration(parent)) {
            const name = identifier(parent.name) ?? literal(parent.name);
            if (Object.hasOwn(namedMenuHooks, name)) return "menu:" + namedMenuHooks[name];
            if (/^(?:onBeforeMessageSend|onBeforeMessageEdit|onSendMessage|onEditMessage)$/.test(name ?? ""))
                return /Edit/.test(name) ? "message-edit" : "message-send";
            if (/^(?:MESSAGE|VOICE|CHANNEL|GUILD|RELATIONSHIP|PRESENCE|TYPING|USER_PROFILE)_[A-Z][A-Z0-9_]*$/.test(name ?? ""))
                return "event:" + name;
            if (name === "execute" && ts.isObjectLiteralExpression(parent.parent)
                && property(parent.parent, "name") && ts.isArrayLiteralExpression(parent.parent.parent)
                && identifier(parent.parent.parent.parent.name) === "commands") return "command";
            if (ts.isObjectLiteralExpression(parent.parent)
                && identifier(parent.parent.parent.name) === "contextMenus"
                && /^[a-z][a-z0-9-]{2,63}$/.test(name ?? "")) return "menu:" + name;
        }
        if (!ts.isCallExpression(parent) || !ts.isFunctionExpression(child) && !ts.isArrowFunction(child)
            || !parent.arguments.includes(child)) continue;
        const access = ts.isPropertyAccessExpression(parent.expression) ? parent.expression : undefined;
        const callee = access?.name.text ?? identifier(parent.expression);
        const receiver = access && (ts.isPropertyAccessExpression(access.expression) ? access.expression.name.text : identifier(access.expression));
        const method = importedNames.get(callee) ?? callee;
        const scope = literal(parent.arguments[0]);
        if (!scope) continue;
        if (/^(?:addContextMenuPatch|patchContextMenu)$/.test(method ?? "")
            || method === "patch" && (importedNames.get(receiver) ?? receiver) === "ContextMenu")
            return /^[a-z][a-z0-9-]{2,63}$/.test(scope) ? "menu:" + scope : undefined;
        if (/^(?:subscribe|subscribeToDispatch)$/.test(method ?? "") && /^[A-Z][A-Z0-9_]+$/.test(scope))
            return "event:" + scope;
    }
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

function configurableHides(options, mapping, appearance) {
    const lines = ["  needs appearance.hide"];
    for (const [setting, targets] of Object.entries(mapping)) {
        const enabled = options.get(setting);
        if (typeof enabled !== "boolean") return;
        for (const target of Array.isArray(targets) ? targets : [targets]) {
            if (!appearance[target] || !("mobile" in appearance[target])) return;
            lines.push("  option hide " + target + (enabled ? " default-on" : ""));
        }
    }
    return { capability: "configurable-appearance", lines };
}

function topLevelVariable(source, name) {
    return source.statements.filter(ts.isVariableStatement).flatMap(statement => [...statement.declarationList.declarations])
        .find(declaration => identifier(declaration.name) === name)?.initializer;
}

function readBetterDiscordSwitches(source) {
    const categories = value(topLevelVariable(source, "config"), "defaultConfig");
    const options = new Map();
    if (!categories || !ts.isArrayLiteralExpression(categories)) return options;
    for (const category of categories.elements) {
        const settings = value(category, "settings");
        if (!settings || !ts.isArrayLiteralExpression(settings)) continue;
        for (const setting of settings.elements) {
            const id = literal(value(setting, "id"));
            if (!id || literal(value(setting, "type")) !== "switch") continue;
            const defaultValue = value(setting, "defaultValue");
            if (options.has(id) || defaultValue && ![ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword].includes(defaultValue.kind)) {
                options.set(id, undefined);
            } else options.set(id, defaultValue?.kind === ts.SyntaxKind.TrueKeyword);
        }
    }
    return options;
}

const chatButtonOptions = {
    attachButton: "chat-upload-button", giftButton: "chat-gift-button", gifButton: "chat-gif-picker",
    stickerButton: "chat-sticker-picker", emojiButton: "chat-emoji-button", appLauncherButton: "chat-apps-button",
    discordShopTab: "shop-entry", threadsButton: "channel-threads-button", avatarDecoration: "avatar-decorations",
    hideBadges: "profile-badges", profileEffects: "profile-effects",
};

function compileDeclutter(source, appearance) {
    const digest = createHash("sha256").update(source.text.replaceAll("\r\n", "\n"), "utf8").digest("hex");
    if (digest !== "3d99e7aacc38ce6f337be03b58b7c692058a12298a0ec670e1b90110259c7469") return;
    const declaration = topLevelVariable(source, "settings");
    const table = declaration && ts.isCallExpression(declaration) && declaration.arguments[0];
    if (!table || !ts.isObjectLiteralExpression(table)) return;
    const options = new Map();
    for (const setting of table.properties) {
        if (!ts.isPropertyAssignment(setting)) continue;
        const type = value(setting.initializer, "type");
        const enabled = value(setting.initializer, "default");
        if (type && printed(type, source) === "OptionType.BOOLEAN" && enabled
            && [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword].includes(enabled.kind)) {
            options.set(identifier(setting.name), enabled.kind === ts.SyntaxKind.TrueKeyword);
        }
    }
    return configurableHides(options, {
        removeAvatarDecoration: "avatar-decorations", removeNameplate: "nameplates", removeProfileEffect: "profile-effects",
        removeClanTag: "server-tags", removeShopAboveDms: ["shop-entry", "nitro-entry"], removeQuestsAboveDms: "quests-entry",
        removeServerBoostInfo: "server-boost-progress", removeGiftButton: "chat-gift-button",
    }, appearance);
}

function normalizeAppearanceStyles(stylesheet) {
    const result = transformSync(stylesheet, { loader: "css", minifyWhitespace: true, legalComments: "none", logLevel: "silent" });
    if (!result.warnings.length) return result.code.trim();
}

function hideSelectors(stylesheet) {
    const selectors = new Set();
    for (const [, list] of stylesheet.matchAll(/([^{}]+)\{display:none!important\}/g)) {
        // Limit this form to simple selector lists. Commas in quoted attribute
        // values are part of the selector, and nested CSS uses the exact matcher.
        const items = list.match(/(?:"[^"\\]*"|'[^'\\]*'|[^"'\\,()])+|,/g) ?? [];
        if (items.join("") !== list) return;
        for (const selector of items.filter(item => item !== ",")) {
            if (selector.startsWith("@")) return;
            selectors.add(selector);
        }
    }
    if (!selectors.size || stylesheet.replace(/[^{}]+\{display:none!important\}/g, "")) return;
    return selectors;
}

const appearanceMatchers = new WeakMap();
function matchAppearanceStyles(stylesheet, appearance) {
    if (!stylesheet) return;
    let rules = appearanceMatchers.get(appearance);
    if (!rules) {
        rules = Object.entries(appearance).map(target => {
            const css = normalizeAppearanceStyles(target[1].css);
            return { target, css, hides: css && "mobile" in target[1] && hideSelectors(css) };
        }).filter(rule => rule.css).sort((a, b) => b.css.length - a.css.length);
        appearanceMatchers.set(appearance, rules);
    }
    const targets = [];
    let css;
    try { css = normalizeAppearanceStyles(stylesheet); }
    catch { return; }
    const original = css;
    while (css) {
        const rule = rules.find(rule => css.startsWith(rule.css));
        if (!rule || targets.includes(rule.target)) break;
        targets.push(rule.target);
        css = css.slice(rule.css.length);
    }
    if (!css && targets.length) return targets;

    const remaining = original && hideSelectors(original);
    if (!remaining) return;
    // Require every selector in the original stylesheet to be covered by a
    // complete portable target. Incomplete mappings could hide extra controls.
    const portable = rules.filter(rule => rule.hides && [...rule.hides].every(selector => remaining.has(selector)))
        .sort((a, b) => b.hides.size - a.hides.size);
    const matched = [];
    for (const rule of portable) {
        if (![...rule.hides].some(selector => remaining.has(selector))) continue;
        matched.push(rule.target);
        for (const selector of rule.hides) remaining.delete(selector);
    }
    if (!remaining.size) return matched;
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

function inspectBetterDiscord(file, code, appearance, nativeEffects) {
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
    const record = { name, file, platform: "betterdiscord", ...inventoryResult, hooks: [...hooks].sort(), flags: {
        commands: hooks.has("commands"), outgoing: hooks.has("outgoing-message"), settings: hooks.has("settings"),
        ui: hooks.has("component-render"), styles: hooks.has("appearance"),
    } };
    const rawSha256 = createHash("sha256").update(code, "utf8").digest("hex");
    const sha256 = reviewedBetterDiscordSources[rawSha256] ? rawSha256
        : createHash("sha256").update(code.replaceAll("\r\n", "\n"), "utf8").digest("hex");
    const review = reviewedBetterDiscordSources[sha256];
    if (review?.name === name && review.recipe === "native-effect" && !source.parseDiagnostics.length
        && nativeEffects && Object.hasOwn(nativeEffects, review.effect)) {
        return { ...record, review: { ...review, sha256 }, capability: "native-effect",
            cx: ["plugin " + JSON.stringify(name) + ":", "  needs " + nativeEffects[review.effect].permission,
                "  use " + review.effect, ""].join("\n") };
    }
    if (review?.name === name && review.recipe === "send-confirmation" && !source.parseDiagnostics.length) {
        const keyword = 'lipton green tea citrus';
        return { ...record, review: { ...review, sha256 }, capability: "send-confirmation",
            cx: ["plugin " + JSON.stringify(name) + ":", "  needs messages.confirmsend",
                "  before send confirm-keywords " + JSON.stringify([keyword]), ""].join("\n") };
    }
    if (review?.name === name && review.recipe === "formatted-upload-names" && !source.parseDiagnostics.length) {
        const defaults = source.statements.filter(ts.isVariableStatement).flatMap(statement => [...statement.declarationList.declarations])
            .find(declaration => identifier(declaration.name) === "defaultSettings")?.initializer;
        const length = value(defaults, "randomLength");
        if (length && ts.isNumericLiteral(length) && literal(value(defaults, "customFormat")) === "{prefix}{random}{suffix}"
            && literal(value(defaults, "prefix")) === "" && literal(value(defaults, "suffix")) === "") {
            return { ...record, review: { ...review, sha256 }, capability: "upload-naming",
                cx: ["plugin " + JSON.stringify(name) + ":", "  needs uploads.rename",
                    '  before upload anonymise format "{random}" random ' + length.text + " manual", ""].join("\n") };
        }
    }
    if (review?.name === name && review.recipe === "configurable-appearance" && !source.parseDiagnostics.length) {
        const compiled = configurableHides(readBetterDiscordSwitches(source), chatButtonOptions, appearance);
        if (compiled) return { ...record, review: { ...review, sha256 }, capability: compiled.capability,
            cx: ["plugin " + JSON.stringify(name) + ":", ...compiled.lines, ""].join("\n") };
    }
    if (review?.name === name && review.recipe === "link-rewrites" && !source.parseDiagnostics.length) {
        const domains = {
            reddit: ["reddit.com", "www.reddit.com", "old.reddit.com"],
            x: ["x.com", "www.x.com"],
            instagram: ["instagram.com", "www.instagram.com"],
            tiktok: ["tiktok.com", "www.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"],
            youtube: ["youtube.com", "www.youtube.com", "m.youtube.com"],
            bluesky: ["bsky.app", "www.bsky.app"],
        };
        const defaults = source.statements.filter(ts.isVariableStatement).flatMap(statement => [...statement.declarationList.declarations])
            .find(declaration => identifier(declaration.name) === "defaultLinks")?.initializer;
        if (defaults && ts.isArrayLiteralExpression(defaults) && defaults.elements.length === Object.keys(domains).length) {
            const lines = ["  needs messages.transform", "  needs messages.redirectlinks", "  needs profile.redirectlinks"];
            const seen = new Set();
            for (const link of defaults.elements) {
                const site = literal(value(link, "type"));
                const choices = value(link, "replacements");
                const selected = value(link, "selected");
                if (!site || !Object.hasOwn(domains, site) || seen.has(site) || value(link, "enabled")?.kind !== ts.SyntaxKind.TrueKeyword
                    || !selected || !ts.isNumericLiteral(selected) || !choices || !ts.isArrayLiteralExpression(choices)) return record;
                const destination = literal(choices.elements[Number(selected.text)]);
                if (!destination) return record;
                seen.add(site);
                for (const host of domains[site]) for (const stage of ["send", "profile"]) {
                    lines.push("  before " + stage + " rewrite-link " + JSON.stringify("https://" + host) + " with " + JSON.stringify(destination));
                }
            }
            return { ...record, review: { ...review, sha256 }, capability: "link-rewrites",
                cx: ["plugin " + JSON.stringify(name) + ":", ...lines, ""].join("\n") };
        }
    }
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
    HideSuggestedChannels: {
        effect: "hide-suggested-channels",
        sha256: "02d100733b625a762be9ad3f9f21877b27b05af04754b66fad8c022c838cf240",
    },
    ProfileMedia: {
        effect: "profile-media",
        sha256: "e7d4f049a5df80e8ad9020ebbc2c818b356b457b6884da7714fb0c827fedef2c",
    },
    UnsuppressEmbeds: {
        effect: "toggle-message-embeds",
        sha256: "a2816f32c9a24dba6f7956d9fc0811498c537135d1bc3b232e9e0488b00e40cf",
    },
    CopyFileContents: {
        effect: "copy-text-attachment",
        sha256: "76daa16788ce3255c1ad31cabf1004017f40969184d2dc0edd08b4b3a37a3d63",
    },
    RepeatMessages: {
        effect: "repeat-message",
        sha256: "42d9986d5315e3ce6de28b9f90b546902390a22adbef86a99d1513699b9abdd7",
    },
    QuickMention: {
        effect: "quick-mention",
        sha256: "d56d94f08626f2d4bddebd4917650217be0a3e862a53a2d053444b31d28fc59b",
    },
    NoRoleHeaders: {
        effect: "hide-role-headers",
        sha256: "04c990206c32b0d8f0d26cb4fb4fad35c725378eb0ad7fe957de718e6eacc3dc",
    },
    VoiceCount: {
        effect: "voice-channel-count",
        sha256: "46ae196b944c85a8a2be4931515f3914f16bd8ef700a870b1ede8443fd58bc2d",
    },
    WebcamStartNotifier: {
        effect: "webcam-start-notifier",
        sha256: "c595990e071fb99db1102d865f9ce6a3a754dc51c7c36fa327742fee8b092605",
    },
    WaitForSlot: {
        effect: "wait-for-slot",
        sha256: "9d4bc6294f5956e060be4521ac236da2a5a0ef9193a1d3cda4d0fbb82494d0f2",
    },
    ReverseImageSearch: {
        effect: "reverse-image-search",
        sha256: "6979d409985889a1611626ef504379e5db9841deea9f1471a128e85a12092a57",
    },
    JumpTo: {
        effect: "jump-to-message-menu",
        sha256: "50002ef6e62591654d9fca64bf4c61c7a99a8fb76e7b82a3b202dfce8c625d5a",
    },
    SortReactions: {
        effect: "sort-reactions-by-count",
        sha256: "65a6bc1b83fcaf80b335a3eb397e7e7f0fcac51fe5d35793c2474aa2e7628bdb",
    },
    NoUnblockToJump: {
        effect: "jump-without-unblocking",
        find: "#{intl::UNIGNORE_TO_JUMP_BODY}",
        match: String.raw`/if\(\i\.\i\.isBlockedForMessage\(/`,
        replace: "return true;$&",
    },
    JumpToTop: {
        effect: "jump-to-first-message",
        sha256: "1efa186c89308932bfcc2ff26835e79394b2a0223d9857a10c5d8b10fba7b85f",
    },
    ReadAllNotificationsButton: {
        effect: "read-all-servers-button",
        sha256: "56111e1ef872ddcfc4e0b76d3bbe84353d60569d3c990ee041dd197f2031b7fa",
    },
    CleanChannelName: {
        effect: "clean-channel-names",
        sha256: "aa0230019c4dd15b9ebe92af4f0e841ff627b00761855ff424e527df9e5ed236",
    },
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
    FixCodeblockGap: {
        effect: "code-block-gap",
        sha256: "8ba09f634b2778cb288bd1dfc93f02294b8d07bc387c30202bff6c3dffe35733",
    },
    NoMosaic: {
        effect: "flat-attachments",
        sha256: "a28bf52feb55f75f2404b22e42805d1197496153a3cc31796f16c7a6fc0b2a21",
    },
    NoServerEmojis: {
        effect: "unicode-emoji-autocomplete",
        sha256: "1e653c4d075137386316ad1f31ebbf68d0f624166394004d0bea2e20f9f294e1",
    },
    CopyEmojiMarkdown: {
        effect: "copy-emoji-markdown",
        sha256: "552b642b5d3cdc4efeb54e199ec972bf14f4d2431dc52bf25f2c9f420b64ee29",
    },
    CopyStickerLinks: {
        effect: "sticker-links",
        sha256: "65ebb054311ec45e644b5aaf74e6b6865b9da9dd980fecc48bebaa5367eda1e9",
    },
    CopyMediaLink: {
        effect: "copy-media-link",
        sha256: "6c75dd1b89f926cdae07ce2d0ddb0874bf163b0543182cdc198fb8cd11562d17",
    },
    FixImagesQuality: {
        effect: "attachment-image-quality",
        sha256: "a2bdea261f380d0827c389381ca2aad637aacb5aad6fc25e4c80503df0102751",
    },
    ImageFilename: {
        effect: "image-filename",
        sha256: "d9e7ae119be67c42c07e46f0c7cec9266eb1097f9e5c9b2c5a0b6c8638a53e7e",
    },
    BetterGifAltText: {
        effect: "descriptive-gif-alt",
        sha256: "ce344d1adaf7b09e3dd44e96eed5d087c7ef0805cd6b3fd20b6adadb371dd60b",
    },
    ImageLink: {
        effect: "preserve-image-links",
        find: "unknownUserMentionPlaceholder:",
        match: String.raw`/\i\.has\(\i\.type\)&&\(0,\i\.\i\)\(\i\)/`,
        replace: "false",
    },
    DoubleClickEdit: {
        effect: "double-click-edit",
        sha256: "5c2c99fa13c34244982d650fce1bfc9c6a2dba5bc683ef0bcadde814374fe926",
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

const sharedSourceRecipes = [
    {
        capability: "appearance",
        sources: {
            "desktop/client/src/plugins/blurNsfw/index.ts": "292e1074f5153a353f41f4b350505e00a879c81f8268f49e218324f6697e0c26",
        },
        lines: ["  needs appearance.style", "  style blur-nsfw-attachments"],
    },
    {
        capability: "incoming-notifications",
        sources: {
            "desktop/client/src/sincordplugins/pingNotifications/index.tsx": "fa7f9d4cd15ab7e3d019b596724fb1b02f8e1d3a35dbea99709eb1f3584ba58f",
        },
        lines: ["  needs messages.pingalerts", '  on incoming ping-alerts "mentions,dms"'],
    },
    {
        capability: "split-long-messages",
        sources: {
            "desktop/client/src/sincordplugins/splitLargeMessages/index.ts": "5f37baa1f571985f2f990ed3cc5168f3f7da0321beaadba74b91c96c10bf8ba8",
            "ios/runtime/src/core/plugins/splitlargemessages/index.ts": "d4ca4c2abffa4cea60e4f844b2285121c40cd6cabc8b6c1d6c60d2ec899946a0",
        },
        lines: ["  needs messages.split", "  use split-long-messages"],
    },
    {
        capability: "link-trigger",
        sources: {
            "desktop/client/src/sincordplugins/hopOn/index.tsx": "3ef7972c029f46c30087c04f1d2f84f2b923586d37e4c887f78b634a642e66a4",
            "ios/runtime/src/core/plugins/hopon/index.ts": "b80f9939dd3697b31430d4e644784ae6a67515ab0f6041dd3b51bd38b8db73ab",
        },
        lines: ["  needs links.openonmessage", '  on incoming open-link "hop on |"'],
    },
    {
        capability: "profile-bio-colors",
        sources: {
            "desktop/client/src/plugins/fakeProfileThemes/index.tsx": "2279c23c2668ecd548d9525d77ccfab45124946f75ac59f00eec7a00c5b41a35",
            "ios/runtime/src/core/plugins/fakeprofilethemes/index.ts": "2c02ce82a65edf983fd09811095b5bfe07a1ca440eac997b081f24aa255a1ca0",
        },
        lines: [
            "  needs appearance.style", "  needs commands.register", "  needs reply.local",
            '  on incoming profile-bio-colors "prefer-native"',
            '  on command "cx-profile-colors":',
            '    input "primary" text', '    input "accent" text',
            '    reply "${profileColors3y3(primary, accent)}" else "Enter both colors as six hex digits, like #7289da."',
        ],
    },
];

function compileSharedSource(file, code) {
    const recipe = sharedSourceRecipes.find(recipe => Object.hasOwn(recipe.sources, file));
    if (!recipe || createHash("sha256").update(code.replaceAll("\r\n", "\n")).digest("hex") !== recipe.sources[file]) return;
    return { capability: recipe.capability, lines: recipe.lines };
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

// Timestamp sources are translated into editable formats after checking the
// behavior and defaults in the exact versions scanned.
const timestampRecipes = {
    RealtimeTimestamps: {
        sha256: "98cbf6a976685766f79536b06ec162b397052ba9bc465f9d5ac99bab52a93835",
        formats: { cozy: "HH:mm:ss", compact: "HH:mm:ss", tooltip: "dddd, MMMM D, YYYY [at] HH:mm:ss", markdown: "dddd, MMMM D, YYYY [at] HH:mm:ss" },
    },
    CustomTimestamps: {
        sha256: "3a183e5b4564955cf087ec0e86a06cb0dac2db358fb2704cfb5edc74836f36d8",
        defaultsSha256: "70802dcef4ad2206d2d99eb057198629949a89a7ee1963f77e88f97f5ca2bdc9",
    },
};

function compileTimestampFormats(name, source, readCompanion) {
    if (!Object.hasOwn(timestampRecipes, name)) return;
    const recipe = timestampRecipes[name];
    const hash = text => createHash("sha256").update(text.replaceAll("\r\n", "\n"), "utf8").digest("hex");
    if (hash(source.text) !== recipe.sha256) return;
    let formats = recipe.formats;
    if (recipe.defaultsSha256) {
        const text = readCompanion?.("utils.tsx");
        if (!text || hash(text) !== recipe.defaultsSha256) return;
        const defaults = ts.createSourceFile("utils.tsx", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
        const table = defaults.statements.filter(ts.isVariableStatement).flatMap(statement => [...statement.declarationList.declarations])
            .find(declaration => identifier(declaration.name) === "timeFormats")?.initializer;
        formats = {};
        for (const [target, key] of Object.entries({ cozy: "cozy", compact: "compact", tooltip: "tooltip", accessibility: "ariaLabel",
            today: "sameDay", yesterday: "lastDay", week: "lastWeek", older: "sameElse" })) {
            const format = literal(value(value(table, key + "Format"), "default"));
            if (!safeText(format)) return;
            formats[target] = format;
        }
        formats.markdown = formats.tooltip;
    }
    return { capability: "timestamp-format", lines: ["  needs appearance.style", ...Object.entries(formats)
        .map(([target, format]) => "  format timestamp " + target + " " + JSON.stringify(format))] };
}

function inspectPlugin(file, code, platform, appearance = {}, nativeEffects = {}, readStylesheet) {
    if (platform === "betterdiscord") return inspectBetterDiscord(file, code, appearance, nativeEffects);
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
    const timestamps = platform === "desktop" && compileTimestampFormats(name, source, readStylesheet);
    const declutter = platform === "desktop" && name === "Declutter" && compileDeclutter(source, appearance);
    const compiled = compileSharedSource(file, code) || (platform === "mobile" && factory === "defineCorePlugin" && !source.parseDiagnostics.length
        ? compileMobileFilter(name, file, plugin, source) || compileMobileClientCommands(file, plugin, source)
            || compileMobileNativeEffect(file, plugin, source, nativeEffects) || compileMobilePreviousEdit(file, plugin, source)
            || compileMobileSocialEvents(file, plugin, source)
        : externalLookup || storeEffect || timestamps || declutter || managedStyle || supported && (originRewrite || compileCommands(plugin, source) || compileOutgoing(plugin)));
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
    const operations = new Set();
    const behaviors = new Set();
    const companions = [];
    function withinPlugin(file) {
        const local = path.relative(directory, file);
        return local !== ".." && !local.startsWith(".." + path.sep) && !path.isAbsolute(local);
    }
    for (const [file, text] of pending) {
        if (file.endsWith(".css")) {
            hooks.add("appearance");
            inventoryStyles(text, targets, true);
            continue;
        }
        const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
        if (file !== pending[0][0]) {
            const found = inventory(source);
            for (const hook of found.hooks) hooks.add(hook);
            for (const target of found.targets) targets.add(target);
            for (const operation of found.operations ?? []) operations.add(operation);
            for (const behavior of found.behaviors ?? []) behaviors.add(behavior);
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
    return { companions, hooks, targets, operations, behaviors };
}

function betterDiscordFiles(folder) {
    return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
        const location = path.join(folder, entry.name);
        if (entry.isFile() && entry.name.endsWith(".plugin.js")) return [location];
        if (entry.isDirectory() && entry.name !== "node_modules" && !entry.name.startsWith(".")) return betterDiscordFiles(location);
        return [];
    });
}

async function fetchReviewedBetterDiscordSources(reviews = reviewedBetterDiscordSources, request = fetch) {
    const entries = Object.entries(reviews);
    const sources = [];
    for (let offset = 0; offset < entries.length; offset += 8) {
        const batch = await Promise.all(entries.slice(offset, offset + 8).map(async ([sha256, review]) => {
            const pin = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/blob\/([a-f0-9]{40})\/((?:[\w.-]+\/)*[\w.-]+\.plugin\.js)$/.exec(review.source);
            if (!pin || pin.slice(1).some(value => value.split("/").some(part => part === "." || part === ".."))
                || !/^[a-f0-9]{64}$/.test(sha256)) throw new Error("Invalid reviewed source pin for " + review.name);
            const [, owner, repo, commit, file] = pin;
            const url = "https://raw.githubusercontent.com/" + [owner, repo, commit, file].join("/");
            try {
                const response = await request(url, { redirect: "error", signal: AbortSignal.timeout(15000) });
                if (!response.ok || !response.body) throw new Error("HTTP " + response.status);
                const chunks = [];
                let size = 0;
                for await (const chunk of response.body) {
                    size += chunk.byteLength;
                    if (size > 512 * 1024) throw new Error("source exceeds 512 KiB");
                    chunks.push(chunk);
                }
                const code = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(Buffer.concat(chunks));
                const hash = text => createHash("sha256").update(text, "utf8").digest("hex");
                if (hash(code) !== sha256 && hash(code.replaceAll("\r\n", "\n")) !== sha256) {
                    throw new Error("source hash differs from review");
                }
                return { file: owner + "/" + repo + "/" + file, code, sha256 };
            } catch (error) {
                throw new Error("Could not verify " + review.name + ": " + error.message, { cause: error });
            }
        }));
        sources.push(...batch);
    }
    return sources;
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

function scan(sourceDir, { includeCompanions = false, reviewedSources = [] } = {}) {
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
            if (includeCompanions && !record.cx && !existing.has(record.name.toLowerCase())
                && path.dirname(file) !== path.join(root, folder)) {
                const { companions, hooks, targets, operations, behaviors } = inspectCompanions(file, code);
                if (companions.length) {
                    record.companions = companions.map(source => path.relative(root, source).replaceAll("\\", "/")).sort();
                    record.hooks = [...new Set([...record.hooks, ...hooks])].sort();
                    record.targets = [...new Set([...record.targets, ...targets])].sort();
                    if (operations.size) record.operations = [...new Set([...(record.operations ?? []), ...operations])].sort();
                    if (behaviors.size) record.behaviors = [...new Set([...(record.behaviors ?? []), ...behaviors])].sort();
                }
            }
            records.push(record);
        }
    }
    const sourceDirs = typeof sourceDir === "string" ? [sourceDir] : sourceDir ?? [];
    const externalHashes = new Set(reviewedSources.map(({ sha256 }) => sha256));
    for (const directory of sourceDirs) for (const file of betterDiscordFiles(directory)) {
        const code = fs.readFileSync(file, "utf8");
        const hash = createHash("sha256").update(code.replaceAll("\r\n", "\n"), "utf8").digest("hex");
        if (externalHashes.has(hash)) continue;
        externalHashes.add(hash);
        const label = sourceDirs.length === 1 ? path.relative(directory, file) : file;
        const record = inspectPlugin(label.replaceAll("\\", "/"), code, "betterdiscord", cxAppearanceTargets, cxNativeEffects);
        if (record) records.push(record);
    }
    for (const { file, code, sha256 } of reviewedSources) {
        const record = inspectBetterDiscord(file, code, cxAppearanceTargets, cxNativeEffects);
        if (!record?.cx || record.review?.sha256 !== sha256) throw new Error("No CX recipe matched reviewed source " + file);
        records.push(record);
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

function buildBatchPlan(records, limit = Infinity) {
    const sources = new Map();
    for (const record of records) {
        const key = record.name.toLowerCase();
        const variants = sources.get(key) ?? [];
        variants.push(record);
        sources.set(key, variants);
    }
    const queues = new Map();
    const operationQueues = new Map();
    const behaviorQueues = new Map();
    const pending = new Set();
    let ready = 0;
    let compare = 0;
    let review = 0;
    for (const [key, variants] of sources) {
        if (variants.some(record => record.status === "in-catalog")) continue;
        if (variants.some(record => record.status === "ready")) {
            ready++;
            continue;
        }
        if (variants.some(record => record.status.startsWith("compare-"))) {
            compare++;
            continue;
        }
        if (variants.some(record => record.status === "source-review")) {
            review++;
            continue;
        }
        pending.add(key);
        for (const { behaviors } of variants) for (const behavior of behaviors ?? []) {
            const candidates = behaviorQueues.get(behavior) ?? new Set();
            candidates.add(key);
            behaviorQueues.set(behavior, candidates);
        }
        for (const { operations, name, platform, file, hooks } of variants) for (const operation of operations ?? []) {
            const candidates = operationQueues.get(operation) ?? new Map();
            const candidate = candidates.get(key) ?? { name, sources: [] };
            candidate.sources.push({ platform, file, hooks });
            candidates.set(key, candidate);
            operationQueues.set(operation, candidates);
        }
        for (const { targets } of variants) for (const anchor of targets ?? []) {
            // A store or CSS property can be referenced by unrelated features.
            if (!/^(event|module|component|recipe|selector|style|menu|patch|native|method):/.test(anchor)
                || /^module:(?:Store|dispatch|subscribe|icon|iconContainer|default|render)$/.test(anchor)) continue;
            const candidates = queues.get(anchor) ?? new Set();
            candidates.add(key);
            queues.set(anchor, candidates);
        }
    }
    const batches = [];
    const covered = new Set();
    const specificity = anchor => ({ style: 3, selector: 2, recipe: 1, native: 1, method: 1 }[anchor.split(":", 1)[0]] ?? 0);
    while (batches.length < limit) {
        const best = [...queues].map(([anchor, keys]) => {
            const next = [...keys].filter(key => !covered.has(key));
            const mobileSources = next.filter(key => sources.get(key).some(record => record.platform === "mobile")).length;
            return { anchor, next, mobileSources, total: keys.size };
        }).filter(batch => batch.next.length > 1)
            .sort((a, b) => specificity(b.anchor) - specificity(a.anchor)
                || b.next.length - a.next.length || b.mobileSources - a.mobileSources || a.anchor.localeCompare(b.anchor))[0];
        if (!best) break;
        queues.delete(best.anchor);
        for (const key of best.next) covered.add(key);
        batches.push({
            anchor: best.anchor,
            distinct: best.total,
            additional: best.next.length,
            mobileSources: best.mobileSources,
            plugins: best.next.map(key => sources.get(key)[0].name).sort((a, b) => a.localeCompare(b)),
            sources: best.next.flatMap(key => sources.get(key).map(({ name, file, platform, companions }) => ({
                name, file, platform, ...(companions ? { companions } : {}),
            }))),
        });
    }
    const unbatched = [...pending].filter(key => !covered.has(key)).map(key => {
        const variants = sources.get(key);
        return {
            name: variants[0].name,
            sources: variants.map(({ file, platform, hooks, targets, companions }) => ({
                file, platform, hooks, targets, ...(companions ? { companions } : {}),
            })),
        };
    });
    const operationBatches = [...operationQueues].filter(([, candidates]) => candidates.size > 1)
        .map(([operation, candidates]) => {
            const plugins = [...candidates.values()].sort((a, b) => a.name.localeCompare(b.name));
            const mobileSources = plugins.filter(plugin => plugin.sources.some(source => source.platform === "mobile")).length;
            return { operation, count: plugins.length, mobileSources, plugins };
        }).sort((a, b) => b.count - a.count || b.mobileSources - a.mobileSources || a.operation.localeCompare(b.operation));
    const behaviorBatches = [...behaviorQueues].filter(([, candidates]) => candidates.size > 1)
        .map(([behavior, candidates]) => ({
            behavior,
            count: candidates.size,
            sources: [...candidates].sort().flatMap(key => sources.get(key)
                .filter(record => record.behaviors?.includes(behavior))
                .map(({ name, file, platform, companions }) => ({ name, file, platform, ...(companions ? { companions } : {}) }))),
        })).sort((a, b) => b.count - a.count || a.behavior.localeCompare(b.behavior));
    return { sources: records.length, distinct: sources.size, ready, compare, review, pending: pending.size, covered: covered.size, batches, behaviorBatches, operationBatches, unbatched };
}

function checkAppearancePaths(appearance, indexes) {
    let checked = 0;
    const missing = [];
    for (const { plugin, mobile, style } of Object.values(appearance)) {
        const paths = mobile?.hideComponentPaths ?? [mobile?.renderTree ?? mobile?.settingsEntry,
            style?.centeredMessageList, style?.messageWidthRenderer].filter(Boolean);
        if (!paths.length) continue;
        checked++;
        for (const path of paths) {
            for (const [platform, index] of Object.entries(indexes)) {
                if (!index.has(path)) missing.push({ plugin, platform, path });
            }
        }
    }
    return { checked, missing };
}

function verifyPorts(files, runtime = require("./sync-cx-catalog.cjs").loadCxRuntime()) {
    const { parseCx, activateCx } = runtime;
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
                registerProfileBioTransform: register,
                registerReplyPingSuppression: register,
                registerProfileMenuAction: register,
                registerIncomingRules: register,
                registerNativeEffect: register,
                registerUploadAnonymiser: register,
                registerPreviousMessageRule: register,
                registerSendConfirmation: register,
                hideAppearanceTarget: register,
                styleAppearanceTarget: register,
                registerTimestampFormats: register,
            };
            const stop = activateCx(source, host, plugin.permissions, [...plugin.optionalHides.keys()]);
            if (!registrations) throw new Error("No supported behavior registered");
            stop();
            if (registrations) throw new Error("Plugin did not remove its hooks");
        } catch (error) {
            throw new Error(file + ": " + error.message);
        }
    }
}

const usage = "Usage: node cx-bulk-plugins.cjs [--json | --plan | --batches | --batch-json | --out-dir <new-folder> | --add-ready] [--source-dir <BetterDiscord sources>]... [--fetch-reviewed]";

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

function selectReadyPorts(ports, baseline, runtime) {
    const { pluginBody } = require("./sync-cx-catalog.cjs");
    const files = new Map();
    const bodies = new Map(baseline.pluginBodies);
    const names = new Set(baseline.names);
    const commands = new Set(baseline.commands);
    const skipped = [];
    for (const port of ports) {
        try {
            const candidate = portFiles([port]);
            const [[filename, source]] = candidate;
            if (files.get(filename) === source) continue;
            if (baseline.plugins + files.size >= 600) throw new Error("catalog limit reached");
            if (baseline.pluginFiles.has(filename) || files.has(filename)) throw new Error("duplicate CX filename " + filename);
            const plugin = runtime.parseCx(source);
            const name = plugin.name.trim().toLowerCase();
            if (names.has(name)) throw new Error("duplicate CX name " + plugin.name);
            const conflict = plugin.commands?.find(command => commands.has(command.name));
            if (conflict) throw new Error("duplicate CX command /" + conflict.name);
            const body = pluginBody(source);
            const equivalent = bodies.get(body);
            if (equivalent) throw new Error("duplicate CX plugin behavior already provided by " + equivalent);
            verifyPorts(candidate, runtime);
            files.set(filename, source);
            bodies.set(body, plugin.name);
            names.add(name);
            for (const command of plugin.commands) commands.add(command.name);
        } catch (error) {
            skipped.push({ name: port.name, file: port.file, reason: error.message });
        }
    }
    return { files, skipped };
}

function addReady(ports) {
    if (!ports.length) {
        console.log("No new CX ports are ready.");
        return;
    }
    const { buildCatalog, catalogPath, loadCxRuntime } = require("./sync-cx-catalog.cjs");
    const { files, skipped } = selectReadyPorts(ports, buildCatalog(), loadCxRuntime());
    for (const entry of skipped) console.warn("Skipped " + entry.name + " (" + entry.file + "): " + entry.reason);
    if (!files.size) return;
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

async function main(rawArgs) {
    const args = [...rawArgs];
    if (args.length === 1 && args[0] === "--help") {
        console.log(usage);
        console.log("Scan source patterns, export candidates for review, or add ready ports to the shared catalog.");
        console.log("Check native appearance paths with --check-appearance-paths <Android path list> <iOS path list>.");
        return;
    }
    if (args[0] === "--check-appearance-paths") {
        if (args.length !== 3) throw new Error("Expected an Android and an iOS module path list");
        const loadIndex = file => new Set(fs.readFileSync(file, "utf8").split(/\r?\n/).map(line => line.trim()).filter(Boolean));
        const { cxAppearanceTargets } = require("./sync-cx-catalog.cjs").loadCxRuntime();
        const result = checkAppearancePaths(cxAppearanceTargets, { Android: loadIndex(args[1]), iOS: loadIndex(args[2]) });
        if (result.missing.length) {
            throw new Error(result.missing.map(({ plugin, platform, path }) => plugin + " missing on " + platform + " (" + path + ")").join("\n"));
        }
        console.log("Verified module paths for " + result.checked + " appearance ports in both mobile indexes.");
        return;
    }
    const sourceDirs = [];
    for (let sourceIndex; (sourceIndex = args.indexOf("--source-dir")) !== -1;) {
        const sourceDir = args.splice(sourceIndex, 2)[1];
        if (!sourceDir || sourceDir.startsWith("--")) throw new Error(usage);
        const resolved = fs.realpathSync(sourceDir);
        if (!fs.statSync(resolved).isDirectory()) throw new Error("Expected a BetterDiscord source directory");
        if (!sourceDirs.includes(resolved)) sourceDirs.push(resolved);
    }
    const fetchReviewed = args.includes("--fetch-reviewed");
    if (fetchReviewed) args.splice(args.indexOf("--fetch-reviewed"), 1);
    const output = args.length === 2 && args[0] === "--out-dir" ? path.resolve(args[1]) : undefined;
    if (!output && (args.length > 1 || args.length === 1 && !["--json", "--plan", "--batches", "--batch-json", "--add-ready"].includes(args[0])))
        throw new Error(usage);
    const reviewedSources = fetchReviewed ? await fetchReviewedBetterDiscordSources() : [];
    const records = scan(sourceDirs, {
        includeCompanions: ["--plan", "--json", "--batches", "--batch-json"].includes(args[0]),
        reviewedSources,
    });
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
    if (args[0] === "--batch-json") {
        process.stdout.write(JSON.stringify(buildBatchPlan(records), null, 2) + "\n");
        return;
    }
    if (args[0] === "--batches") {
        const plan = buildBatchPlan(records, 12);
        console.log("Scanned " + plan.sources + " sources across " + plan.distinct + " distinct plugin names.");
        console.log(plan.ready + " ready, " + plan.compare + " need source comparison, " + plan.review + " need source review, "
            + plan.pending + " need adapters.");
        if (plan.behaviorBatches.length) {
            console.log("Shared action inside the same hook (groups overlap):");
            for (const batch of plan.behaviorBatches.slice(0, 10)) console.log(batch.count + " " + batch.behavior);
        }
        console.log("Reusable source shapes first, then shared anchors. Counts are candidates and exclude overlap with earlier rows.");
        for (const batch of plan.batches) {
            console.log(batch.additional + " " + batch.anchor + " (" + batch.mobileSources + " with mobile sources)  "
                + batch.plugins.slice(0, 5).join(", ") + (batch.plugins.length > 5 ? ", …" : ""));
        }
        console.log(plan.covered + " distinct candidates in these batches.");
        if (plan.operationBatches.length) {
            console.log("Shared host operations (groups overlap; candidates still require behavior and permission checks):");
            for (const batch of plan.operationBatches) {
                console.log(batch.count + " " + batch.operation + " (" + batch.mobileSources + " with mobile sources)");
            }
        }
        console.log("Use --batch-json for the full worklist and source paths.");
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
    main(process.argv.slice(2)).catch(error => {
        console.error(error.message);
        process.exitCode = 1;
    });
}
module.exports = { buildBatchPlan, buildPlan, checkAppearancePaths, classifyPorts, fetchReviewedBetterDiscordSources, inspectPlugin, portFiles, scan, selectReadyPorts, verifyPorts };
