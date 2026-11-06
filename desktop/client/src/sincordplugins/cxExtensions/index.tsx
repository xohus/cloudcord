import { commands, registerCommand, unregisterCommand } from "@api/Commands";
import { showNotification } from "@api/Notifications";
import { createCxSession, MAX_CX_SOURCE, reviewCx } from "@utils/cx";
import definePlugin from "@utils/types";
import { useState } from "@webpack/common";

const session = createCxSession();

function CxSettings() {
    const [source, setSource] = useState("");
    const [candidate, setCandidate] = useState<{ source: string; review: ReturnType<typeof reviewCx>; }>();
    const [status, setStatus] = useState("");

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
                registerCommand(name, execute) {
                    if (Object.prototype.hasOwnProperty.call(commands, name) || name in Object.prototype)
                        throw new Error(`Command /${name} already exists`);
                    const command = { name, description: "Local CX command", execute };
                    registerCommand(command, "CxExtensions");
                    if (commands[name] !== command) throw new Error("Discord commands are not ready yet");
                    return () => { if (commands[name] === command) unregisterCommand(name); };
                },
                toast: body => { void showNotification({ title: candidate.review.name, body }); },
                applyTheme(theme) {
                    const style = document.createElement("style");
                    style.textContent = `
                        .theme-dark, .theme-light {
                            --background-primary: ${theme.background};
                            --background-secondary: ${theme.background};
                            --background-tertiary: ${theme.background};
                            --background-base-lowest: ${theme.background};
                            --background-base-lower: ${theme.background};
                            --background-base-low: ${theme.background};
                            --bg-base-primary: ${theme.background};
                            ${theme.accent ? `--brand-500: ${theme.accent}; --text-link: ${theme.accent};` : ""}
                        }
                        ${theme.wallpaper ? `
                            [class^="chatContent_"] {
                                background: ${theme.background} url("${theme.wallpaper}") center / cover no-repeat;
                            }
                            [class^="chatContent_"] [class^="messagesWrapper_"] { background: transparent; }
                        ` : ""}
                    `;
                    document.head.append(style);
                    return () => style.remove();
                },
            }, ["commands.register", "ui.toast"]);
            setStatus(`${candidate.review.name} is active for this session.`);
            setCandidate(undefined);
        } catch (error) {
            setStatus(String(error instanceof Error ? error.message : error));
        }
    }

    return <section style={{ display: "grid", gap: 12 }}>
        <h2>CX Extensions</h2>
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
        <textarea aria-label="CX source" value={source} maxLength={MAX_CX_SOURCE} rows={8} onChange={event => {
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
    dependencies: ["CommandsAPI"],
    section: {
        key: "cloudcord_cx",
        title: "CX Extensions",
        panelTitle: "CX Extensions",
        Component: CxSettings,
        Icon: () => null,
    },
    stop() {
        session.clear();
    },
});
