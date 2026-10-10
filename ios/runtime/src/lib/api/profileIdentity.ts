// Presentation-only plugin access. Discord keeps its original cache records.
const storeViews = new WeakMap<object, any>();

function present(user: any) {
    const resolve = (globalThis as any).__CLOUDCORD_PRESENTATION_USER__;
    return typeof resolve === "function" ? resolve(user) : user;
}

// Project only identity-bearing presentation fields, never message text or IDs.
// Keep native message/cache objects intact, including their prototype methods.
export function presentationIdentity(value: any, depth = 0): any {
    if (!value || typeof value !== "object" || depth > 5) return value;
    if (Array.isArray(value)) {
        const items = value.map(item => presentationIdentity(item, depth + 1));
        return items.some((item, index) => item !== value[index]) ? items : value;
    }
    if (value.id && typeof value.username === "string" && !value.author) return present(value);
    const changes: Record<string, any> = {};
    for (const key of ["message", "lastMessage", "latestMessage", "author", "user", "mentionedUser", "referencedMessage", "mentions"]) {
        const next = presentationIdentity(value[key], depth + 1);
        if (next !== value[key]) changes[key] = next;
    }
    if (!Object.keys(changes).length) return value;
    const clone = Object.create(Object.getPrototypeOf(value));
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of Object.keys(changes)) descriptors[key] = { value: changes[key], enumerable: true, configurable: true, writable: true };
    Object.defineProperties(clone, descriptors);
    return clone;
}

export function presentationName(result: any, user: any): any {
    if (typeof result !== "string" || !user?.id) return result;
    const custom = present(user);
    if (custom === user) return result;
    const originalDisplay = user.globalName || user.global_name || user.displayName;
    const customDisplay = custom.globalName || custom.global_name || custom.displayName;
    if (originalDisplay && result === originalDisplay && customDisplay) return String(customDisplay);
    if (result === user.username && custom.username) return String(custom.username);
    if (result === `@${user.username}` && custom.username) return `@${custom.username}`;
    // Never replace substrings in message bodies, links, or other users' names.
    return result;
}

export function pluginIdentityPatcher(patcher: any): any {
    if (!patcher) return patcher;
    const view = { ...patcher };
    for (const key of ["before", "after", "instead"]) {
        if (typeof patcher[key] !== "function") continue;
        const wrap = (install: any) => function(this: any, method: any, target: any, callback: any, ...rest: any[]) {
            // ShowTag reads RowManager's presentation rows. Other hooks must
            // receive the original argument array, especially send/dispatch
            // hooks that mutate arguments or rely on native object identity.
            if (key !== "after" || method !== "generate") {
                return install.call(patcher, method, target, callback, ...rest);
            }
            return install.call(patcher, method, target, function(this: any, args: any[], ...callbackRest: any[]) {
                const rows = args[0]?.rowType === 1 && args[0]?.message;
                return callback.call(this, rows ? args.map(value => presentationIdentity(value)) : args, ...callbackRest);
            }, ...rest);
        };
        view[key] = wrap(patcher[key]);
        if (typeof patcher[key].await === "function") view[key].await = wrap(patcher[key].await);
    }
    return view;
}

export function pluginIdentityModule(module: any): any {
    if (!module || (typeof module !== "object" && typeof module !== "function")) return module;
    if (typeof module.getUser !== "function" || typeof module.getCurrentUser !== "function") return module;
    if (storeViews.has(module)) return storeViews.get(module);
    const view = Object.create(module);
    // Flux store methods may use private state; keep their receiver native.
    for (let owner = module; owner && owner !== Object.prototype; owner = Object.getPrototypeOf(owner)) {
        for (const key of Reflect.ownKeys(owner)) {
            if (key === "constructor" || Object.prototype.hasOwnProperty.call(view, key)) continue;
            const descriptor = Object.getOwnPropertyDescriptor(owner, key);
            if (typeof descriptor?.value === "function") Object.defineProperty(view, key, { configurable: true, writable: true, value: descriptor.value.bind(module) });
        }
    }
    for (const key of ["getUser", "getCurrentUser", "getUsers"]) {
        if (typeof module[key] !== "function") continue;
        Object.defineProperty(view, key, { configurable: true, writable: true, value: (...args: any[]) => {
            const result = module[key](...args);
            if (key !== "getUsers" || !result) return present(result);
            return Object.fromEntries(Object.entries(result).map(([id, user]) => [id, present(user)]));
        } });
    }
    storeViews.set(module, view);
    return view;
}

export function pluginIdentityMetro(metro: any): any {
    if (!metro) return metro;
    const view = { ...metro };
    if (metro.common) view.common = { ...metro.common, UserStore: pluginIdentityModule(metro.common.UserStore) };
    for (const key of ["find", "findAll", "findExports", "findAllExports", "findByProps", "findByPropsAll", "findByPropsLazy", "findByStoreName", "findByStoreNameLazy"]) {
        if (typeof metro[key] !== "function") continue;
        view[key] = (...args: any[]) => {
            const result = metro[key](...args);
            return Array.isArray(result) ? result.map(pluginIdentityModule) : pluginIdentityModule(result);
        };
    }
    return view;
}
