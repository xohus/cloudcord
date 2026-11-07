import { cxAppearanceTargets, type CxAppearanceTarget, type CxHideTarget, type CxStyleTarget } from "./cxAppearance";
import { cxClientFunctions, cxExternalLookups, type CxClientFunction, type CxExternalLookup, type CxFriendInviteAction } from "./cxClientCommands";
import { chooseOne, cxCommandFunctions } from "./cxCommandFunctions";
import { applyIncomingRule, incomingPermissions, type IncomingPayload, type IncomingRule, parseIncomingRule } from "./cxIncoming";
import { calculate, convertUnits } from "./cxNumeric";
import { messageTransforms, parseCxHttpsOrigin, polishOptions, reverseText, rewriteCxOrigin } from "./cxMessageTransforms";
import { cxAvatarResolutions, type CxAvatarResolution, cxNativeEffects, type CxNativeEffect } from "./cxNativeEffects";
import { parseCxPreviousRule, type CxPreviousRule } from "./cxPreviousMessage";
import { applyCxTextRules, parseCxTextRule } from "./cxTextRules";
import { createCxUploadAnonymiser, type CxUploadAnonymiser, type CxUploadNaming } from "./cxUploadNames";

import { cxProfileMenuActions, isCxProfileUserId, type CxProfileMenuAction } from "./cxProfileMenu";

export { cxProfileMenuActions, getCxProfileMenuCopy, isCxProfileUserId, type CxProfileMenuAction } from "./cxProfileMenu";
export { formatCxRandomMember, formatCxRoleMembers, formatCxSpotify, markCxServersRead, runCxFriendInvites } from "./cxClientCommands";
export { animateCxAssets, cxNativeEffects, fixCxFileExtensions, floorCxRelativeTime, overrideCxMethods, raiseCxAvatarResolution } from "./cxNativeEffects";
export { createCxPreviousSendHandler, planCxPreviousEdit } from "./cxPreviousMessage";
export { bindCxSocialEvents } from "./cxSocialEvents";
export { createCxPlusReactionHandler } from "./cxPlusReactions";
export type { CxUploadAnonymiser } from "./cxUploadNames";

export const MAX_CX_SOURCE = 512 * 1024;
export const CX_INLINE_EDITOR_LIMIT = 32 * 1024;
export { cxAppearanceTargets };

