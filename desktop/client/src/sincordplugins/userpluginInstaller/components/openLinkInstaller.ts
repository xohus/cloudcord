import { Native } from "..";
import { CLONE_LINK_REGEX } from "../misc/constants";

export function openLinkInstaller() {
    const existing = document.getElementById("cloudcord-link-installer") as HTMLDialogElement | null;
    if (existing) { existing.querySelector<HTMLInputElement>("input")?.focus(); return; }
    // Native top-layer dialog and input: no Discord Modal/TextInput lookup or
    // React focus-lock container between the user and the editable field.
    const dialog = document.createElement("dialog");
    dialog.id = "cloudcord-link-installer";
    dialog.setAttribute("aria-label", "add plugin from link");
    Object.assign(dialog.style, { width: "min(560px, 85vw)", padding: "24px", border: "1px solid #444", borderRadius: "16px", background: "#202024", color: "#f2f3f5", pointerEvents: "auto" });
    const heading = document.createElement("h2"); heading.textContent = "add plugin from link";
    const info = document.createElement("p"); info.textContent = "paste a git repo or https plugin folder link. only install code from people you trust.";
    const input = document.createElement("input"); input.type = "text"; input.placeholder = "https://getcloudcord.com/desktop-plugins/popup-blocker/"; input.autocomplete = "off"; input.spellcheck = false; input.setAttribute("aria-label", "plugin link");
    Object.assign(input.style, { width: "100%", boxSizing: "border-box", padding: "12px", border: "1px solid #666", borderRadius: "8px", background: "#111115", color: "white", userSelect: "text", pointerEvents: "auto", fontSize: "16px" });
    const status = document.createElement("p"); status.setAttribute("role", "status");
    const install = document.createElement("button"); install.textContent = "install";
    const close = document.createElement("button"); close.textContent = "close";
    for (const button of [install, close]) Object.assign(button.style, { marginTop: "16px", marginRight: "12px", padding: "10px 16px", border: "0", borderRadius: "8px", background: "#5865f2", color: "white", cursor: "pointer" });
    close.onclick = () => dialog.close();
    dialog.addEventListener("close", () => dialog.remove(), { once: true });
    let busy = false;
    async function submit() {
        if (busy) return;
        const link = input.value.trim();
        try {
            const url = new URL(link);
            if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("paste an https plugin link");
            if (!Native) throw new Error("restart discord to load the plugin installer");
            busy = true; install.disabled = true; status.textContent = "installing...";
            const git = link.match(CLONE_LINK_REGEX);
            if (git && git[0] === link) {
                const n = git.includes("plugins.nin0.dev") ? 1 : 0;
                await Native.initPluginInstall(git[0], git[[1, 4][n]], git[[2, 5][n]], git[[3, 6][n]]);
            } else await Native.initOfficialPluginInstall(link);
            status.textContent = "installed. restart discord, then enable the plugin in settings.";
        } catch (error) { status.textContent = String(error).includes("silentStop") ? "cancelled" : `couldnt install it: ${String(error).slice(0, 350)}`; }
        finally { busy = false; install.disabled = false; }
    }
    install.onclick = () => void submit();
    input.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); void submit(); } });
    dialog.append(heading, info, input, status, install, close);
    document.body.append(dialog);
    dialog.showModal(); input.focus();
}
