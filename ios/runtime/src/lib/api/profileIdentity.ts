// Presentation-only plugin access. Discord keeps its original cache records.
const storeViews = new WeakMap<object, any>();

function present(user: any) {
    const resolve = (globalThis as any).__CLOUDCORD_PRESENTATION_USER__;
    return typeof resolve === "function" ? resolve(user) : user;
}

export function pluginIdentityModule(module: any): any {
    if (!module || (typeof module !== "object" && typeof module !== "function")) return module;
    if (typeof module.getUser !== "function" || typeof module.getCurrentUser !== "function") return module;
    if (storeViews.has(module)) return storeViews.get(module);
    const view = Object.create(module);
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