const permissionLabels = {
    "commands.register": "Register the listed slash commands",
    "ui.toast": "Show local popups",
    "reply.local": "Show a command reply visible only to you",
    "messages.send": "Send the result to the current chat when you run a listed command",
    "messages.transform": "Change text before Discord sends messages you compose",
    "messages.edit.transform": "Change text when you submit a message edit",
    "messages.redirectlinks": "Replace the listed HTTPS origins in messages you compose",
    "messages.editprevious": "Edit your own previous text message when you send a correction or quick follow-up",
    "messages.reactshortcut": "Add an emoji reaction in the current chat when you send a plus shortcut",
    "uploads.rename": "Change attachment filenames before Discord uploads them",
    "replies.suppressping": "Send replies without pinging the person you reply to",
    "profile.avatar": "Read the avatar URL of the selected Discord user or your own avatar when the command runs",
    "guild.members": "Read loaded members with the role you select in the current server",
    "guild.randommember": "Pick a loaded member of the current server to mention",
    "friends.invites.create": "Create a friend invite when you run the listed command",
    "friends.invites.list": "List your friend invites privately when you run the listed command",
    "friends.invites.revoke": "Revoke all your friend invites when you run the listed command",
    "spotify.activity": "Read your current Spotify track, album, or artist when the command runs",
    "servers.markread": "Mark unread server channels as read when you run the listed command",
    "profilemenu.copy": "Add the listed copy actions to user menus, including profile colors when specified. Writes to the clipboard only when selected.",
    "appearance.hide": "Hide the listed interface elements on this device",
    "appearance.style": "Apply the listed visual changes on this device",
    "appearance.avatarresolution": "Change image size requests for avatars hosted on Discord’s CDN",
    "messages.filterstickers": "Filter stickers from incoming messages on this device",
    "messages.silencementions": "Mute mentions from the listed senders on this device",
    "replies.controlping": "Choose whether incoming replies ping you on this device",
    "calls.suppressring": "Silence incoming call rings from the listed users and group DMs",
    "voice.notifyfriends": "Show local notifications when friends join or move between voice channels",
    "voice.followfriend": "Move you to the listed friend’s voice channel while you are already connected to voice",
    "friends.notifyremoval": "Show a local notification when a friend removes you",
    "messages.watchlocal": "Match incoming messages on this device and show local notifications",
    "links.openonmessage": "Open the configured HTTPS page when a matching message arrives in the channel you are viewing",
    "messages.filterlocal": "Hide matching incoming messages and history on this device",
    "typing.suppress": "Suppress your outgoing typing indicator",
    "notifications.preventautoupgrade": "Prevent Discord from automatically changing a channel to All Messages notifications",
    "lookup.wikipedia": "Send the title you enter to English Wikipedia when you run the lookup command",
    "diagnostics.copy": "Copy a local report of Discord module names and return types when you run the diagnostic command",
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
type BasicAction = { kind: "toast" | "reply" | "send" | "reply or send" | "mark-read"; message: string; fallback?: string; choices?: string[] };
type Action = BasicAction | { kind: "friend-invites"; operation: CxFriendInviteAction }
    | { kind: "copy-diagnostics"; }
    | { kind: "upload-spoilers"; input: string; }
    | { kind: "lookup"; service: CxExternalLookup; input: string; };
const actionPermissions: Record<BasicAction["kind"], CxPermission[]> = {
    toast: ["ui.toast"],
    reply: ["reply.local"],
    send: ["messages.send"],
    "reply or send": ["reply.local", "messages.send"],
    "mark-read": ["servers.markread", "reply.local"],
};
const getActionPermissions = (action: Action): CxPermission[] => action.kind === "friend-invites"
    ? ["reply.local", `friends.invites.${action.operation}`]
    : action.kind === "lookup" ? ["reply.local", cxExternalLookups[action.service].permission]
        : action.kind === "copy-diagnostics" ? ["reply.local", "diagnostics.copy"]
            : action.kind === "upload-spoilers" ? ["reply.local", "uploads.rename"] : actionPermissions[action.kind];
const sendsMessage = (action: Action) => action.kind === "send" || action.kind === "reply or send";
type CommandInput = { name: string; type: "text" | "integer" | "boolean" | "choice" | "user" | "role"; required: boolean; choices?: string[] };
type Command = { name: string; text: boolean; inputs: CommandInput[]; actions: Action[] };
type TransformStage = "send" | "edit";
type MessageTransform = { stage: TransformStage } & (
    { name: keyof typeof messageTransforms; options?: string } |
    { name: "replaceLiteral"; find: string; replacement: string } |
    { name: "rewriteOrigin"; find: string; replacement: string } |
    { name: "rewriteText"; rules: ReturnType<typeof parseCxTextRule>[]; }
);
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
    wallpaperBlur?: number;
    semanticColors?: Record<string, string>;
    rawColors?: Record<string, string>;
};
type CxPlugin = {
    kind: "plugin";
    name: string;
    permissions: CxPermission[];
    commands: Command[];
    messageTransforms: MessageTransform[];
    suppressReplyPing: boolean;
    hiddenTargets: CxHideTarget[];
    styledTargets: CxStyleTarget[];
    nativeEffects: CxNativeEffect[];
    avatarResolution?: CxAvatarResolution;
    uploadNaming?: CxUploadNaming;
    previousRule?: CxPreviousRule;
    profileActions: CxProfileMenuAction[];
    incoming: IncomingRule[];
};
type CxDocument = CxTheme | CxPlugin;

