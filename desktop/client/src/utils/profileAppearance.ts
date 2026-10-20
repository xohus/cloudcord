export type ProfileAppearance = {
    displayNameStyles?: { fontId: number; effectId: number; colors: number[] } | null;
    serverTag?: { tag: string; guildId: string; badge: string; icon?: string } | null;
    nameplate?: ProfileNameplate | null;
    profileEffect?: { skuId: string } | null;
    profileFrame?: { skuId: string } | null;
    customActivity?: ProfileActivity | null;
    customStatus?: { text: string; emoji?: string } | null;
    presenceStatus?: "online" | "idle" | "dnd" | "invisible" | null;
    customFriends?: CustomFriendPreview[];
    customConnections?: CustomConnectionPreview[];
};

export type ProfileNameplate = { skuId: string; asset: string; label?: string; palette?: string };
/** Discord activity types: 0 Playing, 1 Streaming, 2 Listening to, 3 Watching, 5 Competing in. */
export type ProfileActivity = { type: 0 | 1 | 2 | 3 | 5; name: string; details?: string; state?: string; url?: string };
export const ACTIVITY_TYPES = [{ value: 0, label: "Playing" }, { value: 1, label: "Streaming" }, { value: 2, label: "Listening to" }, { value: 3, label: "Watching" }, { value: 5, label: "Competing in" }] as const;
export const PRESENCE_STATUSES = ["online", "idle", "dnd", "invisible"] as const;
const SNOWFLAKE = /^\d{15,22}$/;
const TAG_ICON_DATA = /^data:image\/(?:png|webp|gif|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/;
export const TAG_ICON_MAX_LENGTH = 70000;

/** Shared presentation records. Never insert these into Discord's relationship or OAuth stores. */
export type CustomFriendPreview = {
    id: string; userId?: string; username: string; displayName: string;
    avatar: string; banner: string; bio: string;
    badges: { name: string; icon: string }[];
};

export type CustomConnectionPreview = {
    id: string; service: "steam" | "youtube" | "roblox" | "twitch" | "github" | "spotify" | "x" | "reddit" | "domain" | "other";
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
    const names: Record<string, string> = {steam:"Steam",youtube:"YouTube",roblox:"Roblox",github:"GitHub",twitch:"Twitch",spotify:"Spotify",x:"X",reddit:"Reddit",domain:"Domain",other:"Other"};
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
    const services = ["steam", "youtube", "roblox", "twitch", "github", "spotify", "x", "reddit", "domain", "other"];
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
            const icon = serverTagCustomIcon(data.serverTag.icon);
            result.serverTag = icon ? { tag: tag.trim(), guildId, badge, icon } : { tag: tag.trim(), guildId, badge };
        }
    }
    const text = (value: unknown, maximum: number) => typeof value === "string" ? Array.from(value.replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, "").trim()).slice(0, maximum).join("") : "";
    if (data?.nameplate === null) result.nameplate = null;
    else if (data?.nameplate && typeof data.nameplate === "object") {
        const { skuId, asset, label, palette } = data.nameplate;
        if (typeof skuId === "string" && SNOWFLAKE.test(skuId) && typeof asset === "string" && /^nameplates\/[A-Za-z0-9_\/-]{1,180}\/$/.test(asset) && !asset.includes("..")) {
            result.nameplate = { skuId, asset, label: text(label, 80), palette: typeof palette === "string" && /^[a-z_]{1,30}$/.test(palette) ? palette : "" };
        }
    }
    if (data?.profileEffect === null) result.profileEffect = null;
    else if (typeof data?.profileEffect?.skuId === "string" && SNOWFLAKE.test(data.profileEffect.skuId)) result.profileEffect = { skuId: data.profileEffect.skuId };
    if (data?.profileFrame === null) result.profileFrame = null;
    else if (typeof data?.profileFrame?.skuId === "string" && SNOWFLAKE.test(data.profileFrame.skuId)) result.profileFrame = { skuId: data.profileFrame.skuId };
    if (data?.customActivity === null) result.customActivity = null;
    else if (data?.customActivity && typeof data.customActivity === "object") {
        const activity = data.customActivity;
        const name = text(activity.name, 128);
        if (ACTIVITY_TYPES.some(type => type.value === activity.type) && name) {
            const url = activity.type === 1 ? streamURL(activity.url) : "";
            result.customActivity = { type: activity.type, name, details: text(activity.details, 128), state: text(activity.state, 128), ...(url ? { url } : {}) };
        }
    }
    if (data?.customStatus === null) result.customStatus = null;
    else if (data?.customStatus && typeof data.customStatus === "object") {
        const statusText = text(data.customStatus.text, 128);
        const emoji = text(data.customStatus.emoji, 8);
        const safeEmoji = emoji && !/[A-Za-z0-9<>:]/.test(emoji) ? emoji : "";
        if (statusText || safeEmoji) result.customStatus = { text: statusText, ...(safeEmoji ? { emoji: safeEmoji } : {}) };
    }
    if (data?.presenceStatus === null) result.presenceStatus = null;
    else if ((PRESENCE_STATUSES as readonly string[]).includes(data?.presenceStatus)) result.presenceStatus = data.presenceStatus;
    return result;
}

