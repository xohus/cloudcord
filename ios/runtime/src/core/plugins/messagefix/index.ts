import { defineCorePlugin } from "..";
import { logger } from "@lib/utils/logger";

export default defineCorePlugin({
  manifest: {
    id: "bunny.messagefix",
    version: "1.0.0",
    type: "plugin",
    spec: 3,
    main: "",
    display: {
      name: "MessageFix",
      description: "Ensures messages include the required nonce parameter",
      authors: [ { name: "Win8.1VMUser"}, { name: "kmmiio99o.dev" }],
    },
  },

  start() {
    // Retain the plugin ID for persisted settings, but never replace Discord's
    // current send implementation or discard additional native arguments.
    logger.log("MessageFix: Retired - using Discord's native message sending");
  },

  stop() {
    // No native function was patched.
  },
});