function quoted(value: string, limit: number, allowEmpty = false) {
    if (!value.startsWith('"') || !value.endsWith('"')) throw new Error("Expected text in double quotes");
    let decoded: string;
    try {
        decoded = JSON.parse(value);
    } catch {
        throw new Error("Invalid quoted text");
    }
    if ((!allowEmpty && !decoded.trim()) || decoded.length > limit || /[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/u.test(decoded))
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
            const token = /^  (semantic|raw) ([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*): (#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?)$/.exec(line);
            if (token) {
                const [, kind, name, color] = token;
                const colors = kind === "semantic" ? theme.semanticColors ??= {} : theme.rawColors ??= {};
                if (name.length > 64 || Object.prototype.hasOwnProperty.call(colors, name) || Object.keys(colors).length >= 256)
                    throw new Error("Duplicate, oversized, or too many theme color tokens");
                colors[name] = color;
                continue;
            }
            const field = /^  (mode|background|surface|sidebar|text|muted|accent|wallpaper|wallpaper-opacity|wallpaper-blur): (.+)$/.exec(line);
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
            } else if (key === "wallpaper-blur") {
                if (!/^(?:0|[1-9]\d?)(?:\.\d{1,2})?$/.test(value) || Number(value) > 32)
                    throw new Error("Wallpaper blur must be from 0 to 32 pixels");
                theme.wallpaperBlur = Number(value);
            } else {
                if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error("Use a six-digit hex color");
                theme[key as "background" | "surface" | "sidebar" | "text" | "muted" | "accent"] = value;
            }
        }
        if (!theme.background) throw new Error("A theme needs a background color");
        if (theme.wallpaperOpacity !== undefined && !theme.wallpaper) throw new Error("Wallpaper opacity requires an embedded wallpaper");
        if (theme.wallpaperBlur !== undefined && !theme.wallpaper) throw new Error("Wallpaper blur requires an embedded wallpaper");
        return theme;
    }

    const permissions = new Set<CxPermission>();
    const commands: Command[] = [];
    const transforms: MessageTransform[] = [];
    const hiddenTargets = new Set<CxHideTarget>();
    const styledTargets = new Set<CxStyleTarget>();
    const nativeEffects = new Set<CxNativeEffect>();
    let avatarResolution: CxAvatarResolution | undefined;
    let uploadNaming: CxUploadNaming | undefined;
    let previousRule: CxPreviousRule | undefined;
    const profileActions = new Set<CxProfileMenuAction>();
    const incoming: IncomingRule[] = [];
    let suppressReplyPing = false;
    let readsAvatar = false;
    const clientPermissions = new Set<CxPermission>();
    let current: Command | undefined;
    let textRules: ReturnType<typeof parseCxTextRule>[] | undefined;
    for (const line of lines) {
        if (!line.trim()) continue;
        if (textRules && line.startsWith("    ")) {
            if (textRules.length >= 256) throw new Error("Too many text rewrite rules");
            textRules.push(parseCxTextRule(line, quoted));
            continue;
        }
        textRules = undefined;
        const declaration = /^  needs ([a-z.]+)$/.exec(line);
        if (declaration && !commands.length && !transforms.length && !suppressReplyPing && !hiddenTargets.size && !styledTargets.size && !nativeEffects.size && !previousRule && !profileActions.size && !incoming.length && !uploadNaming) {
            const permission = declaration[1] as CxPermission;
            if (!Object.prototype.hasOwnProperty.call(permissionLabels, permission) || permissions.has(permission))
                throw new Error("Unknown or duplicate CX permission");
            permissions.add(permission);
            continue;
        }
        const incomingRule = /^  on incoming ([a-z-]+) ("(?:[^"\\]|\\.)*")$/.exec(line);
        if (incomingRule) {
            const rule = parseIncomingRule(incomingRule[1], quoted(incomingRule[2], 240, true));
            if (incoming.some(existing => existing.kind === rule.kind)) throw new Error("Duplicate incoming rule");
            incoming.push(rule);
            current = undefined;
            continue;
        }
        const profileAction = /^  on profile menu copy ([a-z-]+)$/.exec(line);
        if (profileAction) {
            const action = profileAction[1] as CxProfileMenuAction;
            if (!Object.prototype.hasOwnProperty.call(cxProfileMenuActions, action) || profileActions.has(action))
                throw new Error("Unknown or duplicate profile menu action");
            profileActions.add(action);
            current = undefined;
            continue;
        }
        const appearance = /^  (hide|style) ([a-z-]+)$/.exec(line);
        if (appearance) {
            const target = appearance[2] as CxAppearanceTarget;
            const rule = Object.prototype.hasOwnProperty.call(cxAppearanceTargets, target) && cxAppearanceTargets[target];
            if (rule && appearance[1] === "style" && "style" in rule && !styledTargets.has(target as CxStyleTarget))
                styledTargets.add(target as CxStyleTarget);
            else if (rule && appearance[1] === "hide" && "mobile" in rule && !hiddenTargets.has(target as CxHideTarget))
                hiddenTargets.add(target as CxHideTarget);
            else
                throw new Error("Unknown or duplicate appearance target");
            current = undefined;
            continue;
        }
        const effect = /^  use ([a-z-]+)(?: (\d+))?$/.exec(line);
        if (effect) {
            const name = effect[1] as CxNativeEffect;
            if (!Object.prototype.hasOwnProperty.call(cxNativeEffects, name) || nativeEffects.has(name))
                throw new Error("Unknown or duplicate client effect");
            if (name === "avatar-resolution") {
                const size = Number(effect[2]) as CxAvatarResolution;
                if (!cxAvatarResolutions.includes(size)) throw new Error("Choose an avatar size of 256, 512, 1024, 2048, or 4096");
                avatarResolution = size;
            } else if (effect[2]) throw new Error("This client effect takes no options");
            nativeEffects.add(name);
            current = undefined;
            continue;
        }
        if (line === "  before send suppressReplyPing" && !suppressReplyPing) {
            suppressReplyPing = true;
            current = undefined;
            continue;
        }
        const upload = /^  before upload anonymise (random (\d{1,2})|timestamp|consistent ("(?:[^"\\]|\\.)*"))( manual)?$/.exec(line);
        if (upload) {
            if (uploadNaming) throw new Error("Use one upload naming rule");
            const manual = Boolean(upload[4]);
            if (upload[2]) {
                const length = Number(upload[2]);
                if (length < 1 || length > 24) throw new Error("Use a random filename length from 1 to 24");
                uploadNaming = { mode: "random", length, manual };
            } else if (upload[3]) {
                const basename = quoted(upload[3], 48);
                if (!/^[\w-]+$/.test(basename) || /^spoiler_/i.test(basename)) throw new Error("Use letters, numbers, underscores or hyphens for upload names");
                uploadNaming = { mode: "consistent", basename, manual };
            } else uploadNaming = { mode: "timestamp", manual };
            current = undefined;
            continue;
        }
        const previous = parseCxPreviousRule(line);
        if (previous) {
            if (previousRule) throw new Error("Choose one previous-message rule per plugin");
            previousRule = previous;
            current = undefined;
            continue;
        }
        const textRewrite = /^  before (send|edit) rewrite-text:$/.exec(line);
        if (textRewrite) {
            const stage = textRewrite[1] as TransformStage;
            if (transforms.some(rule => rule.name === "rewriteText" && rule.stage === stage))
                throw new Error("Use one text rewrite block per stage");
            transforms.push({ stage, name: "rewriteText", rules: textRules = [] });
            current = undefined;
            continue;
        }
        const replace = /^  before (send|edit) (replace|rewrite-origin) ("(?:[^"\\]|\\.)*") with ("(?:[^"\\]|\\.)*")$/.exec(line);
        if (replace) {
            const stage = replace[1] as TransformStage;
            const name = replace[2] === "replace" ? "replaceLiteral" : "rewriteOrigin";
            let find = quoted(replace[3], 240);
            let replacement = quoted(replace[4], 240, true);
            if (name === "rewriteOrigin") {
                find = parseCxHttpsOrigin(find);
                replacement = parseCxHttpsOrigin(replacement);
                if (find === replacement) throw new Error("Use a different destination for link rewrites");
            }
            if (transforms.length >= 32 || transforms.some(rule => rule.stage === stage && rule.name === name && rule.find === find))
                throw new Error("Duplicate or too many replacement rules");
            transforms.push({ stage, name, find, replacement });
            current = undefined;
            continue;
        }
        const transform = /^  before (send|edit) ([a-zA-Z]+)( .+)?$/.exec(line);
        if (transform) {
            const stage = transform[1] as TransformStage;
            const name = transform[2] as keyof typeof messageTransforms;
            if (!Object.prototype.hasOwnProperty.call(messageTransforms, name) || transforms.some(entry => entry.name === name && entry.stage === stage))
                throw new Error("Unknown or duplicate outgoing text transform");
            if (transform[3] && name !== "capitalizeSentences" && name !== "signature" && name !== "polishWording")
                throw new Error("This transform takes no options");
            const options = transform[3] ? quoted(transform[3].trim(), 240) : undefined;
            if (name === "polishWording" && options?.split(",").some(option => !polishOptions.has(option.trim())))
                throw new Error("Unknown PolishWording option");
            transforms.push({ stage, name, options });
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
        const input = /^    input "([a-z][a-z0-9_-]{0,31})" (text|integer|boolean|choice|user|role)( "(?:[^"\\]|\\.)*")?( optional)?$/.exec(line);
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
        if (line === "    mark servers read" && current && !current.actions.length && !current.text && !current.inputs.length) {
            current.actions.push({ kind: "mark-read", message: "" });
            current = undefined;
            continue;
        }
        const invites = /^    (create|list|revoke) friend invites$/.exec(line);
        if (invites && current && !current.actions.length && !current.text && !current.inputs.length) {
            current.actions.push({ kind: "friend-invites", operation: invites[1] as CxFriendInviteAction });
            current = undefined;
            continue;
        }
        if (line === "    copy client diagnostics" && current && !current.actions.length && !current.text && !current.inputs.length) {
            current.actions.push({ kind: "copy-diagnostics" });
            current = undefined;
            continue;
        }
        const spoilers = /^    set upload spoilers "([a-z][a-z0-9_-]{0,31})"$/.exec(line);
        if (spoilers && uploadNaming && current && !current.actions.length && !current.text && current.inputs.length === 1
            && current.inputs[0].name === spoilers[1] && current.inputs[0].type === "boolean") {
            current.actions.push({ kind: "upload-spoilers", input: spoilers[1] });
            current = undefined;
            continue;
        }
        const lookup = /^    lookup ([a-z]+) "([a-z][a-z0-9_-]{0,31})"$/.exec(line);
        if (lookup && current && !current.actions.length && !current.text && current.inputs.length === 1
            && current.inputs[0].name === lookup[2] && current.inputs[0].type === "text" && current.inputs[0].required
            && Object.prototype.hasOwnProperty.call(cxExternalLookups, lookup[1])) {
            current.actions.push({ kind: "lookup", service: lookup[1] as CxExternalLookup, input: lookup[2] });
            current = undefined;
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
        const kind = action[1] as BasicAction["kind"];
        const message = quoted(action[2], 240);
        const fallback = action[3] === undefined ? undefined : quoted(action[3], 240);
        if (fallback && (kind === "toast" || fallback.includes('${'))) throw new Error("A command fallback must be literal reply text");
        if (sendsMessage({ kind, message }) && current.actions.some(sendsMessage)) {
            throw new Error("CX allows one outgoing message per command");
        }
        if (kind !== "toast") {
            const declaredInputs = current.inputs;
            const inputs = new Set(declaredInputs.map(input => input.name));
            if (current.text) inputs.add("text");
            const remaining = message.replace(textExpression, (expression, name: string, args: string | undefined) => {
                if (args === undefined) return inputs.has(name) ? "" : expression;
                const names = argumentNames(args);
                if (name === "avatar" && names.length === 1
                    && declaredInputs.some(input => input.name === names[0] && input.type === "user")) {
                    readsAvatar = true;
                    return "";
                }
                if (Object.prototype.hasOwnProperty.call(cxClientFunctions, name)) {
                    const service = cxClientFunctions[name as CxClientFunction];
                    const option = declaredInputs.find(input => input.name === names[0]);
                    if (names.length !== 1 || option?.type !== service.input
                        || (name === "roleMembers" && kind !== "reply")
                        || (name === "randomMember" && kind !== "send")) return expression;
                    clientPermissions.add(service.permission);
                    return "";
                }
                return Object.prototype.hasOwnProperty.call(textFunctions, name)
                    && textFunctions[name].length === names.length && names.every(name => inputs.has(name)) ? "" : expression;
            });
            if (remaining.includes('${')) throw new Error("CX messages only support declared inputs and named text functions");
        }
        current.actions.push({ kind, message, fallback });
    }
    if ((!commands.length && !transforms.length && !suppressReplyPing && !hiddenTargets.size && !styledTargets.size && !nativeEffects.size && !previousRule && !profileActions.size && !incoming.length && !uploadNaming) || commands.some(command => !command.actions.length))
        throw new Error("A plugin needs a command or a supported behavior");
    const required = new Set<CxPermission>();
    if (commands.length) required.add("commands.register");
    if (suppressReplyPing) required.add("replies.suppressping");
    if (hiddenTargets.size) required.add("appearance.hide");
    if (styledTargets.size) required.add("appearance.style");
    for (const effect of nativeEffects) required.add(cxNativeEffects[effect].permission);
    if (previousRule) required.add("messages.editprevious");
    if (profileActions.size) required.add("profilemenu.copy");
    if (readsAvatar) required.add("profile.avatar");
    if (uploadNaming) required.add("uploads.rename");
    for (const permission of clientPermissions) required.add(permission);
    for (const { kind } of incoming) required.add(incomingPermissions[kind]);
    for (const { stage, name } of transforms) {
        required.add(stage === "send" ? "messages.transform" : "messages.edit.transform");
        if (name === "rewriteOrigin") required.add("messages.redirectlinks");
    }
    if (transforms.some(rule => rule.name === "rewriteText" && !rule.rules.length)) throw new Error("A text rewrite block needs rules");
    for (const { actions } of commands) {
        for (const action of actions) {
            for (const permission of getActionPermissions(action)) required.add(permission);
            if ("fallback" in action && action.fallback) required.add("reply.local");
        }
    }
    if ([...required].some(permission => !permissions.has(permission)))
        throw new Error("Declare the permissions used by your commands");
    if ([...permissions].some(permission => !required.has(permission)))
        throw new Error("Remove unused CX permissions");
    return {
        kind: "plugin", name, commands, permissions: [...permissions], messageTransforms: transforms, suppressReplyPing,
        hiddenTargets: [...hiddenTargets], styledTargets: [...styledTargets], nativeEffects: [...nativeEffects], avatarResolution, uploadNaming, previousRule, profileActions: [...profileActions], incoming,
    };
}

