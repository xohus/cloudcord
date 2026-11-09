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
        // Settings screens (Connections, Integrations) read Discord's record fields in camelCase,
        // e.g. account.integrations.map(...). Give local rows every field a real row has, on the
        // same prototype when there is a real row, so those screens can't hit undefined.
        const proto = real.length ? Object.getPrototypeOf(real[0]) : Object.prototype;
        // Own data properties, defined rather than assigned: a record prototype may have getter-only fields.
        const asRecord = (fields: Record<string, unknown>) => Object.create(proto, Object.fromEntries(Object.entries(fields)
            .map(([key, value]) => [key, { value, enumerable: true, writable: true, configurable: true }])));
        return snapshot = [...real, ...custom.map((account: any) => asRecord({
            type: account.type, name: account.name,
            id: prefix + owner + ":" + account.cloudcordPreview.id,
            verified: false, revoked: false, visibility: 1,
            friendSync: false, friend_sync: false, showActivity: false, show_activity: false,
            metadataVisibility: 0, metadata_visibility: 0, twoWayLink: false, two_way_link: false,
            integrations: [], metadata: undefined, accessToken: undefined, access_token: undefined,
            cloudcordCustom: true, cloudcordPreview: account.cloudcordPreview,
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
