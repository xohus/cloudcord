import { chooseOne, cxCommandFunctions } from "./cxCommandFunctions";
import { calculate, convertUnits } from "./cxNumeric";
import { messageTransforms, reverseText } from "./cxMessageTransforms";

export const MAX_CX_SOURCE = 512 * 1024;

const permissionLabels = {
    "commands.register": "Register the listed slash commands",
    "ui.toast": "Show local popups",
    "reply.local": "Show a command reply visible only to you",
    "messages.send": "Send the result to the current chat when you run a listed command",
    "messages.transform": "Change text before Discord sends messages you compose",
};

// Text transforms adapted from Endcord (Vendicated and contributors, GPL-3.0-or-later).
const leetCharacters: Record<string, string> = { a: "4", e: "3", i: "1", o: "0", s: "5", t: "7", b: "8", g: "9", l: "1" };
const textFunctions: Record<string, (...args: string[]) => string | undefined> = {
    ...cxCommandFunctions,
    calculate,
    convert: convertUnits,
    length: (text: string) => String(text.length),
    reverse: reverseText,
    spaced: (text: string) => text.split("").join(" "),
    clap: (text: string) => text.split(/\s+/).filter(Boolean).join(" 👏 "),
    leet: (text: string) => text.replace(/[aeiostbgl]/gi, char => leetCharacters[char.toLowerCase()]),
    bold: (text: string) => text.replace(/[A-Za-z0-9]/g, char => {
        const code = char.charCodeAt(0);
        if (code >= 97) return String.fromCodePoint(0x1D41A + code - 97);
        if (code >= 65) return String.fromCodePoint(0x1D400 + code - 65);
        return String.fromCodePoint(0x1D7CE + code - 48);
    }),
};
const textExpression = /\$\{([a-z][a-zA-Z0-9_-]*)(?:\(([a-z0-9_, -]*)\))?\}/g;
const argumentNames = (args: string) => args ? args.split(",").map(name => name.trim()) : [];

export type CxPermission = keyof typeof permissionLabels;
type Action = { kind: "toast" | "reply" | "send" | "reply or send"; message: string; fallback?: string; choices?: string[] };
const actionPermissions: Record<Action["kind"], CxPermission[]> = {
    toast: ["ui.toast"],
    reply: ["reply.local"],
    send: ["messages.send"],
    "reply or send": ["reply.local", "messages.send"],
};
const sendsMessage = (action: Action) => action.kind === "send" || action.kind === "reply or send";
type CommandInput = { name: string; type: "text" | "integer" | "boolean" | "choice"; required: boolean; choices?: string[] };
type Command = { name: string; text: boolean; inputs: CommandInput[]; actions: Action[] };
type MessageTransform = { name: keyof typeof messageTransforms; options?: string };
export type CxTheme = {
    kind: "theme";
    name: string;
    background: string;
    mode?: "dark" | "light";
    surface?: string;
    sidebar?: string;
    text?: string;
    muted?: string;
    accent?: string;
    wallpaper?: string;
    wallpaperOpacity?: number;
};
type CxPlugin = {
    kind: "plugin";
    name: string;
    permissions: CxPermission[];
    commands: Command[];
    messageTransforms: MessageTransform[];
};
type CxDocument = CxTheme | CxPlugin;

