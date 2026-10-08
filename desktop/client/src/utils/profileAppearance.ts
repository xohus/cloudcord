export type ProfileAppearance = {
    displayNameStyles?: { fontId: number; effectId: number; colors: number[] } | null;
    serverTag?: { tag: string; guildId: string; badge: string } | null;
};

export function serverTagIconURL(tag: ProfileAppearance["serverTag"]): string {
    if (!tag?.badge || !/^\d{15,22}$/.test(tag.guildId) || !/^[a-f0-9]{32}$/.test(tag.badge)) return "";
    return `https://cdn.discordapp.com/guild-tag-badges/${tag.guildId}/${tag.badge}.png?size=64`;
}

export function parseServerTagIcon(value: string): { guildId: string; badge: string } | null {
    try {
        const url = new URL(value);
        const match = url.pathname.match(/^\/guild-tag-badges\/(\d{15,22})\/([a-f0-9]{32})\.(?:png|webp|jpe?g)$/);
        return url.protocol === "https:" && url.hostname === "cdn.discordapp.com" && match ? { guildId: match[1], badge: match[2] } : null;
    } catch { return null; }
}

export function availableServerTags(users: any): NonNullable<ProfileAppearance["serverTag"]>[] {
    const tags = new Map<string, NonNullable<ProfileAppearance["serverTag"]>>();
    for (const user of Object.values(users || {}) as any[]) {
        const native = user?.primaryGuild || user?.primary_guild;
        const tag = normalizeProfileAppearance({ serverTag: { tag: native?.tag, guildId: native?.identityGuildId || native?.identity_guild_id, badge: native?.badge || "" } }).serverTag;
        if (tag?.badge) tags.set(`${tag.guildId}:${tag.badge}`, tag);
    }
    return [...tags.values()].sort((a, b) => a.tag.localeCompare(b.tag));
}

export function appearanceOptions(values: any): { value: number; label: string }[] {
    if (!values || typeof values !== "object") return [];
    return Object.entries(values).filter(([, value]) => Number.isInteger(value) && Number(value) >= 0)
        .map(([key, value]) => ({ value: Number(value), label: key.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, char => char.toUpperCase()) }))
        .filter((option, index, all) => all.findIndex(other => other.value === option.value) === index)
        .sort((a, b) => a.value - b.value);
}

export function normalizeProfileAppearance(data: any): ProfileAppearance {
    const result: ProfileAppearance = {};
    if (data?.displayNameStyles === null) result.displayNameStyles = null;
    else if (data?.displayNameStyles && typeof data.displayNameStyles === "object") {
        const style = data.displayNameStyles;
        const fontId = style.fontId ?? style.font_id;
        const effectId = style.effectId ?? style.effect_id;
        const colors = Array.isArray(style.colors) ? style.colors : [];
        if (Number.isInteger(fontId) && fontId >= 0 && Number.isInteger(effectId) && effectId >= 0
            && colors.length <= 3 && colors.every((color: any) => Number.isInteger(color) && color >= 0 && color <= 0xffffff)) {
            result.displayNameStyles = { fontId, effectId, colors: [...colors] };
        }
    }
    if (data?.serverTag === null) result.serverTag = null;
    else if (data?.serverTag && typeof data.serverTag === "object") {
        const { tag, guildId, badge } = data.serverTag;
        if (typeof tag === "string" && Array.from(tag.trim()).length >= 1 && Array.from(tag.trim()).length <= 4
            && typeof guildId === "string" && /^\d{15,22}$/.test(guildId)
            && typeof badge === "string" && (badge === "" || /^[a-f0-9]{32}$/.test(badge))) {
            result.serverTag = { tag: tag.trim(), guildId, badge };
        }
    }
    return result;
}

export function nativeProfileAppearance(data: any): Record<string, any> {
    const appearance = normalizeProfileAppearance(data);
    const result: Record<string, any> = {};
    if (appearance.displayNameStyles !== undefined) {
        const style = appearance.displayNameStyles;
        result.displayNameStyles = style ? { ...style, font_id: style.fontId, effect_id: style.effectId } : null;
        result.display_name_styles = result.displayNameStyles;
    }
    if (appearance.serverTag !== undefined) {
        const tag = appearance.serverTag;
        result.primaryGuild = tag ? {
            identityEnabled: true, identityGuildId: tag.guildId, tag: tag.tag, badge: tag.badge || null,
            identity_enabled: true, identity_guild_id: tag.guildId,
        } : null;
        result.primary_guild = result.primaryGuild;
    }
    return result;
}