export function reviewCx(source: string) {
    const document = parseCx(source);
    if (document.kind === "theme") return { kind: document.kind, name: document.name, permissions: [] as CxPermission[], effects: ["Change the app colors and background"] };
    return {
        kind: document.kind,
        name: document.name,
        permissions: document.permissions,
        effects: document.permissions.map(permission => permissionLabels[permission])
            .concat(document.profileActions.map(action => cxProfileMenuActions[action].label))
            .concat(document.hiddenTargets.map(target => "Hide " + cxAppearanceTargets[target].label))
            .concat(document.styledTargets.map(target => cxAppearanceTargets[target].label))
            .concat(document.nativeEffects.map(effect => cxNativeEffects[effect].label + (effect === "avatar-resolution" ? " (" + document.avatarResolution + " px)" : "")))
            .concat(document.uploadNaming ? ["Use " + document.uploadNaming.mode + " upload names " + (document.uploadNaming.manual ? "when selected for a file" : "by default")] : [])
            .concat(document.messageTransforms.flatMap(rule => rule.name === "rewriteOrigin" ? [rule.find + " → " + rule.replacement]
                : rule.name === "rewriteText" ? [`Apply ${rule.rules.length} text rules to message ${rule.stage}s and preserve links`] : []))
            .concat(document.incoming.flatMap(rule => {
                if (rule.kind === "reply-ping-default") return ["Turn reply pings off initially and keep the composer toggle available"];
                if (rule.kind === "hide-profile-themes") return ["Hide other users’ theme colors when their profiles load"];
                if (rule.kind === "hide-system") return ["Hide system messages for " + rule.values.join(", ")];
                if (rule.kind === "open-link") return [rule.link
                    ? "Open " + rule.link + " when a message contains “" + rule.values[0] + "”"
                    : "Edit the source to set the HTTPS destination"];
                if (rule.kind === "stickers" && rule.values[0] === "*") return ["Hide all stickers"];
                if (rule.kind === "follow-voice" && rule.values[0]) return ["Follow friend ID " + rule.values[0]];
                if (rule.values.length || ["reply-pings", "friends-voice", "friend-removals"].includes(rule.kind)) return [];
                return ["Edit the source to enter " + (rule.kind === "keywords" || rule.kind === "hide-keywords" ? "keywords" : "Discord IDs")];
            })),
        commands: document.commands.map(command => "/" + command.name),
    };
}