function quoted(value: string, limit: number) {
    if (!value.startsWith('"') || !value.endsWith('"')) throw new Error("Expected text in double quotes");
    let decoded: string;
    try {
        decoded = JSON.parse(value);
    } catch {
        throw new Error("Invalid quoted text");
    }
    if (!decoded.trim() || decoded.length > limit || /[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/u.test(decoded))
        throw new Error("Invalid text or length");
    return decoded;
}

export function parseCx(source: string): CxDocument {
    if (source.length > MAX_CX_SOURCE) throw new Error("CX file is too large");
    const lines = source.replace(/^\uFEFF/, "").split(/\r?\n/);
    const header = /^(plugin|theme) (.+):$/.exec(lines.shift() ?? "");
    if (!header) throw new Error('Start with plugin "Name": or theme "Name":');
    const name = quoted(header[2], 64);

    if (header[1] === "theme") {
        const theme: CxTheme = { kind: "theme", name, background: "" };
        const seen = new Set<string>();
        for (const line of lines) {
            if (!line.trim()) continue;
            const field = /^  (mode|background|surface|sidebar|text|muted|accent|wallpaper|wallpaper-opacity): (.+)$/.exec(line);
            if (!field || seen.has(field[1])) throw new Error("Unknown or duplicate theme field");
            const [, key, value] = field;
            seen.add(key);
            if (key === "mode") {
                if (value !== "dark" && value !== "light") throw new Error("Theme mode must be dark or light");
                theme.mode = value;
            } else if (key === "wallpaper") {
                const uri = quoted(value, 384 * 1024);
                if (!/^data:image\/(?:png;base64,iVBORw0KGgo|jpeg;base64,\/9j\/)[A-Za-z0-9+/]+={0,2}$/.test(uri) ||
                    uri.slice(uri.indexOf(",") + 1).length % 4 !== 0)
                    throw new Error("Wallpaper must be an embedded PNG or JPEG data URL");
                theme.wallpaper = uri;
            } else if (key === "wallpaper-opacity") {
                if (!/^(?:100|[1-9]?[0-9])$/.test(value)) throw new Error("Wallpaper opacity must be an integer from 0 to 100");
                theme.wallpaperOpacity = Number(value) / 100;
            } else {
                if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error("Use a six-digit hex color");
                theme[key as "background" | "surface" | "sidebar" | "text" | "muted" | "accent"] = value;
            }
        }
        if (!theme.background) throw new Error("A theme needs a background color");
        if (theme.wallpaperOpacity !== undefined && !theme.wallpaper) throw new Error("Wallpaper opacity requires an embedded wallpaper");
        return theme;
    }

    const permissions = new Set<CxPermission>();
    const commands: Command[] = [];
    const transforms: MessageTransform[] = [];
    let current: Command | undefined;
    for (const line of lines) {
        if (!line.trim()) continue;
        const declaration = /^  needs ([a-z.]+)$/.exec(line);
        if (declaration && !commands.length && !transforms.length) {
            const permission = declaration[1] as CxPermission;
            if (!Object.prototype.hasOwnProperty.call(permissionLabels, permission) || permissions.has(permission))
                throw new Error("Unknown or duplicate CX permission");
            permissions.add(permission);
            continue;
        }
        const transform = /^  before send ([a-zA-Z]+)( .+)?$/.exec(line);
        if (transform) {
            const name = transform[1] as MessageTransform["name"];
            if (!Object.prototype.hasOwnProperty.call(messageTransforms, name) || transforms.some(entry => entry.name === name))
                throw new Error("Unknown or duplicate outgoing text transform");
            if (transform[2] && name !== "capitalizeSentences") throw new Error("This transform takes no options");
            transforms.push({ name, options: transform[2] ? quoted(transform[2].trim(), 240) : undefined });
            current = undefined;
            continue;
        }
        const command = /^  on command "([a-z][a-z0-9_-]{0,31})"( with text)?:$/.exec(line);
        if (command) {
            const name = command[1];
            if (commands.length >= 48 || commands.some(entry => entry.name === name)) throw new Error("Duplicate or too many commands");
            commands.push(current = { name, text: Boolean(command[2]), inputs: [], actions: [] });
            continue;
        }
        const input = /^    input "([a-z][a-z0-9_-]{0,31})" (text|integer|boolean|choice)( "(?:[^"\\]|\\.)*")?( optional)?$/.exec(line);
        if (input && current && !current.actions.length) {
            const [, name, type, list, optional] = input;
            if (name === "send" || (name === "text" && current.text) || current.inputs.length >= 4 || current.inputs.some(option => option.name === name))
                throw new Error("Reserved, duplicate, or too many command inputs");
            const choices = list ? quoted(list.trim(), 240).split(",").map(choice => choice.trim()) : undefined;
            if ((type === "choice") !== !!choices || choices && (choices.length > 16 || choices.some(choice => !choice) || new Set(choices).size !== choices.length))
                throw new Error("Choice inputs need a list of distinct values");
            current.inputs.push({ name, type: type as CommandInput["type"], required: !optional, choices });
            continue;
        }
        const pick = /^    send one of (\[.{1,3000}\])$/.exec(line);
        if (pick && current && current.actions.length < 4 && !current.actions.some(sendsMessage)) {
            let choices: unknown;
            try { choices = JSON.parse(pick[1]); } catch { throw new Error("Expected a JSON list of messages"); }
            if (!Array.isArray(choices) || !choices.length || choices.length > 24 || choices.some(choice => typeof choice !== "string" || choice.includes("${")))
                throw new Error("Expected 1 to 24 literal messages");
            current.actions.push({ kind: "send", message: "", choices: choices.map(choice => quoted(JSON.stringify(choice), 240)) });
            continue;
        }
        const action = /^    (toast|reply or send|reply|send) ("(?:[^"\\]|\\.)*")(?: else ("(?:[^"\\]|\\.)*"))?$/.exec(line);
        if (!action || !current || current.actions.length >= 4) throw new Error("Unknown CX instruction or too many actions");
        const kind = action[1] as Action["kind"];
        const message = quoted(action[2], 240);
        const fallback = action[3] === undefined ? undefined : quoted(action[3], 240);
        if (fallback && (kind === "toast" || fallback.includes('${'))) throw new Error("A command fallback must be literal reply text");
        if (sendsMessage({ kind, message }) && current.actions.some(sendsMessage)) {
            throw new Error("CX allows one outgoing message per command");
        }
        if (kind !== "toast") {
            const inputs = new Set(current.inputs.map(input => input.name));
            if (current.text) inputs.add("text");
            const remaining = message.replace(textExpression, (expression, name: string, args: string | undefined) => {
                if (args === undefined) return inputs.has(name) ? "" : expression;
                const names = argumentNames(args);
                return Object.prototype.hasOwnProperty.call(textFunctions, name)
                    && textFunctions[name].length === names.length && names.every(name => inputs.has(name)) ? "" : expression;
            });
            if (remaining.includes('${')) throw new Error("CX messages only support declared inputs and named text functions");
        }
        current.actions.push({ kind, message, fallback });
    }
    if ((!commands.length && !transforms.length) || commands.some(command => !command.actions.length))
        throw new Error("A plugin needs a command with an action or an outgoing text transform");
    const required = new Set<CxPermission>();
    if (commands.length) required.add("commands.register");
    if (transforms.length) required.add("messages.transform");
    for (const { actions } of commands) {
        for (const action of actions) {
            for (const permission of actionPermissions[action.kind]) required.add(permission);
            if (action.fallback) required.add("reply.local");
        }
    }
    if ([...required].some(permission => !permissions.has(permission)))
        throw new Error("Declare the permissions used by your commands");
    if ([...permissions].some(permission => !required.has(permission)))
        throw new Error("Remove unused CX permissions");
    return { kind: "plugin", name, commands, permissions: [...permissions], messageTransforms: transforms };
}

