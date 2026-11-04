/** Synthetic requests must never change a Discord relationship. */
export function installLocalRelationshipActions(rest: any, isLocal: (id: string) => boolean, dismiss: (id: string) => void) {
    let active = true;
    const cleanups: (() => void)[] = [];
    let installed = 0;
    for (const method of ["put", "del"]) {
        try {
            const original = rest?.[method];
            if (typeof original !== "function") continue;
            const replacement = function (this: any, ...args: any[]) {
                const id = String(args[0]?.url || "").match(/^\/users\/@me\/relationships\/(\d{17,20})\/?(?:\?.*)?$/)?.[1];
                if (!active || !id || !isLocal(id)) return original.apply(this, args);
                if (method === "put") return Promise.reject(new Error("This is a device-only preview, not a real friend request. Remove it with Ignore."));
                dismiss(id);
                return Promise.resolve({ ok: true, status: 204, body: null });
            };
            rest[method] = replacement;
            if (rest[method] !== replacement) continue;
            installed++;
            cleanups.push(() => { if (rest[method] === replacement) rest[method] = original; });
        } catch { /* Readonly modules cannot safely expose local requests. */ }
    }
    const stop = () => { active = false; for (const cleanup of cleanups.reverse()) cleanup(); };
    if (installed !== 2) stop();
    return { ready: installed === 2, stop };
}
