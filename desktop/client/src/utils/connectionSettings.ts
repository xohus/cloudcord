import { nativeSocialProfile } from "./profileAppearance";

/** Present local connections in Settings without making them Discord OAuth accounts. */
export function installConnectionSettings(options: {
    store: any;
    rest: any;
    ownId: () => string;
    getData: () => any;
    remove: (id: string) => void;
    explain: () => void;
}) {
    // Do not expose native settings controls unless local writes can be caught.
    try {
        if (typeof options.rest?.del !== "function" || typeof options.rest?.patch !== "function") return () => {};
    } catch { return () => {}; }
    const cleanups: (() => void)[] = [];
    const prefix = "cloudcord-local:";
    let protectedWrites = false;
    let previous: any, fingerprint = "", snapshot: any[];
    const wrap = (object: any, key: string, handler: (original: Function, args: any[]) => any) => {
        try {
            const original = object?.[key];
            if (typeof original !== "function") return false;
            const replacement = function (this: any, ...args: any[]) { return handler(original.bind(this), args); };
            object[key] = replacement;
            if (object[key] !== replacement) return false;
            cleanups.push(() => { if (object[key] === replacement) object[key] = original; });
            return true;
        } catch { return false; /* A renamed or readonly store cannot prevent startup. */ }
    };
    wrap(options.store, "getAccounts", (original, args) => {
        const real = original(...args);
        if (!protectedWrites || !Array.isArray(real)) return real;
        const data = options.getData();
        const owner = options.ownId();
        if (!owner) return real;
        const current = JSON.stringify([owner, data?.customConnections || []]);
        if (previous === real && fingerprint === current && snapshot) return snapshot;
        previous = real; fingerprint = current;
        const custom = nativeSocialProfile({}, data).connectedAccounts || [];
        if (!custom.length) return snapshot = real;
        return snapshot = [...real, ...custom.map((account: any) => ({ ...account,
            id: prefix + owner + ":" + account.cloudcordPreview.id,
            verified: false, revoked: false, friend_sync: false, show_activity: false,
        }))];
    });
    const guarded = new Set<string>();
    for (const method of ["del", "patch", "put"]) {
        const installed = wrap(options.rest, method, (original, args) => {
        let id: string;
        try {
            const path = decodeURIComponent(String(args[0]?.url || ""));
            const match = path.match(/^\/users\/@me\/connections\/[^/]+\/(cloudcord-local:[^/?]+)(?:\?.*)?$/);
            if (!match) return original(...args);
            const scoped = match[1].slice(prefix.length);
            const separator = scoped.indexOf(":");
            if (separator < 0 || scoped.slice(0, separator) !== options.ownId()) return Promise.resolve({ ok: true, status: 204, body: null });
            id = scoped.slice(separator + 1);
        } catch { return original(...args); }
        // Never send synthetic connection IDs to Discord, including stale rows.
        if (method === "del") {
            options.remove(id);
            previous = undefined;
            try { options.store?.emitChange?.(); } catch {}
            return Promise.resolve({ ok: true, status: 204, body: null });
        }
        options.explain();
        return Promise.reject(new Error("Edit this local connection in CloudCord Profile settings."));
        });
        if (installed) guarded.add(method);
    }
    protectedWrites = guarded.has("del") && guarded.has("patch");
    return () => { for (const cleanup of cleanups.reverse()) cleanup(); };
}
