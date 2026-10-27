import { defineCorePlugin } from "..";
import { instead } from "@lib/api/patcher";
import { findByProps } from "@metro";

// Mobile version of the SilentTyping plugin by Ven, Rini, ImBanana and Etorix.
let unpatches: (() => unknown)[] = [];

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.silenttyping",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "SilentTyping",
            description: "Others don't see you typing",
            authors: [{ name: "Ven" }, { name: "Rini" }, { name: "ImBanana" }, { name: "Etorix" }],
        },
    },
    start() {
        const typing = findByProps("startTyping", "stopTyping");
        if (!typing) return;
        unpatches = ["startTyping", "stopTyping"].map(name => instead(name, typing, () => undefined));
    },
    stop() { unpatches.forEach(unpatch => unpatch()); unpatches = []; },
});
