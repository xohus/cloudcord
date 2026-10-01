import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    nitro: { type: OptionType.BOOLEAN, description: "Dismiss Nitro promotions", default: false },
    quests: { type: OptionType.BOOLEAN, description: "Dismiss quest promotions", default: false },
    changelog: { type: OptionType.BOOLEAN, description: "Dismiss Discord What's New popups", default: false },
    shop: { type: OptionType.BOOLEAN, description: "Dismiss shop and avatar-decoration promotions", default: false },
    tips: { type: OptionType.BOOLEAN, description: "Dismiss getting-started tips", default: false },
    customTitles: { type: OptionType.STRING, description: "Additional popup titles to dismiss (exact titles, one per line)", default: "" }
});

const protectedTitle = /security|password|log.?in|sign.?in|authentication|verification|verify|two.factor|2fa|error|warning|payment|purchase|checkout|delete|report|ban|permission|authorize/i;
const rules = {
    nitro: /\bnitro\b/i,
    quests: /\bquests?\b/i,
    changelog: /^(what[’']?s new|discord updates?|changelog)$/i,
    shop: /^(check out the shop|new in the shop|discover.*decorations|customize your avatar)$/i,
    tips: /^(getting started|welcome to discord|try.*new feature|discord tips)$/i
};
let observer: MutationObserver | undefined;
let queued = false;
const handled = new WeakSet<Element>();

function inspectPopups() {
    for (const dialog of document.querySelectorAll('[role="dialog"], [role="alertdialog"]')) {
        if (handled.has(dialog) || !dialog.getClientRects().length) continue;
        const labelledBy = dialog.getAttribute("aria-labelledby");
        const title = (labelledBy ? labelledBy.split(/\s+/).map(id => document.getElementById(id)?.textContent || "").join(" ") : dialog.querySelector("h1,h2,[role=heading]")?.textContent || dialog.getAttribute("aria-label") || "").trim();
        if (!title || protectedTitle.test(title)) continue;
        // Never dismiss account/security/error forms, even under a promo title.
        if (dialog.querySelector('input[type="password"], input[type="email"], input[autocomplete="one-time-code"], [role="alert"]')) continue;
        const custom = settings.store.customTitles.split(/\r?\n/).map(s => s.trim().toLowerCase()).filter(Boolean);
        const block = custom.includes(title.toLowerCase()) || Object.entries(rules).some(([key, pattern]) => settings.store[key as keyof typeof rules] && pattern.test(title));
        if (!block) continue;
        const close = dialog.querySelector<HTMLButtonElement>('button[aria-label="Close"], button[aria-label="Dismiss"], button[title="Close"]');
        if (close && !close.disabled) { handled.add(dialog); close.click(); }
    }
}

export default definePlugin({
    name: "CloudCordPopupBlocker",
    description: "Choose which promotional popups to dismiss. Account, security and error dialogs stay visible. English titles; other languages can use exact custom titles.",
    authors: [Devs.Xohus],
    settings,
    start() {
        observer = new MutationObserver(() => {
            if (queued) return;
            queued = true;
            queueMicrotask(() => { queued = false; if (observer) inspectPopups(); });
        });
        observer.observe(document.body, { subtree: true, childList: true });
        inspectPopups();
    },
    stop() { observer?.disconnect(); observer = undefined; }
});
