import { defineCorePlugin } from "..";
import { findByProps } from "@metro";
import { logger } from "@lib/utils/logger";

const MessageActions = findByProps("sendMessage");
let originalSendMessage: Function;

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
    originalSendMessage = MessageActions.sendMessage;

    MessageActions.sendMessage = function (
      channelId,
      message,
      replyRef,
      options,
    ) {
      options = options || {};
      options.nonce = options.nonce || (BigInt(Date.now() - 1420070400000) << 22n).toString();

      return originalSendMessage.call(
        this,
        channelId,
        message,
        replyRef,
        options,
      );
    };

    logger.log("MessageFix: Enabled - adding nonce to all messages");
  },

  stop() {
    if (originalSendMessage) MessageActions.sendMessage = originalSendMessage;
    logger.log("MessageFix: Disabled");
  },
});
