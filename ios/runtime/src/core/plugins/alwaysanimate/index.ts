import { defineCorePlugin } from "..";
import { before } from "@lib/api/patcher";
import { findByProps } from "@metro";

// Mobile version of the AlwaysAnimate plugin by FieryFlames: animated avatars, server icons
// and banners always play instead of only when focused.
let unpatches: (() => unknown)[] = [];

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.alwaysanimate",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "AlwaysAnimate",
            description: "Animated avatars, server icons and banners always animate",
            authors: [{ name: "FieryFlames" }],
        },
    },
    start() {
        const icons = findByProps("getUserAvatarURL", "getGuildIconURL");
        if (!icons) return;
        // (user, canAnimate, size): turn canAnimate on.
        for (const name of ["getUserAvatarURL", "getUserBannerURL", "getGuildMemberAvatarURL"]) {
            if (typeof icons[name] === "function") unpatches.push(before(name, icons, args => { args[1] = true; return args; }));
        }
        // Guild icons take an options object with canAnimate.
        if (typeof icons.getGuildIconURL === "function")
            unpatches.push(before("getGuildIconURL", icons, args => { if (args[0] && typeof args[0] === "object") args[0] = { ...args[0], canAnimate: true }; return args; }));
    },
    stop() { unpatches.forEach(unpatch => unpatch()); unpatches = []; },
});
