export type ProfileAppearance = {
    displayNameStyles?: { fontId: number; effectId: number; colors: number[] } | null;
    serverTag?: { tag: string; guildId: string; badge: string } | null;
    customFriends?: CustomFriendPreview[];
    customConnections?: CustomConnectionPreview[];
};

/** Shared presentation records. Never insert these into Discord's relationship or OAuth stores. */
export type CustomFriendPreview = {
    id: string; userId?: string; username: string; displayName: string;
    avatar: string; banner: string; bio: string;
    badges: { name: string; icon: string }[];
};

export type CustomConnectionPreview = {
    id: string; service: "steam" | "youtube" | "roblox" | "twitch" | "github" | "spotify" | "x" | "reddit" | "other";
    accountId: string; username: string; displayName: string;
    avatar: string; banner: string; bio: string; url: string;
    details: { label: string; value: string }[];
    items?: { id: string; title: string; image: string; url: string; subtitle: string }[];
    mode?: "manual" | "fetched";
    fetchedAt?: string;
};

/** Apply a lookup only to the same surviving entry; edits made while fetching win. */
export function mergeCustomSocialLookup(before: CustomFriendPreview | CustomConnectionPreview, current: CustomFriendPreview | CustomConnectionPreview | undefined, incoming: Partial<CustomFriendPreview | CustomConnectionPreview>): CustomFriendPreview | CustomConnectionPreview | null {
    if (!current || before.id !== current.id || ("service" in before ? before.service : before.userId) !== ("service" in current ? current.service : current.userId)) return null;
    const merged = { ...current };
    let edited = false;
    for (const key of Object.keys(incoming)) {
        if (key === "id") continue;
        if (JSON.stringify((before as any)[key]) === JSON.stringify((current as any)[key])) (merged as any)[key] = (incoming as any)[key];
        else edited = true;
    }
    if (edited && "service" in merged) { merged.mode = "manual"; merged.fetchedAt = ""; }
    return merged;
}

async function publicConnectionRequest(route: "lookup" | "search", service: string, query: string): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
        const response = await fetch(`https://getcloudcord.com/v1/custom-connections/${route}?service=${encodeURIComponent(service)}&query=${encodeURIComponent(query)}`, {signal:controller.signal});
        let payload: any;
        try { payload = await response.json(); }
        catch { throw new Error("The public service returned an unreadable response. Try again or customize manually."); }
        if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error.slice(0,300) : "Public information is unavailable. Customize manually or try later.");
        if (route === "search" ? !Array.isArray(payload?.result) : !payload?.result || typeof payload.result !== "object" || Array.isArray(payload.result)) {
            throw new Error("The public service returned incomplete information. Try again or customize manually.");
        }
        return payload?.result;
    } catch (error) {
        if (controller.signal.aborted) throw new Error("The public lookup timed out. Your entry was kept; try again or customize manually.");
        if (error instanceof TypeError) throw new Error("Could not reach the public service. Check your connection or customize manually.");
        throw error;
    } finally { clearTimeout(timer); }
}

export async function fetchConnectionPreview(service: CustomConnectionPreview["service"], query: string): Promise<CustomConnectionPreview> {
    const data = await publicConnectionRequest("lookup", service, query);
    const normalized = normalizeCustomSocial({customConnections:[{...data,id:"fetched-preview",service}]}).customConnections?.[0];
    if (!normalized) throw new Error("The service did not return usable public account information.");
    return normalized;
}

export async function searchConnectionItems(service: CustomConnectionPreview["service"], query: string): Promise<NonNullable<CustomConnectionPreview["items"]>> {
    const data = await publicConnectionRequest("search", service, query);
    return normalizeCustomSocial({customConnections:[{id:"search",service,username:"Search",items:data}]}).customConnections?.[0]?.items || [];
}

const textField = (value: unknown, maximum: number) => typeof value === "string" ? value.trim().slice(0, maximum) : "";

export function customPreviewUsername(value: string): string {
    const name = textField(value, 100).replace(/^@+/, "");
    return name ? `@${name}` : "";
}

