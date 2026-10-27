import { defineCorePlugin } from "..";
import { intercept } from "@lib/api/flux";
import { before } from "@lib/api/patcher";
import { findByProps, findByStoreName } from "@metro";
import { showToast } from "@lib/ui/toasts";

// Mobile version of the RelationshipNotifier plugin by nick: tells you when a friend removes you.
const FRIEND = 1;
// Removals you made yourself are remembered for a moment so they don't trigger a notice.
const removedByMe = new Map<string, number>();
let unpatches: (() => unknown)[] = [];

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.relationshipnotifier",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "RelationshipNotifier",
            description: "Shows a notice when a friend removes you",
            authors: [{ name: "nick" }],
        },
    },
    start() {
        const actions = findByProps("removeRelationship");
        if (actions) unpatches.push(before("removeRelationship", actions, args => { removedByMe.set(String(args[0]), Date.now()); return args; }));
        unpatches.push(intercept(payload => {
            if (payload.type !== "RELATIONSHIP_REMOVE") return undefined;
            const id = String(payload.relationship?.id ?? "");
            const byMe = Date.now() - (removedByMe.get(id) ?? 0) < 30_000;
            removedByMe.delete(id);
            const wasFriend = findByStoreName("RelationshipStore")?.getRelationshipType?.(id) === FRIEND || payload.relationship?.type === FRIEND;
            if (id && wasFriend && !byMe) {
                const user = findByStoreName("UserStore")?.getUser?.(id);
                const name = user?.globalName || user?.username || "Someone";
                setTimeout(() => showToast(`${name} removed you as a friend`), 0);
            }
            return undefined;
        }));
    },
    stop() { unpatches.forEach(unpatch => unpatch()); unpatches = []; removedByMe.clear(); },
});
