import { localStorage } from "@utils/localStorage";

const KEY = "CloudCord_realProfileUsers";
const users = new Set<string>();
try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (Array.isArray(saved)) for (const id of saved) if (typeof id === "string" && /^\d{15,22}$/.test(id)) users.add(id);
} catch {}

export function isRealProfileView(userId: string): boolean {
    return users.has(userId);
}

export function setRealProfileView(userId: string, enabled: boolean) {
    if (!/^\d{15,22}$/.test(userId)) return;
    if (enabled) users.add(userId); else users.delete(userId);
    try { localStorage.setItem(KEY, JSON.stringify([...users])); } catch {}
}
