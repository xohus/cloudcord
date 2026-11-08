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

export function getCxProfileMedia(id: string, user: { avatar?: unknown; discriminator?: string; username?: string; }, banner: unknown) {
    if (!isCxProfileUserId(id)) return [];
    const name = user.username?.replace(/[^\w.-]+/g, "_").slice(0, 64) || id;
    const assets: { kind: "Avatar" | "Banner"; url: string; filename: string; animated: boolean; }[] = [];
    if (!user.avatar) {
        const legacy = user.discriminator && /^[0-9]{4}$/.test(user.discriminator) && Number(user.discriminator);
        const index = legacy ? legacy % 5 : Number((BigInt(id) >> 22n) % 6n);
        assets.push({ kind: "Avatar", url: "https://cdn.discordapp.com/embed/avatars/" + index + ".png", filename: "avatar_" + name + ".png", animated: false });
    }
    for (const [kind, path, hash] of [["Avatar", "avatars", user.avatar], ["Banner", "banners", banner]] as const) {
        if (typeof hash !== "string" || !/^(?:a_)?[0-9a-f]{32}$/.test(hash)) continue;
        const animated = hash.startsWith("a_");
        const extension = animated ? "gif" : "png";
        assets.push({
            kind, animated, filename: kind.toLowerCase() + "_" + name + "." + extension,
            url: "https://cdn.discordapp.com/" + path + "/" + id + "/" + hash + "." + extension + "?size=4096",
        });
    }
    return assets;
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