export function customPreviewURL(value: unknown): string {
    if (typeof value !== "string" || value.length > 2048) return "";
    try {
        const url = new URL(value);
        // No executable schemes or embedded credentials in shared links/media.
        return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
    } catch { return ""; }
}

export function customDiscordMediaURL(kind: "avatars" | "banners", userId: string, hash: unknown): string {
    if (!/^\d{15,22}$/.test(userId) || typeof hash !== "string" || !/^(?:a_)?[a-f0-9]{32}$/.test(hash)) return "";
    return `https://cdn.discordapp.com/${kind}/${userId}/${hash}.${hash.startsWith("a_") ? "gif" : "png"}?size=512`;
}

/** Drafts stay editable locally, but invalid entries must not disappear silently on sharing. */
export function customConnectionServiceName(service: string): string {
    const names: Record<string, string> = {steam:"Steam",youtube:"YouTube",roblox:"Roblox",github:"GitHub",twitch:"Twitch",spotify:"Spotify",x:"X",reddit:"Reddit",other:"Other"};
    return names[service] || "Other";
}

export function customSocialValidationErrors(data: ProfileAppearance): string[] {
    const errors: string[] = [];
    const retiredFriends: CustomFriendPreview[] = [];
    for (const [kind, entries] of [["friend", retiredFriends], ["connection", data?.customConnections]] as const) {
        if (!entries) continue;
        if (!Array.isArray(entries)) { errors.push(`Custom ${kind} entries must be a list.`); continue; }
        if (entries.length > 30) errors.push(`Keep at most 30 custom ${kind} entries.`);
        const ids = new Set<string>();
        entries.forEach((entry, index) => {
            const label = `Custom ${kind} ${index + 1}`;
            if (!entry || typeof entry !== "object" || Array.isArray(entry)) { errors.push(`${label}: invalid entry. Remove it and add it again.`); return; }
            if (kind === "connection" && !("service" in entry)) { errors.push(`${label}: choose an account service.`); return; }
            const collections = "service" in entry ? [entry.items, entry.details] : [entry.badges];
            if (collections.some(value => value != null && (!Array.isArray(value) || value.some(item => !item || typeof item !== "object" || Array.isArray(item))))) {
                errors.push(`${label}: invalid badges, account details or content. Remove the invalid entry and add it again.`);
                return;
            }
            if (!entry.id || ids.has(entry.id)) errors.push(`${label}: entry ID is missing or duplicated.`);
            ids.add(entry.id);
            const connection = "service" in entry;
            const nameLimit = connection ? 100 : 80;
            if ((entry.username?.length || 0) > nameLimit || (entry.displayName?.length || 0) > nameLimit) errors.push(`${label}: names must be ${nameLimit} characters or fewer.`);
            if ((entry.bio?.length || 0) > 1000) errors.push(`${label}: bio must be 1,000 characters or fewer.`);
            if (!textField(entry.username,100) && !textField(entry.displayName,100) && !textField(connection ? entry.accountId : entry.userId,100)) errors.push(`${label}: enter a name or ${connection ? "account" : "user"} ID, or remove this unfinished entry.`);
            if (!connection && entry.userId && !/^\d{15,22}$/.test(entry.userId)) errors.push(`${label}: enter a valid Discord user ID or clear the optional ID.`);
            const links = [entry.avatar, entry.banner, ...(connection ? [entry.url, ...(entry.items || []).flatMap(item => [item.image, item.url])] : (entry.badges || []).map(badge => badge.icon))];
            if (links.some(link => textField(link,4096) && !customPreviewURL(link))) errors.push(`${label}: image and account/content links must use HTTPS without embedded credentials.`);
            if (connection && entry.items?.some(item => !textField(item.title,150))) errors.push(`${label}: every selected item needs a title.`);
            if (connection && entry.items?.some(item => !item.id || (item.title?.length || 0) > 150 || (item.subtitle?.length || 0) > 200)) errors.push(`${label}: selected items need IDs, titles up to 150 characters and descriptions up to 200 characters.`);
            if (connection && entry.items && entry.items.length > 30) errors.push(`${label}: choose at most 30 content items.`);
            if (connection && entry.details && entry.details.length > 20 || !connection && entry.badges && entry.badges.length > 20) errors.push(`${label}: use at most 20 badges or account details.`);
            if (!connection && entry.badges?.some(badge => !textField(badge.name,80))) errors.push(`${label}: every badge needs a name.`);
            if (connection && entry.details?.some(detail => !textField(detail.label,80))) errors.push(`${label}: every account detail needs a label.`);
        });
    }
    return errors;
}

