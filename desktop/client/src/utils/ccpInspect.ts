const storeChecks = {
    UserStore: "getCurrentUser",
    GuildStore: "getGuilds",
    SelectedChannelStore: "getChannelId",
    SelectedGuildStore: "getGuildId",
    RelationshipStore: "getRelationships",
    ConnectedAccountsStore: "getAccounts",
};

const otherStores = [
    "UserProfileStore", "GuildRoleStore", "GuildMemberStore", "ChannelStore",
    "MessageStore", "ReadStateStore", "VoiceStateStore", "PresenceStore",
    "EmojiStore", "StickersStore", "ThemeStore", "PermissionStore", "TypingStore",
];

function functionNames(target: object, includePrototype = false) {
    const names = new Set<string>();
    for (let object: object | null = target; object && object !== Object.prototype; object = includePrototype ? Object.getPrototypeOf(object) : null) {
        if (object === Function.prototype) break;
        for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(object))) {
            if (name !== "constructor" && typeof descriptor.value === "function") names.add(name);
        }
    }
    return [...names].sort();
}

function ownValue(target: object, key: string): unknown {
    return Object.getOwnPropertyDescriptor(target, key)?.value;
}

/** Inspects loaded exports and records only the shape returned by known read-only calls. */
export function inspectCcpRuntime(platform: "desktop" | "mobile", resolveStore: (name: string) => unknown, cache: unknown) {
    const stores: Record<string, string[] | null> = {};
    const checks: Record<string, string> = {};
    for (const name of [...Object.keys(storeChecks), ...otherStores]) {
        const method = storeChecks[name as keyof typeof storeChecks];
        const label = name + "." + method;
        try {
            const store = resolveStore(name);
            stores[name] = store && typeof store === "object" ? functionNames(store, true) : null;
            if (!method) continue;
            const getter = store && (store as Record<string, unknown>)[method];
            if (typeof getter !== "function") {
                checks[label] = "unavailable";
                continue;
            }
            const result: unknown = getter.call(store);
            checks[label] = result === null ? "null" : Array.isArray(result) ? "array" : typeof result;
        } catch {
            stores[name] ??= null;
            if (method) checks[label] = "threw";
        }
    }

    const modules: { id: string; exports: string; methods: string[]; accessorNames: string[] }[] = [];
    if (cache && typeof cache === "object") {
        const entries: Iterable<[unknown, unknown]> = cache instanceof Map
            ? cache
            : Object.keys(cache).map(id => [id, ownValue(cache, id)]);
        for (const [id, entry] of entries) {
            if (!/^\d+$/.test(String(id)) || !entry || typeof entry !== "object") continue;
            try {
                const publicModule = ownValue(entry, "publicModule");
                const exports = ownValue(entry, "exports") ?? (publicModule && typeof publicModule === "object" ? ownValue(publicModule, "exports") : undefined);
                if (!exports || (typeof exports !== "object" && typeof exports !== "function")) continue;
                const methods = functionNames(exports);
                const accessorNames = Object.entries(Object.getOwnPropertyDescriptors(exports))
                    .filter(([, descriptor]) => typeof descriptor.get === "function").map(([name]) => name);
                if (methods.length || accessorNames.length || typeof exports === "function") {
                    modules.push({ id: String(id), exports: typeof exports, methods, accessorNames });
                }
            } catch { /* A lazy export can be unavailable on this build. */ }
        }
    }
    return { format: 1, platform, stores, checks, modules };
}

export function describeCcpReport(report: ReturnType<typeof inspectCcpRuntime>) {
    return `Copied the diagnostic report. Found ${report.modules.length} loaded modules and checked ${Object.keys(report.checks).length} read-only calls.`;
}