type Invocation = {
    text?: string;
    inputs?: Record<string, unknown>;
    sendRequested?: boolean;
    reply?: (message: string) => void;
    lookup?: (name: CxClientFunction, input: string) => string | undefined;
    markServersRead?: () => string;
    friendInvites?: (operation: CxFriendInviteAction) => Promise<string>;
    copyDiagnostics?: () => Promise<string>;
};
type CxHost = {
    registerCommand: (name: string, execute: (invocation?: Invocation) => string | undefined, acceptsText: boolean, sendsMessage: boolean, optionalSend: boolean, inputs: readonly CommandInput[]) => () => void;
    toast: (message: string) => void;
    getUserAvatarUrl?: (id?: string) => unknown;
    applyTheme: (theme: CxTheme) => () => void;
    registerMessageTransform?: (transform: (text: string) => string) => () => void;
    registerMessageEditTransform?: (transform: (text: string) => string) => () => void;
    registerReplyPingSuppression?: () => () => void;
    registerProfileMenuAction?: (action: CxProfileMenuAction) => () => void;
    hideAppearanceTarget?: (target: CxHideTarget) => () => void;
    styleAppearanceTarget?: (target: CxStyleTarget) => () => void;
    registerNativeEffect?: (effect: CxNativeEffect, avatarResolution?: CxAvatarResolution) => () => void;
    registerUploadAnonymiser?: (anonymiser: CxUploadAnonymiser) => () => void;
    registerPreviousMessageRule?: (rule: CxPreviousRule) => () => void;
    registerIncomingRules?: (rules: readonly IncomingRule[]) => () => void;
};

