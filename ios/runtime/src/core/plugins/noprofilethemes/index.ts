import { defineCorePlugin } from "..";
import { findByStoreName } from "@metro";

import { onProfileLoad } from "../shared/profiles";

// Mobile version of the NoProfileThemes plugin by TheKodeToad.
let stop: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.noprofilethemes",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "NoProfileThemes",
            description: "Removes Nitro profile themes from everyone but you",
            authors: [{ name: "TheKodeToad" }],
        },
    },
    start() {
        stop = onProfileLoad((profile, userId) => {
            if (userId === findByStoreName("UserStore")?.getCurrentUser?.()?.id) return;
            delete profile.theme_colors; delete profile.themeColors;
        });
    },
    stop() { stop?.(); stop = undefined; },
});
