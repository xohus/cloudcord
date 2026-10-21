import { after } from "@lib/api/patcher";
import { findByPropsLazy } from "@metro";

type Callback = (Component: any, ret: JSX.Element) => JSX.Element;
const callbacks = new Map<string, Callback[]>();
const warnedCallbacks = new WeakSet<Callback>();

const jsxRuntime = findByPropsLazy("jsx", "jsxs");

export function onJsxCreate(Component: string, callback: Callback) {
    if (!callbacks.has(Component)) callbacks.set(Component, []);
    callbacks.get(Component)!.push(callback);
}

export function deleteJsxCreate(Component: string, callback: Callback) {
    if (!callbacks.has(Component)) return;
    const cbs = callbacks.get(Component)!;
    const index = cbs.indexOf(callback);
    if (index < 0) return;
    cbs.splice(index, 1);
    if (cbs.length === 0) callbacks.delete(Component);
}

/**
 * @internal
 */
export function patchJsx() {
    const callback = ([Component]: unknown[], ret: JSX.Element) => {
        if (!ret || typeof ret !== "object") return;
        // Band-aid fix for iOS invalid element type crashes
        if (typeof ret.type === 'undefined') {
            return { ...ret, type: "RCTView" };
        }

        // React.memo profile headers are objects, and production functions can
        // retain a displayName while their function name is shortened.
        const component: any = Component;
        const target = typeof component === "function" ? component
            : component?.$$typeof === Symbol.for("react.memo") && typeof component.type === "function" ? component.type : null;
        const name = [component?.displayName, target?.displayName, target?.name].find(value => typeof value === "string" && callbacks.has(value));
        if (target && name) {
            const cbs = callbacks.get(name)!;
            for (const cb of [...cbs]) {
                try {
                    // Discord/React may freeze these objects. Never write into
                    // its native element or leak a half-applied hook on failure.
                    const editable = { ...ret, props: { ...ret.props } };
                    const changed = cb(target, editable);
                    const next = changed === undefined ? editable : changed;
                    if (!next || typeof next !== "object" || next.type == null) throw new Error("Profile hook returned an invalid React element");
                    ret = next;
                } catch (error) {
                    if (!warnedCallbacks.has(cb)) {
                        warnedCallbacks.add(cb);
                        console.warn(`[CloudCord] Skipped failed JSX hook for ${name}`, error);
                    }
                }
            }
            return ret;
        }
    };

    const patches = [
        after("jsx", jsxRuntime, callback),
        after("jsxs", jsxRuntime, callback)
    ];

    return () => patches.forEach(unpatch => unpatch());
}
