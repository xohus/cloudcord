import { after } from "@lib/api/patcher";
import { findByPropsLazy } from "@metro";

type Callback = (Component: any, ret: JSX.Element) => JSX.Element;
type ComponentTarget = string | object;
const callbacks = new Map<ComponentTarget, Callback[]>();
const finalCallbacks = new Map<ComponentTarget, Callback[]>();
const warnedCallbacks = new WeakSet<Callback>();

const jsxRuntime = findByPropsLazy("jsx", "jsxs");

export function onJsxCreate(Component: ComponentTarget, callback: Callback, afterOthers = false) {
    const list = afterOthers ? finalCallbacks : callbacks;
    if (!list.has(Component)) list.set(Component, []);
    list.get(Component)!.push(callback);
}

export function deleteJsxCreate(Component: ComponentTarget, callback: Callback, afterOthers = false) {
    const list = afterOthers ? finalCallbacks : callbacks;
    const cbs = list.get(Component);
    if (!cbs) return;
    const index = cbs.indexOf(callback);
    if (index < 0) return;
    cbs.splice(index, 1);
    if (cbs.length === 0) list.delete(Component);
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

        const component: any = Component;
        const inner = component?.$$typeof === Symbol.for("react.memo") ? component.type : component;
        const target = typeof inner === "function" ? inner
            : inner?.$$typeof === Symbol.for("react.forward_ref") && typeof inner.render === "function" ? inner.render : null;
        const name = [component?.displayName, inner?.displayName, target?.displayName, target?.name].find(value =>
            typeof value === "string" && (callbacks.has(value) || finalCallbacks.has(value))
        );
        const direct = target && callbacks.get(component);
        const directFinal = target && finalCallbacks.get(component);
        if (target && (name || direct || directFinal)) {
            for (const cb of [...(callbacks.get(name) ?? []), ...(direct ?? []),
                ...(finalCallbacks.get(name) ?? []), ...(directFinal ?? [])]) {
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
                        console.warn(`[CloudCord] Skipped failed JSX hook for ${name ?? target.name ?? "component"}`, error);
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