function getAvatarUrl(host: CxHost, grants: ReadonlySet<CxPermission>, id: string) {
    if (!grants.has("profile.avatar")) return;
    try {
        const url = host.getUserAvatarUrl?.(id || undefined);
        if (typeof url !== "string") return;
        const https = url.startsWith("//") ? "https:" + url : url;
        if (/^https:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\/(?:avatars\/\d{17,20}\/(?:a_)?[0-9a-f]{32}|embed\/avatars\/[0-5])\.(?:png|jpe?g|webp|gif)(?:\?[a-z0-9_=&-]{1,128})?$/i.test(https))
            return https;
    } catch { /* An unavailable user or icon module uses the local command fallback. */ }
}

/** Only trusted UI can grant access. The source never receives the host or a callback argument. */
export function activateCx(source: string, host: CxHost, approved: readonly CxPermission[]) {
    const document = parseCx(source);
    if (document.kind === "theme") return host.applyTheme(document);
    const grants = new Set(approved);
    if (!document.permissions.every(permission => grants.has(permission))) throw new Error("CX permission approval is required");

    const cleanups: (() => void)[] = [];
    const activeLookups = new Map<CxExternalLookup, AbortController>();
    let active = true;
    const uploadAnonymiser = document.uploadNaming && createCxUploadAnonymiser(document.uploadNaming);
    function stop() {
        active = false;
        for (const controller of activeLookups.values()) controller.abort();
        activeLookups.clear();
        for (const cleanup of cleanups.splice(0).reverse()) cleanup();
    }
    try {
        if (uploadAnonymiser) {
            if (!host.registerUploadAnonymiser) throw new Error("This client cannot anonymise uploads");
            cleanups.push(host.registerUploadAnonymiser(uploadAnonymiser));
        }
        if (document.incoming.length) {
            if (!host.registerIncomingRules) throw new Error("This client cannot run incoming rules");
            cleanups.push(host.registerIncomingRules(document.incoming));
        }
        for (const action of document.profileActions) {
            if (!host.registerProfileMenuAction) throw new Error("This client cannot add profile copy actions");
            cleanups.push(host.registerProfileMenuAction(action));
        }
        for (const target of document.hiddenTargets) {
            if (!host.hideAppearanceTarget) throw new Error("This client cannot hide " + cxAppearanceTargets[target].label);
            cleanups.push(host.hideAppearanceTarget(target));
        }
        for (const target of document.styledTargets) {
            if (!host.styleAppearanceTarget) throw new Error("This client cannot " + cxAppearanceTargets[target].label);
            cleanups.push(host.styleAppearanceTarget(target));
        }
        for (const effect of document.nativeEffects) {
            if (!host.registerNativeEffect) throw new Error("This client cannot apply " + cxNativeEffects[effect].label.toLowerCase());
            cleanups.push(host.registerNativeEffect(effect, effect === "avatar-resolution" ? document.avatarResolution : undefined));
        }
        if (document.suppressReplyPing) {
            if (!host.registerReplyPingSuppression) throw new Error("This client cannot suppress reply pings");
            cleanups.push(host.registerReplyPingSuppression());
        }
        if (document.previousRule) {
            if (!host.registerPreviousMessageRule) throw new Error("This client cannot edit previous messages");
            cleanups.push(host.registerPreviousMessageRule(document.previousRule));
        }
        for (const stage of ["send", "edit"] as const) {
            const transforms = document.messageTransforms.filter(transform => transform.stage === stage);
            if (!transforms.length) continue;
            const register = stage === "send" ? host.registerMessageTransform : host.registerMessageEditTransform;
            if (!register) throw new Error("This client cannot transform message " + stage + "s");
            const origins = new Map(transforms.flatMap(rule => rule.name === "rewriteOrigin" ? [[rule.find, rule.replacement] as const] : []));
            cleanups.push(register(text => {
                if (!active || text.length > 4000) return text;
                let result = text;
                let rewrote = false;
                for (const rule of transforms) {
                    if (rule.name === "rewriteOrigin") {
                        if (!rewrote) result = rewriteCxOrigin(result, origins);
                        rewrote = true;
                    } else if (rule.name === "rewriteText") result = applyCxTextRules(result, rule.rules);
                    else if (rule.name === "replaceLiteral") result = result.replaceAll(rule.find, () => rule.replacement);
                    else result = messageTransforms[rule.name](result, rule.options);
                    if (result.length > 4000) return text;
                }
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
                                : input.type === "user" || input.type === "role" ? isCxProfileUserId(value)
                                : input.type === "integer" ? /^-?\d+$/.test(serialized) && Number.isSafeInteger(Number(serialized))
                                : input.choices?.includes(serialized)
                    );
                    if (!valid && (input.required || value !== undefined)) return;
                    inputs.set(input.name, valid ? serialized : "");
                }
                let outgoing: string | undefined;
                for (const action of command.actions) {
                    if (!getActionPermissions(action).every(permission => grants.has(permission))) continue;
                    if (action.kind === "lookup") {
                        const reply = invocation?.reply;
                        if (!reply || activeLookups.has(action.service)) continue;
                        const controller = new AbortController();
                        activeLookups.set(action.service, controller);
                        const timer = setTimeout(() => controller.abort(), 8000);
                        void cxExternalLookups[action.service].run(inputs.get(action.input)!, controller.signal).then(
                            result => { if (active) reply(result); },
                            () => { if (active) reply("Couldn’t reach the lookup service. Try again."); },
                        ).finally(() => {
                            clearTimeout(timer);
                            activeLookups.delete(action.service);
                        });
                        continue;
                    }
                    if (action.kind === "friend-invites") {
                        const reply = invocation?.reply;
                        if (reply && invocation.friendInvites) {
                            void invocation.friendInvites(action.operation).then(
                                result => { if (active) reply(result); },
                                () => { if (active) reply("Friend invites failed. Try again."); },
                            );
                        }
                        continue;
                    }
                    if (action.kind === "copy-diagnostics") {
                        const reply = invocation?.reply;
                        if (reply && invocation.copyDiagnostics) {
                            void invocation.copyDiagnostics().then(
                                result => { if (active) reply(result); },
                                () => { if (active) reply("Couldn’t copy the diagnostic report."); },
                            );
                        }
                        continue;
                    }
                    if (action.kind === "mark-read") {
                        if (invocation?.reply && invocation.markServersRead) {
                            try { invocation.reply(invocation.markServersRead()); }
                            catch { invocation.reply("Couldn’t mark servers as read."); }
                        }
                        continue;
                    }
                    if (action.kind === "upload-spoilers") {
                        const value = inputs.get(action.input);
                        const enabled = uploadAnonymiser?.setSpoilers(value ? value === "true" : undefined);
                        invocation?.reply?.(enabled ? "Upload spoilers enabled." : "Upload spoilers disabled.");
                        continue;
                    }
                    if (action.kind === "toast") {
                        host.toast(action.message);
                        continue;
                    }
                    let invalid = false;
                    const message = action.choices ? chooseOne(action.choices)! : action.message.replace(textExpression, (_, name: string, args: string | undefined) => {
                        const values = args === undefined ? [] : argumentNames(args).map(input => inputs.get(input)!);
                        let value: string | undefined;
                        if (args === undefined) value = inputs.get(name);
                        else if (name === "avatar") value = getAvatarUrl(host, grants, values[0]);
                        else if (Object.prototype.hasOwnProperty.call(cxClientFunctions, name)) {
                            const service = name as CxClientFunction;
                            if (grants.has(cxClientFunctions[service].permission)) {
                                try { value = invocation?.lookup?.(service, values[0]); } catch { /* Use the local fallback. */ }
                            }
                        } else value = textFunctions[name](...values);
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

export function runCxIncomingRules(rules: readonly IncomingRule[], payload: IncomingPayload, context: Parameters<typeof applyIncomingRule>[2]) {
    let patch: Partial<IncomingPayload> | undefined;
    for (const rule of rules) {
        const result = applyIncomingRule(rule, patch ? { ...payload, ...patch } : payload, context);
        if (result === false) return false as const;
        if (result) patch = { ...patch, ...result };
    }
    return patch;
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
