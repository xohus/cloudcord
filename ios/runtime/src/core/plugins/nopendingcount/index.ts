import { defineCorePlugin } from "..";
import { instead } from "@lib/api/patcher";
import { findByStoreName } from "@metro";

// Mobile version of the NoPendingCount plugin by amia.
let unpatches: (() => unknown)[] = [];

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.nopendingcount",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "NoPendingCount",
            description: "Hides the pending friend request count",
            authors: [{ name: "amia" }],
        },
    },
    start() {
        const relationships = findByStoreName("RelationshipStore");
        for (const name of ["getPendingCount", "getPendingIncomingCount"]) {
            if (typeof relationships?.[name] === "function") unpatches.push(instead(name, relationships, () => 0));
        }
    },
    stop() { unpatches.forEach(unpatch => unpatch()); unpatches = []; },
});