/** Discord's own rule (its STREAMING check): twitch.tv/<name> or youtube.com/watch?v=<id>.
 * Short and live YouTube links are rewritten to the watch form so they qualify. */
export const DISCORD_STREAM_URL = /^https?:\/\/(?:www\.)?(twitch\.tv\/(.+)|youtube.com\/watch\?v=)/;
export function streamURL(value: unknown): string {
    let url = customPreviewURL(value);
    if (!url) return "";
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^(www|m)\./, "");
    const live = parsed.pathname.match(/^\/live\/([\w-]{6,})/);
    if (host === "youtu.be" && /^\/[\w-]{6,}$/.test(parsed.pathname)) url = `https://www.youtube.com/watch?v=${parsed.pathname.slice(1)}`;
    else if (host === "youtube.com" && live) url = `https://www.youtube.com/watch?v=${live[1]}`;
    return DISCORD_STREAM_URL.test(url) ? url : "";
}

/** A small uploaded image (data URL) or a Discord/CloudCord-hosted HTTPS image. */
export function serverTagCustomIcon(value: unknown): string {
    if (typeof value !== "string" || !value || value.length > TAG_ICON_MAX_LENGTH) return "";
    if (TAG_ICON_DATA.test(value)) return value;
    const url = customPreviewURL(value);
    if (!url) return "";
    const host = new URL(url).hostname;
    return host === "cdn.discordapp.com" || host === "media.discordapp.net" || host === "getcloudcord.com" ? url : "";
}

/** Stable 32-hex key so a custom icon can travel through Discord's badge-hash field. */
export function serverTagIconKey(icon: string): string {
    let h1 = 0x811c9dc5, h2 = 0x01000193, h3 = 0x9e3779b9, h4 = 0x85ebca6b;
    for (let index = 0; index < icon.length; index++) {
        const code = icon.charCodeAt(index);
        h1 = Math.imul(h1 ^ code, 16777619); h2 = Math.imul(h2 ^ code, 2246822507);
        h3 = Math.imul(h3 ^ code, 3266489909); h4 = Math.imul(h4 ^ code, 668265263);
    }
    return "cc" + [h1, h2, h3, h4].map(value => (value >>> 0).toString(16).padStart(8, "0")).join("").slice(0, 30);
}

const customTagIcons = new Map<string, string>();
/** Badge hash -> custom icon, used to swap Discord's guild-tag image for the uploaded one. */
export function customServerTagIcon(badge: string): string | undefined { return customTagIcons.get(badge); }

