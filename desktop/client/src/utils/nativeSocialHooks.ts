import { createNativeSocialFriendsReader, nativeSocialFriends, normalizeCustomSocial, ProfileAppearance } from "./profileAppearance";

type Hooks = {
    ownId: () => string;
    ownData: () => ProfileAppearance | null | undefined;
    getData?: (ownerId: string) => ProfileAppearance | null | undefined;
    profileStore?: any;
    friendsStore?: any;
    userStore?: any;
    profileActions?: any;
    channelActions?: any;
    platforms?: any;
    openDetail: (entry: any, ownerId?: string) => void;
};

/** All wrappers are read/presentation hooks. No Flux relationship events or REST writes. */
export function installNativeSocialHooks(options: Hooks) {
    const cleanups: (() => void)[] = [];
    const previews = new Map<string, any>();
    const accountURLs = new WeakMap<object, string>();
    let previewSequence = 0;
    const wrap = (object: any, key: string, handler: (original: Function, args: any[]) => any) => {
        if (typeof object?.[key] !== "function") return;
        const original = object[key];
        const replacement = function (this: any, ...args: any[]) { return handler(original.bind(this), args); };
        object[key] = replacement;
        cleanups.push(() => { if (object[key] === replacement) object[key] = original; });
    };
    const friend = (id: any) => {
        if (typeof id !== "string" || !id.startsWith("cloudcord-friend:")) return undefined;
        const owner = id.split(":")[1];
        return nativeSocialFriends(owner,owner === options.ownId() ? options.ownData() : options.getData?.(owner)).find(row => row.userId === id);
    };
    wrap(options.profileActions, "openUserProfileModal", (original,args) => {
        const id = args[0]?.userId || args[0]?.id || args[0];
        if (typeof id !== "string" || !id.startsWith("cloudcord-friend:")) return original(...args);
        const row = friend(id);
        if (row) options.openDetail(row.cloudcordPreview, id.split(":")[1]);
    });
    wrap(options.channelActions, "openPrivateChannel", (original,args) => {
        const id = typeof args[0] === "string" ? args[0] : args[0]?.recipientId || args[0]?.recipientIds?.[0];
        if (typeof id !== "string" || !id.startsWith("cloudcord-friend:")) return original(...args);
        const row = friend(id);
        if (row) options.openDetail(row.cloudcordPreview, id.split(":")[1]);
        // Removed/custom preview IDs are never sent to Discord's DM API.
    });
    wrap(options.platforms, "get", (original,args) => {
        const platform = original(...args);
        if (!platform || typeof platform.getPlatformUserUrl !== "function") return platform;
        return Object.assign(Object.create(Object.getPrototypeOf(platform)),platform,{
            getPlatformUserUrl(account: any, ...rest: any[]) {
                if (!account?.cloudcordCustom || !account.cloudcordPreview) return platform.getPlatformUserUrl(account,...rest);
                const safe = normalizeCustomSocial({customConnections:[account.cloudcordPreview]}).customConnections?.[0];
                if (!safe) return undefined;
                // Entry IDs are scoped to a profile, not globally unique. Keep
                // distinct native accounts from overwriting each other's preview.
                const cachedURL = accountURLs.get(account);
                const url = cachedURL && previews.has(cachedURL) ? cachedURL
                    : `https://getcloudcord.com/custom-preview/${encodeURIComponent(safe.service)}/${encodeURIComponent(safe.id)}/${++previewSequence}`;
                if (previews.size >= 512 && !previews.has(url)) previews.delete(previews.keys().next().value!);
                previews.set(url,safe);
                accountURLs.set(account,url);
                return url;
            }
        });
    });
    return {
        openURL(url: string) {
            const preview = previews.get(url);
            if (!preview) return false;
            options.openDetail(preview);
            return true;
        },
        stop() { for (const cleanup of cleanups.reverse()) cleanup(); previews.clear(); },
    };
}
