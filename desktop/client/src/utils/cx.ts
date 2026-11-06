export const MAX_CX_SOURCE = 512 * 1024;

const permissionLabels = {
    "commands.register": "Register the listed slash commands",
    "ui.toast": "Show local popups",
    "reply.local": "Show a command reply visible only to you",
};

export type CxPermission = keyof typeof permissionLabels;
type Action = { kind: "toast" | "reply"; message: string };
type Command = { name: string; text: boolean; actions: Action[] };
export type CxTheme = {
    kind: "theme";
    name: string;
    background: string;
    accent?: string;
    wallpaper?: string;
};
type CxPlugin = {
    kind: "plugin";
    name: string;
    permissions: CxPermission[];
    commands: Command[];
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
            const field = /^  (background|accent|wallpaper): (.+)$/.exec(line);
            if (!field || seen.has(field[1])) throw new Error("Unknown or duplicate theme field");
            const [, key, value] = field;
            seen.add(key);
            if (key === "wallpaper") {
                const uri = quoted(value, 384 * 1024);
                if (!/^data:image\/(?:png;base64,iVBORw0KGgo|jpeg;base64,\/9j\/)[A-Za-z0-9+/]+={0,2}$/.test(uri) ||
                    uri.slice(uri.indexOf(",") + 1).length % 4 !== 0)
                    throw new Error("Wallpaper must be an embedded PNG or JPEG data URL");
                theme.wallpaper = uri;
            } else {
                if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error("Use a six-digit hex color");
                if (key === "background") theme.background = value;
                else theme.accent = value;
            }
        }
        if (!theme.background) throw new Error("A theme needs a background color");
        return theme;
    }

    const permissions = new Set<CxPermission>();
    const commands: Command[] = [];
    let current: Command | undefined;
    for (const line of lines) {
        if (!line.trim()) continue;
        const declaration = /^  needs ([a-z.]+)$/.exec(line);
        if (declaration && !current) {
            const permission = declaration[1] as CxPermission;
            if (!Object.prototype.hasOwnProperty.call(permissionLabels, permission) || permissions.has(permission))
                throw new Error("Unknown or duplicate CX permission");
            permissions.add(permission);
            continue;
        }
        const command = /^  on command "([a-z][a-z0-9_-]{0,31})"( with text)?:$/.exec(line);
        if (command) {
            const name = command[1];
            if (commands.length >= 16 || commands.some(entry => entry.name === name)) throw new Error("Duplicate or too many commands");
            commands.push(current = { name, text: Boolean(command[2]), actions: [] });
            continue;
        }
        const action = /^    (toast|reply) (.+)$/.exec(line);
        if (!action || !current || current.actions.length >= 4) throw new Error("Unknown CX instruction or too many actions");
        const kind = action[1] as Action["kind"];
        const message = quoted(action[2], 240);
        if (kind === "reply") {
            const remaining = current.text ? message.replaceAll('${length(text)}', "") : message;
            if (remaining.includes('${')) throw new Error("CX replies support only length(text) in commands with text");
        }
        current.actions.push({ kind, message });
    }
    if (!commands.length || commands.some(command => !command.actions.length))
        throw new Error("A plugin needs at least one command with an action");
    const required = new Set<CxPermission>(["commands.register"]);
    for (const { actions } of commands) {
        for (const action of actions) required.add(action.kind === "toast" ? "ui.toast" : "reply.local");
    }
    if ([...required].some(permission => !permissions.has(permission)))
        throw new Error("Declare the permissions used by your commands");
    if ([...permissions].some(permission => !required.has(permission)))
        throw new Error("Remove unused CX permissions");
    return { kind: "plugin", name, commands, permissions: [...permissions] };
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

type Invocation = { text?: string; reply?: (message: string) => void };
type CxHost = {
    registerCommand: (name: string, execute: (invocation?: Invocation) => void, acceptsText: boolean) => () => void;
    toast: (message: string) => void;
    applyTheme: (theme: CxTheme) => () => void;
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
        for (const command of document.commands) {
            if (!grants.has("commands.register")) throw new Error("Command permission denied");
            cleanups.push(host.registerCommand(command.name, invocation => {
                if (!active) return;
                for (const action of command.actions) {
                    if (action.kind === "toast" && grants.has("ui.toast")) host.toast(action.message);
                    if (action.kind === "reply" && grants.has("reply.local")) {
                        const text = command.text && typeof invocation?.text === "string" ? invocation.text : "";
                        invocation?.reply?.(action.message.replaceAll('${length(text)}', String(text.length)));
                    }
                }
            }, command.text));
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