/** Native activity objects for Discord's presence renderer (presentation only). */
export function nativeActivities(data: any): any[] {
    const appearance = normalizeProfileAppearance(data);
    const activities: any[] = [];
    if (appearance.customStatus) {
        const { text: state, emoji } = appearance.customStatus;
        activities.push({ type: 4, name: "Custom Status", state: state || null, emoji: emoji ? { name: emoji, id: null, animated: false } : null, id: "custom", created_at: 0, cloudcordCustom: true });
    }
    if (appearance.customActivity) {
        const activity = appearance.customActivity;
        activities.push({
            type: activity.type, name: activity.name, details: activity.details || undefined, state: activity.state || undefined,
            url: activity.type === 1 ? activity.url : undefined, id: "cloudcord-activity", created_at: 0, flags: 0, cloudcordCustom: true
        });
    }
    return activities;
}

/** Collectibles merged onto Discord's own object, keeping anything it already has. */
export function nativeCollectibles(existing: any, data: any): any {
    const { nameplate } = normalizeProfileAppearance(data);
    if (nameplate === undefined) return existing;
    const base = existing && typeof existing === "object" ? { ...existing } : {};
    base.nameplate = nameplate ? { skuId: nameplate.skuId, sku_id: nameplate.skuId, asset: nameplate.asset, label: nameplate.label || "", palette: nameplate.palette || "", expiresAt: null, expires_at: null } : null;
    return base;
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
        const domain = entry.service === "domain" ? connectionDomain(entry) : "";
        accounts.push({
            id: domain || entry.accountId || `cloudcord:${entry.id}`, type: entry.service === "x" ? "twitter" : entry.service === "other" || entry.service === "domain" ? "domain" : entry.service,
            name: domain || entry.displayName || entry.username || entry.accountId,
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
        let badge = tag?.badge || null;
        if (tag?.icon) { badge = serverTagIconKey(tag.icon); customTagIcons.set(badge, tag.icon); }
        result.primaryGuild = tag ? {
            identityEnabled: true, identityGuildId: tag.guildId, tag: tag.tag, badge,
            identity_enabled: true, identity_guild_id: tag.guildId,
        } : null;
        result.primary_guild = result.primaryGuild;
    }
    return result;
}

// ---------- Discord collectibles catalog (shared by desktop and mobile) ----------

export type CatalogDecoration = { id: string; skuId: string; label: string; url: string };
export type CatalogNameplate = { skuId: string; asset: string; label: string; palette: string };
export type CatalogEffect = { skuId: string; title: string; preview: string; config: any };
export type CatalogFrame = { skuId: string; label: string; preview: string };
export type Catalog = { decorations: CatalogDecoration[]; nameplates: CatalogNameplate[]; effects: CatalogEffect[]; frames: CatalogFrame[] };

const ITEM_DECORATION = 0, ITEM_EFFECT = 1, ITEM_NAMEPLATE = 2, ITEM_FRAME = 3;

/** First HTTPS image found in a shop payload, used only as a picker thumbnail. */
function firstImage(...values: any[]): string {
    const seen = new Set<any>();
    const visit = (value: any, depth: number): string => {
        if (depth > 4 || value == null || seen.has(value)) return "";
        if (typeof value === "string") return /^https:\/\/[^\s"]+\.(?:png|webp|jpe?g|gif)(?:\?[^\s"]*)?$/i.test(value) ? value : "";
        if (typeof value !== "object") return "";
        seen.add(value);
        for (const item of Array.isArray(value) ? value : Object.values(value)) { const found = visit(item, depth + 1); if (found) return found; }
        return "";
    };
    for (const value of values) { const found = visit(value, 0); if (found) return found; }
    return "";
}

const camel = (value: any): any => Array.isArray(value) ? value.map(camel)
    : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key.replace(/_([a-z])/g, (_, char) => char.toUpperCase()), camel(item)]))
        : value;

export function nameplateAssetURL(asset: string, animated = false): string {
    return `https://cdn.discordapp.com/assets/collectibles/${asset}${animated ? "asset.webm" : "static.png"}`;
}

