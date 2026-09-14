/* CloudCord Discord 344 compatibility runtime.
 * Deliberately standalone: it does not import Kettu, replace Metro, wrap fetch,
 * or patch account/guild/channel stores. */
(() => {
    "use strict";

    const ROUTE = "CLOUDCORD_344_SETTINGS";
    const SECTION = "CloudCord";
    const state = globalThis.__CLOUDCORD_344__ ||= {
        installed: false,
        attempts: 0,
        errors: []
    };
    if (state.installed) return;

    const exportsOf = entry => {
        const value = entry?.publicModule?.exports ?? entry?.exports ?? entry;
        return [value, value?.default, value?.default?.default].filter(Boolean);
    };

    const moduleValues = () => {
        const raw = globalThis.modules ?? globalThis.__c?.();
        if (!raw) return [];
        return typeof raw.values === "function" ? [...raw.values()] : Object.values(raw);
    };

    const findExport = predicate => {
        for (const entry of moduleValues()) {
            for (const value of exportsOf(entry)) {
                try { if (predicate(value)) return value; } catch {}
            }
        }
        return null;
    };

    const findOwner = predicate => {
        for (const entry of moduleValues()) {
            const root = entry?.publicModule?.exports ?? entry?.exports ?? entry;
            for (const value of [root, root?.default].filter(Boolean)) {
                try { if (predicate(value)) return value; } catch {}
            }
        }
        return null;
    };

    const record = (where, error) => {
        state.errors.push({ where, message: String(error?.message ?? error), at: Date.now() });
        if (state.errors.length > 12) state.errors.shift();
        console.warn(`[CloudCord 344] ${where}`, error);
    };

    function install() {
        state.attempts++;
        const React = findExport(v => typeof v?.createElement === "function" && typeof v?.useState === "function");
        const RN = findExport(v => v?.View && v?.Text && v?.ScrollView && v?.StyleSheet && v?.Platform);
        const rendererOwner = findOwner(v => v?.SETTING_RENDERER_CONFIG && typeof v.SETTING_RENDERER_CONFIG === "object");
        const overviewOwner = findOwner(v => {
            const fn = v?.SettingsOverviewScreen ?? v?.default;
            return typeof fn === "function" && (fn.displayName === "SettingsOverviewScreen" || fn.name === "SettingsOverviewScreen");
        });
        if (!React || !RN || !rendererOwner || !overviewOwner) return false;

        const { createElement: h } = React;
        const { View, Text, ScrollView, Pressable } = RN;
        const styles = {
            screen: { flex: 1, backgroundColor: "#111214" },
            body: { paddingHorizontal: 16, paddingTop: 22, paddingBottom: 44 },
            title: { color: "#f2f3f5", fontSize: 24, fontWeight: "700", marginBottom: 6 },
            copy: { color: "#b5bac1", fontSize: 14, lineHeight: 20, marginBottom: 22 },
            group: { overflow: "hidden", borderRadius: 10, backgroundColor: "#1e1f22", borderWidth: 1, borderColor: "#2b2d31" },
            row: { paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#2b2d31" },
            lastRow: { paddingHorizontal: 14, paddingVertical: 14 },
            rowTitle: { color: "#f2f3f5", fontSize: 16, fontWeight: "600" },
            rowCopy: { color: "#949ba4", fontSize: 13, marginTop: 3 }
        };

        function CloudCordSettings() {
            const rows = [
                ["Fake Profile", "Profile customization and shared profile controls"],
                ["BotCord", "BotCord settings and compatible features"],
                ["Diagnostics", "CloudCord runtime and compatibility information"]
            ];
            return h(ScrollView, { style: styles.screen, contentContainerStyle: styles.body },
                h(Text, { style: styles.title }, "CloudCord"),
                h(Text, { style: styles.copy }, "CloudCord is running in Discord 344 compatibility mode."),
                h(View, { style: styles.group }, rows.map((row, index) =>
                    h(Pressable, {
                        key: row[0],
                        style: index === rows.length - 1 ? styles.lastRow : styles.row,
                        onPress: () => console.log(`[CloudCord 344] ${row[0]} selected`)
                    }, h(Text, { style: styles.rowTitle }, row[0]), h(Text, { style: styles.rowCopy }, row[1]))
                ))
            );
        }

        try {
            rendererOwner.SETTING_RENDERER_CONFIG[ROUTE] = {
                type: "route",
                key: ROUTE,
                section: SECTION,
                useTitle: () => SECTION,
                title: () => SECTION,
                parent: null,
                screen: { route: ROUTE, getComponent: () => CloudCordSettings }
            };
        } catch (error) {
            record("renderer", error);
            return false;
        }

        try {
            const overviewKey = typeof overviewOwner.SettingsOverviewScreen === "function" ? "SettingsOverviewScreen" : "default";
            const original = overviewOwner[overviewKey];
            if (!original.__cloudCord344Patched) {
                const patched = function(...args) {
                    const result = original.apply(this, args);
                    try {
                        const sections = result?.props?.node?.sections;
                        if (Array.isArray(sections) && !sections.some(s => s?.label === SECTION)) {
                            sections.push({ label: SECTION, settings: [ROUTE] });
                        }
                    } catch (error) { record("overview-render", error); }
                    return result;
                };
                Object.defineProperty(patched, "__cloudCord344Patched", { value: true });
                overviewOwner[overviewKey] = patched;
            }
        } catch (error) {
            record("overview", error);
            return false;
        }

        state.installed = true;
        state.route = ROUTE;
        console.log("CloudCord 344 compatibility runtime ready");
        return true;
    }

    if (install()) return;
    const timer = setInterval(() => {
        if (install() || state.attempts >= 120) clearInterval(timer);
    }, 2000);
})();
