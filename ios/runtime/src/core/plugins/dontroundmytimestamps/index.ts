import { defineCorePlugin } from "..";
import { findByProps } from "@metro";

// Mobile version of the DontRoundMyTimestamps plugin by Lexi.
export default defineCorePlugin({
    manifest: {
        id: "cloudcord.dontroundmytimestamps",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "DontRoundMyTimestamps",
            description: "Relative times round down, so 7.6 years shows as 7 years, not 8",
            authors: [{ name: "Lexi" }],
        },
    },
    start() { findByProps("relativeTimeRounding", "locale")?.relativeTimeRounding?.(Math.floor); },
    stop() { findByProps("relativeTimeRounding", "locale")?.relativeTimeRounding?.(Math.round); },
});
