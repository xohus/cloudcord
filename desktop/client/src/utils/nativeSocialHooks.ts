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
    openDetail: (entry: any) => void;
};

/** All wrappers are read/presentation hooks. No Flux relationship events or REST writes. */
export function installNativeSocialHooks(options: Hooks) {
    const cleanups: (() => void)[] = [];
    const previews = new Map<string, any>();
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
    const readFriends = createNativeSocialFriendsReader();
    wrap(options.friendsStore, "getState", (original,args) => readFriends(original(...args),options.ownId(),options.ownData()));
    wrap(options.userStore, "getUser", (original,args) => friend(args[0])?.user || original(...args));
    wrap(options.profileStore, "getMutualFriends", (original,args) => {
        const result = original(...args);
        const owner = String(args[0] || "");
        const custom = nativeSocialFriends(owner,owner === options.ownId() ? options.ownData() : options.getData?.(owner));
        return custom.length ? [...(Array.isArray(result) ? result : []), ...custom.map(row => ({key:row.key,status:row.status,user:row.user,cloudcordCustom:true}))] : result;
    });
    wrap(options.profileStore, "getMutualFriendsCount", (original,args) => {
        const count = original(...args);
        const owner = String(args[0] || "");
        const extra = nativeSocialFriends(owner,owner === options.ownId() ? options.ownData() : options.getData?.(owner)).length;
        return extra ? Number(count || 0) + extra : count;
    });
    wrap(options.profileActions, "openUserProfileModal", (original,args) => {
        const id = args[0]?.userId || args[0]?.id || args[0];
        if (typeof id !== "string" || !id.startsWith("cloudcord-friend:")) return original(...args);
        const row = friend(id);
        if (row) options.openDetail(row.cloudcordPreview);
    });
    wrap(options.channelActions, "openPrivateChannel", (original,args) => {
        const id = typeof args[0] === "string" ? args[0] : args[0]?.recipientId || args[0]?.recipientIds?.[0];
        if (typeof id !== "string" || !id.startsWith("cloudcord-friend:")) return original(...args);
        const row = friend(id);
        if (row) options.openDetail(row.cloudcordPreview);
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
                const url = `https://getcloudcord.com/custom-preview/${encodeURIComponent(safe.service)}/${encodeURIComponent(safe.id)}`;
                if (previews.size >= 512 && !previews.has(url)) previews.delete(previews.keys().next().value!);
                previews.set(url,safe);
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