export function reviewCx(source: string) {
    const document = parseCx(source);
    if (document.kind === "theme") return { kind: document.kind, name: document.name, permissions: [] as CxPermission[], effects: ["Change the app colors and background"] };
    return {
        kind: document.kind,
        name: document.name,
        permissions: document.permissions,
        effects: document.permissions.map(permission => permissionLabels[permission]),
        commands: document.commands.map(command => "/" + command.name),
    };
}

type Invocation = { text?: string; inputs?: Record<string, unknown>; sendRequested?: boolean; reply?: (message: string) => void };
type CxHost = {
    registerCommand: (name: string, execute: (invocation?: Invocation) => string | undefined, acceptsText: boolean, sendsMessage: boolean, optionalSend: boolean, inputs: readonly CommandInput[]) => () => void;
    toast: (message: string) => void;
    applyTheme: (theme: CxTheme) => () => void;
    registerMessageTransform?: (transform: (text: string) => string) => () => void;
};

/** Only trusted UI can grant access. The source never receives the host or a callback argument. */
export function activateCx(source: string, host: CxHost, approved: readonly CxPermission[]) {
    const document = parseCx(source);
    if (document.kind === "theme") return host.applyTheme(document);
    const grants = new Set(approved);
    if (!document.permissions.every(permission => grants.has(permission))) throw new Error("CX permission approval is required");

    const cleanups: (() => void)[] = [];
    let active = true;
    function stop() {
        active = false;
        for (const cleanup of cleanups.splice(0).reverse()) cleanup();
    }
    try {
        if (document.messageTransforms.length) {
            if (!host.registerMessageTransform) throw new Error("This client cannot transform outgoing messages");
            cleanups.push(host.registerMessageTransform(text => {
                if (!active || text.length > 4000) return text;
                let result = text;
                for (const { name, options } of document.messageTransforms) result = messageTransforms[name](result, options);
                return result.trim() && result.length <= 4000 ? result : text;
            }));
        }
        for (const command of document.commands) {
            if (!grants.has("commands.register")) throw new Error("Command permission denied");
            cleanups.push(host.registerCommand(command.name, invocation => {
                if (!active) return;
                const inputs = new Map<string, string>();
                const text = command.text && typeof invocation?.text === "string" ? invocation.text : "";
                if (text.length > 4000) return;
                if (command.text) inputs.set("text", text);
                for (const input of command.inputs) {
                    const value = invocation?.inputs?.[input.name];
                    const serialized = typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : "";
                    const valid = serialized.trim() && serialized.length <= 4000 && (
                        input.type === "text" ? typeof value === "string"
                            : input.type === "boolean" ? typeof value === "boolean"
                                : input.type === "integer" ? /^-?\d+$/.test(serialized) && Number.isSafeInteger(Number(serialized))
                                : input.choices?.includes(serialized)
                    );
                    if (!valid && (input.required || value !== undefined)) return;
                    inputs.set(input.name, valid ? serialized : "");
                }
                let outgoing: string | undefined;
                for (const action of command.actions) {
                    if (!actionPermissions[action.kind].every(permission => grants.has(permission))) continue;
                    if (action.kind === "toast") {
                        host.toast(action.message);
                        continue;
                    }
                    let invalid = false;
                    const message = action.choices ? chooseOne(action.choices)! : action.message.replace(textExpression, (_, name: string, args: string | undefined) => {
                        const value = args === undefined ? inputs.get(name) : textFunctions[name](...argumentNames(args).map(name => inputs.get(name)!));
                        if (value === undefined) invalid = true;
                        return value ?? "";
                    });
                    if (invalid) {
                        if (action.fallback && grants.has("reply.local")) invocation?.reply?.(action.fallback);
                        continue;
                    }
                    if (message.length > 4000) continue;
                    if (action.kind === "reply" || (action.kind === "reply or send" && invocation?.sendRequested !== true)) invocation?.reply?.(message);
                    else if ((!command.text || text.trim()) && message.trim()) outgoing = message;
                }
                return outgoing;
            }, command.text, command.actions.some(sendsMessage), command.actions.some(action => action.kind === "reply or send"), command.inputs));
        }
        return stop;
    } catch (error) {
        stop();
        throw error;
    }
}


export function createCxSession() {
    const active = new Map<string, { name: string; stop: () => void }>();
    return {
        list: () => [...active].map(([id, { name }]) => ({ id, name })),
        enable(source: string, host: CxHost, approved: readonly CxPermission[]) {
            const review = reviewCx(source);
            const id = review.kind === "theme" ? "theme" : "plugin:" + review.name;
            if (active.has(id)) throw new Error(review.kind === "theme" ? "Disable the active CX theme first" : "This CX plugin is already active");
            if (active.size >= 16) throw new Error("Disable an extension before adding another");
            active.set(id, { name: review.name, stop: activateCx(source, host, approved) });
        },
        disable(id: string) {
            const entry = active.get(id);
            active.delete(id);
            entry?.stop();
        },
        clear() {
            for (const [id, entry] of active) {
                active.delete(id);
                entry.stop();
            }
        },
    };
}