export function normalizeCustomSocial(data: any): Pick<ProfileAppearance, "customFriends" | "customConnections"> {
    const result: Pick<ProfileAppearance, "customFriends" | "customConnections"> = {};
    const records = (value: any) => Array.isArray(value) ? value.slice(0, 30).filter(item => item && typeof item === "object" && !Array.isArray(item)) : [];
    const unique = <T extends { id: string }>(items: T[]) => items.filter((item, index) => item.id && items.findIndex(other => other.id === item.id) === index);
    // Retired feature: ignore old/shared friend previews without changing Discord friendships.
    if (data?.customFriends !== undefined) result.customFriends = [];
    const services = ["steam", "youtube", "roblox", "twitch", "github", "spotify", "x", "reddit", "other"];
    if (Array.isArray(data?.customConnections)) result.customConnections = unique(records(data.customConnections).map(item => ({
        id: textField(item.id, 80),
        service: services.includes(item.service) ? item.service as CustomConnectionPreview["service"] : "other" as const,
        accountId: textField(item.accountId, 100), username: textField(item.username, 100), displayName: textField(item.displayName, 100),
        avatar: customPreviewURL(item.avatar), banner: customPreviewURL(item.banner), bio: textField(item.bio, 1000), url: customPreviewURL(item.url),
        details: records(item.details).slice(0, 20).map(detail => ({ label: textField(detail.label, 80), value: textField(detail.value, 300) })).filter(detail => detail.label),
        items: unique(records(item.items).slice(0, 30).map(content => ({id:textField(content.id,100),title:textField(content.title,150),image:customPreviewURL(content.image),url:customPreviewURL(content.url),subtitle:textField(content.subtitle,200)})).filter(content=>content.title && content.id)),
        mode: item.mode === "fetched" ? "fetched" as const : "manual" as const,
        fetchedAt: typeof item.fetchedAt === "string" && Number.isFinite(Date.parse(item.fetchedAt)) ? new Date(item.fetchedAt).toISOString() : ""
    })).filter(item => item.username || item.displayName || item.accountId));
    return result;
}

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
    const result: ProfileAppearance = { ...normalizeCustomSocial(data) };
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

/** Read-only connection snapshots for Discord's existing profile renderer.
 * Never advertise OAuth verification or insert these into the account store. */
export function nativeSocialProfile(profile: any, data: any): Record<string, any> {
    const { customConnections } = normalizeCustomSocial(data);
    if (!customConnections?.length) return {};
    const existing = Array.isArray(profile?.connectedAccounts) ? profile.connectedAccounts
        : Array.isArray(profile?.connected_accounts) ? profile.connected_accounts : [];
    const accounts = existing.filter((entry: any) => !entry?.cloudcordCustom).map((entry: any) => ({ ...entry }));
    for (const entry of customConnections) {
        accounts.push({
            id: entry.accountId || `cloudcord:${entry.id}`, type: entry.service === "x" ? "twitter" : entry.service === "other" ? "domain" : entry.service,
            name: entry.displayName || entry.username || entry.accountId,
            verified: false, visibility: 1, show_activity: false,
            cloudcordCustom: true, cloudcordPreview: entry,
        });
    }
    return { connectedAccounts: accounts, connected_accounts: accounts };
}

