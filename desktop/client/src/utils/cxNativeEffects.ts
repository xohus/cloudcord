export const cxNativeEffects = {
    "silent-typing": { permission: "typing.suppress", label: "Stop sending your typing indicator" },
    "pending-friend-count": { permission: "appearance.hide", label: "Hide the pending friend request count" },
    "animated-assets": { permission: "appearance.style", label: "Animate avatars, banners, and server icons" },
} as const;

export type CxNativeEffect = keyof typeof cxNativeEffects;

type MethodOverride = (args: unknown[], invoke: (args: unknown[]) => unknown) => unknown;

export function overrideCxMethods(target: object | undefined, overrides: Record<string, MethodOverride>, enabled = () => true) {
    const cleanups: (() => void)[] = [];
    let active = true;
    function stop() {
        active = false;
        for (const cleanup of cleanups.splice(0).reverse()) cleanup();
    }
    if (!target) throw new Error("Discord's module is unavailable");
    const methods = target as Record<string, unknown>;
    try {
        for (const [key, override] of Object.entries(overrides)) {
            const original = methods[key];
            if (typeof original !== "function") continue;
            const previous = Object.getOwnPropertyDescriptor(target, key);
            function wrapped(this: unknown, ...args: unknown[]) {
                const invoke = (next: unknown[]) => Reflect.apply(original as (...args: unknown[]) => unknown, this, next);
                return active && enabled() ? override(args, invoke) : invoke(args);
            }
            if (previous && !previous.configurable) {
                if (!("value" in previous) || !previous.writable) continue;
                Object.defineProperty(target, key, { value: wrapped });
            } else {
                Object.defineProperty(target, key, { value: wrapped, writable: true, configurable: true, enumerable: previous?.enumerable ?? false });
            }
            cleanups.push(() => {
                const current = Object.getOwnPropertyDescriptor(target, key);
                if (current?.value !== wrapped) return;
                if (previous) Object.defineProperty(target, key, previous);
                else Reflect.deleteProperty(target, key);
            });
        }
        if (!cleanups.length) throw new Error("Discord's methods are unavailable or read-only");
    } catch (error) {
        stop();
        throw error;
    }
    return stop;
}

export function animateCxAssets(target: object | undefined, bannerTakesOptions: boolean, enabled?: () => boolean) {
    const animateArgument: MethodOverride = (args, invoke) => {
        const next = [...args];
        next[1] = true;
        return invoke(next);
    };
    const animateOptions: MethodOverride = ([options, ...args], invoke) =>
        options && typeof options === "object" ? invoke([{ ...options, canAnimate: true }, ...args]) : invoke([options, ...args]);
    return overrideCxMethods(target, {
        getUserAvatarURL: animateArgument,
        getGuildMemberAvatarURL: animateArgument,
        getUserBannerURL: bannerTakesOptions ? animateOptions : animateArgument,
        getGuildIconURL: animateOptions,
    }, enabled);
}
