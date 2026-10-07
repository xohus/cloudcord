// Stable badge keys keep layout identical across desktop, browser and mobile.
export function badgeLayoutKey(badge: any): string {
    let id = String(badge?.id || "");
    if (id.startsWith("cloudcord-official-") || id.startsWith("cloudcord-custom-")) return id;
    id = id.replace(/^(?:sp_|fakeprofile-|cloudcord-shared-)/, "");
    const aliases: Record<string, string> = {
        bh1: "bug1", bug_hunter_level_1: "bug1", bug_hunter: "bug1",
        bh2: "bug2", bug_hunter_level_2: "bug2", golden_bug_hunter: "bug2",
        dev: "vdev", verified_developer: "vdev", verified_bot_developer: "vdev", early_verified_developer: "vdev",
        activedev: "active", active_developer: "active", mod: "mod", certified_moderator: "mod",
        moderator_programs_alumni: "mod", partner: "partner", partnered_server_owner: "partner",
        discord_staff: "staff", hypesquad_house_1: "bravery", hypesquad_online_house_1: "bravery",
        hypesquad_house_2: "brilliance", hypesquad_online_house_2: "brilliance",
        hypesquad_house_3: "balance", hypesquad_online_house_3: "balance",
        early: "early", early_supporter: "early", premium_early_supporter: "early",
        legacy_username: "oldname", originally_known_as: "oldname", quest_completed: "quest",
        completed_a_quest: "quest", orbs_apprentice: "orbs"
    };
    if (aliases[id]) return aliases[id];
    if (/^(?:premium_tenure_|nitro)/.test(id) || id === "premium") return "nitro";
    if (/^(?:premium_guild_subscriber|guild_booster|boost)/.test(id)) return "boost";
    if (/^(?:gifting|premium_gifting)/.test(id)) return "gifting";
    return id;
}

export function applyBadgeLayout<T>(badges: T[], layout: { hiddenBadgeIds?: string[]; badgeOrder?: string[] } | null | undefined): T[] {
    if (!layout) return badges;
    const hidden = new Set(Array.isArray(layout.hiddenBadgeIds) ? layout.hiddenBadgeIds.filter(id => typeof id === "string") : []);
    const order = Array.isArray(layout.badgeOrder) ? layout.badgeOrder.filter(id => typeof id === "string") : [];
    const rank = new Map<string, number>();
    order.forEach((id, index) => { if (!rank.has(id)) rank.set(id, index); });
    return badges.map((badge, index) => ({ badge, index, key: badgeLayoutKey(badge) }))
        .filter(item => !hidden.has(item.key))
        .sort((a, b) => (rank.get(a.key) ?? order.length) - (rank.get(b.key) ?? order.length) || a.index - b.index)
        .map(item => item.badge);
}

export function moveBadgeOrder(keys: string[], key: string, direction: -1 | 1): string[] {
    const order = [...new Set(keys)];
    const from = order.indexOf(key);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= order.length) return order;
    [order[from], order[to]] = [order[to], order[from]];
    return order;
}

export function defaultBadgeOrder(nativeBadges: any[] = []): string[] {
    const nativeKeys = nativeBadges.filter(badge => !/^(?:sp_|fakeprofile-|cloudcord-)/.test(String(badge?.id || ""))).map(badgeLayoutKey);
    return [...new Set([...nativeKeys, "nitro", "gifting", "boost", "staff", "partner", "hypesquad",
        "bug1", "bravery", "brilliance", "balance", "early", "bug2", "vdev", "mod", "active", "quest", "orbs", "oldname"])];
}