/** Presentation-only users: synthetic IDs must never be used for Discord API calls. */
export function nativeSocialFriends(ownerId: string, data: any): any[] {
    return (normalizeCustomSocial(data).customFriends || []).map(entry => {
        const id = `cloudcord-friend:${ownerId}:${entry.id}`;
        const name = entry.displayName || entry.username || entry.userId || "Custom friend";
        const avatar = entry.avatar || "https://cdn.discordapp.com/embed/avatars/0.png";
        const user = {
            id, username: entry.username || name, globalName: name, global_name: name,
            discriminator: "0", bot: false, system: false, avatar: null,
            flags: 0, publicFlags: 0, purchasedFlags: 0, premiumUsageFlags: 0, premiumType: 0,
            avatarDecorationData: null, banner: null, collectibles: null, displayNameStyles: null,
            guildMemberAvatars: {}, primaryGuild: null, verified: false, mobile: false, desktop: false,
            isProvisional: false, tag: entry.username || name, createdAt: new Date(0),
            cloudcordCustom: true, cloudcordPreview: entry,
            getAvatarURL: () => avatar, getAvatarSource: () => ({ uri: avatar }),
            getTag: () => entry.username || name, toString: () => name,
            isPomelo: () => true, hasUniqueUsername: () => true, isClaimed: () => true,
        };
        for (const method of ["hadPremiumSubscription", "hasAvatarForGuild", "hasFlag", "hasFreePremium", "hasHadPremium", "hasHadSKU", "hasPremiumUsageFlag", "hasPurchasedFlag", "hasUrgentMessages", "hasVerifiedEmailOrPhone", "isFractionalPremiumWithNoSubscription", "isLocalBot", "isNonUserBot", "isPhoneVerified", "isPremiumGroupMember", "isPremiumGroupPrimary", "isPremiumWithFractionalPremiumOnly", "isPremiumWithPremiumGroup", "isSystemUser", "isVerifiedBot"]) {
            Object.assign(user, { [method]: () => false });
        }
        Object.assign(user, {
            toJS: () => ({id,username:user.username,globalName:name,discriminator:"0",bot:false,system:false,cloudcordCustom:true,cloudcordPreview:entry}),
            update: (props: Record<string, any>) => ({...user,...props}),
            addGuildAvatarHash: () => user, removeGuildAvatarHash: () => user,
        });
        return {key:id,userId:id,type:1,status:"offline",isMobile:false,activities:[],applicationStream:null,
            user,usernameLower:user.username.toLowerCase(),mutualGuildsLength:0,mutualGuilds:[],nickname:null,
            spam:false,ignoredUser:false,isGameRelationship:false,comparator:[1,user.username.toLowerCase()],
            cloudcordCustom:true,cloudcordPreview:entry};
    });
}

export function mergeNativeSocialFriends(original: any[], ownerId: string, data: any, search = ""): any[] {
    const real = Array.isArray(original) ? original.filter(row => !row?.cloudcordCustom) : [];
    const query = String(search || "").toLowerCase();
    return [...real, ...nativeSocialFriends(ownerId, data).filter(row => !query ||
        `${row.user.username} ${row.user.globalName}`.toLowerCase().includes(query))];
}

/** Wrap the native FriendsStore's read snapshot, not its relationship mutation APIs. */
export function nativeSocialFriendsState(state: any, ownerId: string, data: any): any {
    if (!state?.rows || !normalizeCustomSocial(data).customFriends?.length) return state;
    const rows = Object.assign(Object.create(Object.getPrototypeOf(state.rows)), state.rows);
    if (typeof state.rows.filter === "function") rows.filter = (section: string, search?: string) => {
        const result = state.rows.filter(section, search);
        return section === "ALL" ? mergeNativeSocialFriends(result, ownerId, data, search) : result;
    };
    if (Array.isArray(state.rows._rows)) rows._rows = mergeNativeSocialFriends(state.rows._rows, ownerId, data);
    if (typeof state.rows.getRelationshipCounts === "function") rows.getRelationshipCounts = () => {
        const counts = state.rows.getRelationshipCounts();
        return {...counts, 1:Number(counts?.[1] || 0) + nativeSocialFriends(ownerId,data).length};
    };
    return {...state,rows};
}

export function createNativeSocialFriendsReader() {
    let previousState: any, previousKey = "", previousResult: any;
    return (state: any, ownerId: string, data: any) => {
        const safe = normalizeCustomSocial(data);
        const key = `${ownerId}:${JSON.stringify(safe.customFriends || [])}`;
        if (state === previousState && key === previousKey) return previousResult;
        previousState = state; previousKey = key;
        return previousResult = nativeSocialFriendsState(state,ownerId,safe);
    };
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
