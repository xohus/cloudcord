import { ApplicationCommandInputType, ApplicationCommandOptionType, commands, findOption, registerCommand, sendBotMessage, unregisterCommand, type VencordCommand } from "@api/Commands";
import { addMessagePreSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { showNotification } from "@api/Notifications";
import { createCxSession, MAX_CX_SOURCE, reviewCx } from "@utils/cx";
import { cxCatalog } from "@utils/cxCatalog";
import definePlugin from "@utils/types";
import { useState } from "@webpack/common";

const session = createCxSession();

export function CxSettings() {
    const [source, setSource] = useState("");
    const [search, setSearch] = useState("");
    const [pages, setPages] = useState({ Plugins: 0, Themes: 0 });
    const [candidate, setCandidate] = useState<{ source: string; review: ReturnType<typeof reviewCx>; }>();
    const [status, setStatus] = useState("");
    const searchText = search.trim().toLowerCase();

    function review(next: string) {
        setCandidate(undefined);
        try {
            setCandidate({ source: next, review: reviewCx(next) });
            setStatus("");
        } catch (error) {
            setStatus(String(error instanceof Error ? error.message : error));
        }
    }

    function enable() {
        if (!candidate) return;
        try {
            session.enable(candidate.source, {
                registerMessageTransform(transform) {
                    const listener = addMessagePreSendListener((_, message) => {
                        if (typeof message.content === "string") message.content = transform(message.content);
                    });
                    return () => { removeMessagePreSendListener(listener); };
                },
                registerCommand(name, execute, acceptsText, sendsMessage, optionalSend) {
                    if (Object.prototype.hasOwnProperty.call(commands, name) || name in Object.prototype)
                        throw new Error(`Command /${name} already exists`);
                    const command: VencordCommand = {
                        name,
                        description: "Local CX command",
                        inputType: sendsMessage ? ApplicationCommandInputType.BUILT_IN_TEXT : ApplicationCommandInputType.BUILT_IN,
                        options: [
                            ...(acceptsText ? [{ name: "text", description: "Text to use", type: ApplicationCommandOptionType.STRING, required: true }] : []),
                            ...(optionalSend ? [{ name: "send", description: "Send the result to this chat", type: ApplicationCommandOptionType.BOOLEAN }] : []),
                        ],
                        execute(args, context) {
                            const outgoing = execute({
                                text: acceptsText ? findOption(args, "text", "") : undefined,
                                sendRequested: optionalSend && findOption<boolean>(args, "send") === true,
                                reply: message => { if (context.channel?.id) sendBotMessage(context.channel.id, { content: message }); },
                            });
                            if (outgoing !== undefined) return { content: outgoing };
                        },
                    };
                    registerCommand(command, "CxExtensions");
                    if (commands[name] !== command) throw new Error("Discord commands are not ready yet");
                    return () => { if (commands[name] === command) unregisterCommand(name); };
                },
                toast: body => { void showNotification({ title: candidate.review.name, body }); },
                applyTheme(theme) {
                    const style = document.createElement("style");
                    const surface = theme.surface ?? theme.background;
                    const sidebar = theme.sidebar ?? surface;
                    const shade = Math.round((1 - (theme.wallpaperOpacity ?? 1)) * 255).toString(16).padStart(2, "0");
                    const tint = theme.background + shade;
                    style.textContent = `
                        .theme-dark, .theme-light {
                            ${theme.mode ? `color-scheme: ${theme.mode};` : ""}
                            --background-primary: ${theme.background};
                            --background-secondary: ${surface};
                            --background-tertiary: ${sidebar};
                            --background-base-lowest: ${sidebar};
                            --background-base-lower: ${surface};
                            --background-base-low: ${theme.background};
                            --bg-base-primary: ${theme.background};
                            --chat-background-default: ${theme.background};
                            ${theme.text ? `--text-normal: ${theme.text}; --text-primary: ${theme.text}; --text-default: ${theme.text}; --text-strong: ${theme.text};` : ""}
                            ${theme.muted ? `--text-muted: ${theme.muted}; --text-secondary: ${theme.muted}; --text-subtle: ${theme.muted};` : ""}
                            ${theme.accent ? `--brand-500: ${theme.accent}; --text-link: ${theme.accent};` : ""}
                        }
                        ${theme.wallpaper ? `
                            [class^="chatContent_"] {
                                background: linear-gradient(${tint}, ${tint}), ${theme.background} url("${theme.wallpaper}") center / cover no-repeat;
                            }
                            [class^="chatContent_"] [class^="messagesWrapper_"] { background: transparent; }
                        ` : ""}
                    `;
                    document.head.append(style);
                    return () => style.remove();
                },
            }, candidate.review.permissions);
            setStatus(`${candidate.review.name} is active for this session.`);
            setCandidate(undefined);
        } catch (error) {
            setStatus(String(error instanceof Error ? error.message : error));
        }
    }

    return <section style={{ display: "grid", gap: 12 }}>
        <h2>CX Extensions</h2>
        <details>
            <summary>CX catalog · {cxCatalog.plugins.length} plugins · {cxCatalog.themes.length} themes</summary>
            <input aria-label="Search CX catalog" placeholder="Search CX catalog" value={search} onChange={event => {
                setSearch(event.currentTarget.value);
                setPages({ Plugins: 0, Themes: 0 });
            }} />
            {([["Plugins", cxCatalog.plugins], ["Themes", cxCatalog.themes]] as const).map(([kind, entries]) => {
                const matches = entries.filter(entry => entry.name.toLowerCase().includes(searchText));
                const page = pages[kind];
                const start = page * 12;
                return <div key={kind}>
                    <h3>{kind}</h3>
                    {matches.slice(start, start + 12).map(entry => <button key={entry.name} onClick={() => {
                        setSource(entry.source);
                        review(entry.source);
                    }}>{entry.name}</button>)}
                    {page > 0 && <button onClick={() => setPages({ ...pages, [kind]: page - 1 })}>{`Previous ${kind.toLowerCase()} page`}</button>}
                    {start + 12 < matches.length && <button onClick={() => setPages({ ...pages, [kind]: page + 1 })}>{`Next ${kind.toLowerCase()} page`}</button>}
                    {!matches.length && <p>No matches</p>}
                </div>;
            })}
        </details>
        <label>
            Open a .cx file
            <input type="file" accept=".cx" onChange={async event => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (!file) return;
                setCandidate(undefined);
                if (!/\.cx$/i.test(file.name) || file.size > MAX_CX_SOURCE) {
                    setStatus("Choose a .cx file under 512 KB.");
                    return;
                }
                try {
                    const next = await file.text();
                    setSource(next);
                    review(next);
                } catch {
                    setStatus("Could not read the CX file.");
                }
            }} />
        </label>
        <textarea aria-label="CX source" value={source} maxLength={MAX_CX_SOURCE} rows={8} style={{
            background: "var(--background-secondary, #2b2d31)", color: "var(--text-normal, #f2f3f5)", padding: 12, fontFamily: "monospace",
        }} onChange={event => {
            setCandidate(undefined);
            setSource(event.currentTarget.value);
        }} />
        <button onClick={() => review(source)}>Review CX</button>
        {candidate && <div>
            <strong>{candidate.review.name}</strong>
            <ul>{candidate.review.effects.map(effect => <li key={effect}>{effect}</li>)}</ul>
            {candidate.review.commands && <p>{candidate.review.commands.join(", ")}</p>}
            <button onClick={enable}>Allow for this session</button>
        </div>}
        {session.list().map(({ id, name }) => <button key={id} onClick={() => {
            session.disable(id);
            setStatus(`${name} disabled.`);
        }}>Disable {name}</button>)}
        <p role="status">{status}</p>
    </section>;
}

export default definePlugin({
    name: "CxExtensions",
    description: "Review and run permission-scoped CX plugins and themes.",
    authors: [{ name: "CloudCord", id: 0n }],
    required: true,
    dependencies: ["CommandsAPI", "MessageEventsAPI"],
    stop() {
        session.clear();
    },
});
