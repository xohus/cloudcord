const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "../../..");
const desktopGroups = ["plugins", "cloudcordplugins", "endcordplugins", "equicordplugins", "sincordplugins", "userplugins"];
const catalogFolder = path.join(root, "examples/cx/catalog/plugins");
const quotedPattern = /[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/u;
const printer = ts.createPrinter({ removeComments: true });

function property(object, key) {
    if (!object || !ts.isObjectLiteralExpression(object)) return;
    return object.properties.find(entry => entry.name && ts.isIdentifier(entry.name) && entry.name.text === key);
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

function inspectPlugin(file, code, platform, appearance = {}) {
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
            name, file, platform, flags: { commands: false, outgoing: false, settings: false, ui: true, styles: true },
            ...(supported ? {
                capability: "appearance",
                cx: "plugin " + JSON.stringify(name) + ":\n  needs appearance.hide\n  hide " + registered[0] + "\n",
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
    const compiled = supported && (compileCommands(plugin, source) || compileOutgoing(plugin));
    return {
        name, file, platform, flags,
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

function scan() {
    const { cxAppearanceTargets } = require("./sync-cx-catalog.cjs").loadCxRuntime();
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
            const record = inspectPlugin(path.relative(root, file).replaceAll("\\", "/"), fs.readFileSync(file, "utf8"), platform, cxAppearanceTargets);
            if (record) records.push(record);
        }
    }
    const mobile = new Set(records.filter(record => record.platform === "mobile").map(record => record.name.toLowerCase()));
    const nameCounts = new Map();
    for (const { name, platform } of records) if (platform === "desktop") {
        const key = name.toLowerCase();
        nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
    }
    return records.map(({ cx, ...record }) => {
        const key = record.name.toLowerCase();
        const already = existing.has(key);
        const status = already ? "in-catalog"
            : !cx ? "needs-adapter"
                : mobile.has(key) ? "compare-mobile"
                    : nameCounts.get(key) > 1 ? "compare-desktop"
                        : "ready";
        return { ...record, status, ...(cx ? { cx } : {}) };
    });
}

const usage = "Usage: node cx-bulk-plugins.cjs [--json | --out-dir <new-folder> | --add-ready]";

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

function main(args) {
    if (args.length === 1 && args[0] === "--help") {
        console.log(usage);
        console.log("Scan source patterns, export candidates for review, or add ready ports to the shared catalog.");
        return;
    }
    const output = args.length === 2 && args[0] === "--out-dir" ? path.resolve(args[1]) : undefined;
    if (!output && (args.length > 1 || args.length === 1 && !["--json", "--add-ready"].includes(args[0])))
        throw new Error(usage);
    const records = scan();
    if (args[0] === "--add-ready") {
        addReady(records.filter(record => record.status === "ready"));
        return;
    }
    if (output) {
        const { loadCxParser } = require("./sync-cx-catalog.cjs");
        const parseCx = loadCxParser();
        const ports = records.filter(record => record.cx && ["ready", "in-catalog"].includes(record.status));
        const files = portFiles(ports);
        for (const source of files.values()) parseCx(source);
        fs.mkdirSync(output);
        for (const [name, source] of files) fs.writeFileSync(path.join(output, name), source, { flag: "wx" });
        fs.writeFileSync(path.join(output, "sources.json"), JSON.stringify(ports.map(({ name, file, status }) => ({ name, file, status })), null, 2) + "\n");
        console.log("Exported " + files.size + " validated CX ports to " + output);
    }
    if (args.includes("--json")) {
        process.stdout.write(JSON.stringify(records, null, 2) + "\n");
        return;
    }
    const counts = Object.fromEntries(["desktop", "mobile"].map(platform => [platform, records.filter(record => record.platform === platform).length]));
    console.log("Inspected " + counts.desktop + " desktop and " + counts.mobile + " mobile plugin sources.");
    for (const status of ["ready", "compare-mobile", "compare-desktop", "in-catalog", "needs-adapter"]) {
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
module.exports = { inspectPlugin, scan };