/** Parse shop categories → products → items into one flat catalog. */
export function parseCatalog(categoriesBody: any, effectsBody: any): Catalog {
    const categories = Array.isArray(categoriesBody) ? categoriesBody : Array.isArray(categoriesBody?.categories) ? categoriesBody.categories : [];
    const configs = new Map<string, any>();
    for (const config of camel(effectsBody?.profile_effect_configs ?? effectsBody?.profileEffectConfigs ?? (Array.isArray(effectsBody) ? effectsBody : []))) {
        if (config?.skuId) configs.set(String(config.skuId), config);
    }
    const decorations = new Map<string, CatalogDecoration>(), nameplates = new Map<string, CatalogNameplate>(), effects = new Map<string, CatalogEffect>(), frames = new Map<string, CatalogFrame>();
    for (const category of categories) {
        for (const product of category?.products || []) {
            for (const item of product?.items || []) {
                const skuId = String(item?.sku_id || item?.skuId || product?.sku_id || product?.skuId || "");
                if (!/^\d{15,22}$/.test(skuId)) continue;
                const label = String(item?.label || product?.name || "").slice(0, 80);
                if (item.type === ITEM_DECORATION && typeof item.asset === "string") {
                    decorations.set(item.asset, { id: item.asset, skuId, label, url: `https://cdn.discordapp.com/avatar-decoration-presets/${item.asset}.png?size=160&passthrough=true` });
                } else if (item.type === ITEM_NAMEPLATE && typeof item.asset === "string") {
                    nameplates.set(skuId, { skuId, asset: item.asset, label, palette: String(item.palette || "") });
                } else if (item.type === ITEM_FRAME) {
                    // Frames are layered art; the top layer reads best as a thumbnail. Items carry
                    // a long accessibility label, so prefer the product's short name.
                    const layers = Array.isArray(item.layers) ? item.layers : [];
                    const layer = layers.find((entry: any) => entry?.anchor === "top") || layers[0];
                    const layerArt = layer?.id ? `https://cdn.discordapp.com/media/v1/collectibles-shop/${skuId}/${encodeURIComponent(String(layer.id))}/static` : "";
                    frames.set(skuId, { skuId, label: String(product?.name || item?.label || "Profile frame").slice(0, 80), preview: layerArt || firstImage(item, product) });
                } else if (item.type === ITEM_EFFECT) {
                    const config = configs.get(skuId) || camel(item);
                    effects.set(skuId, { skuId, title: String(config?.title || label), preview: config?.thumbnailPreviewSrc || config?.staticFrameSrc || "", config: { ...config, skuId } });
                }
            }
        }
    }
    // Effects that exist in the config list but not in the current shop.
    for (const [skuId, config] of configs) if (!effects.has(skuId)) effects.set(skuId, { skuId, title: String(config.title || "Profile effect"), preview: config.thumbnailPreviewSrc || config.staticFrameSrc || "", config });
    const byLabel = <T extends { label?: string; title?: string }>(items: T[]) => items.sort((a, b) => String(a.label ?? a.title).localeCompare(String(b.label ?? b.title)));
    return { decorations: byLabel([...decorations.values()]), nameplates: byLabel([...nameplates.values()]), effects: byLabel([...effects.values()]), frames: byLabel([...frames.values()]) };
}

/** The bare hostname for a domain connection, from its link, account ID or name. */
export function connectionDomain(entry: Pick<CustomConnectionPreview, "url" | "accountId" | "username" | "displayName">): string {
    for (const value of [entry.url, entry.accountId, entry.username, entry.displayName]) {
        const text = typeof value === "string" ? value.trim().toLowerCase() : "";
        if (!text) continue;
        try {
            const host = new URL(/^https?:\/\//.test(text) ? text : `https://${text}`).hostname.replace(/^www\./, "");
            if (/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)) return host;
        } catch { }
    }
    return "";
}
