import { defineCorePlugin } from "..";
import { findByStoreName } from "@metro";

import { filterMessages } from "../shared/messageFilter";

// Mobile version of the NoBlockedMessages plugin by rushii, Samu, jamesbt365, Elvyra and Etorix.
let stopFilter: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.noblockedmessages",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "NoBlockedMessages",
            description: "Hides messages from people you blocked instead of showing \"blocked message\"",
            authors: [{ name: "rushii" }, { name: "Samu" }, { name: "jamesbt365" }, { name: "Elvyra" }, { name: "Etorix" }],
        },
    },
    start() {
        const relationships = findByStoreName("RelationshipStore");
        stopFilter = filterMessages(message => !!message.author?.id && relationships?.isBlocked?.(message.author.id) === true);
    },
    stop() { stopFilter?.(); stopFilter = undefined; },
});
