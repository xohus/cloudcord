export const cxProfileMenuActions = {
    "user-url": { label: "Copy User URL", scope: "none", format: (id: string) => "<https://discord.com/users/" + id + ">" },
    "user-mention": { label: "Copy User Mention", scope: "none", format: (id: string) => "<@" + id + ">" },
    "profile-colors": { label: "Copy Profile Colors", scope: "user" },
    "server-profile-colors": { label: "Copy Server Profile Colors", scope: "server" },
} as const;

export type CxProfileMenuAction = keyof typeof cxProfileMenuActions;

export function isCxProfileUserId(id: unknown): id is string {
    return typeof id === "string" && /^\d{17,20}$/.test(id);
}

type ProfileStore = {
    getUserProfile?: (id: string) => { themeColors?: unknown; } | null | undefined;
    getGuildMemberProfile?: (id: string, guildId: string) => { themeColors?: unknown; } | null | undefined;
};

export function getCxProfileMenuCopy(action: CxProfileMenuAction, id: string, profiles?: ProfileStore, guildId?: string) {
    const entry = cxProfileMenuActions[action];
    if (entry.scope === "none") return entry.format(id);
    if (entry.scope === "server" && !guildId) return;
    try {
        const profile = entry.scope === "server"
            ? profiles?.getGuildMemberProfile?.(id, guildId!) : profiles?.getUserProfile?.(id);
        const colors = profile?.themeColors;
        if (!Array.isArray(colors) || colors.length < 2) return;
        const hex = colors.slice(0, 2).map(color =>
            Number.isInteger(color) && color >= 0 && color <= 0xffffff ? "#" + color.toString(16).padStart(6, "0") : undefined
        );
        if (hex[0] && hex[1]) return "Primary-color " + hex[0] + ", Secondary-Color " + hex[1];
    } catch { /* The requested profile is not available locally. */ }
}
