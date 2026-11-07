type ReactionEmoji = { id: string | null; name: string; animated?: boolean; };
type CustomEmoji = { id?: string; name?: string; uniqueName?: string; animated?: boolean; available?: boolean; };
type EmojiStore = {
    getUsableCustomEmojiById?: (id: string) => CustomEmoji | undefined;
    getCustomEmojiById?: (id: string) => CustomEmoji | undefined;
    getUsableGuildEmoji?: (id?: string) => CustomEmoji[] | undefined;
    getGuilds?: () => Record<string, { usableEmojis?: CustomEmoji[]; emojis?: CustomEmoji[]; _emojis?: CustomEmoji[]; }>;
};
type CachedMessage = { id?: string; channel_id?: string; channelId?: string; };
type MessageCache = { _array?: CachedMessage[]; toArray?: () => CachedMessage[]; hasMoreAfter?: boolean; };
type Draft = { content?: string; reaction?: unknown; tts?: boolean; attachments?: unknown[]; stickers?: unknown[]; stickerIds?: unknown[]; };
type SendOptions = {
    uploads?: unknown[]; attachmentsToUpload?: unknown[]; stickers?: unknown[]; stickerIds?: unknown[];
    messageReference?: unknown; replyOptions?: { messageReference?: unknown; }; scheduledTimestamp?: unknown;
};

const shortcut = /^(\++)(?::([\w~-]+):|<a?:[\w~-]+:(\d{17,20})>|(\p{Extended_Pictographic}(?:\ufe0f|\p{Emoji_Modifier}|\u200d\p{Extended_Pictographic})*|\p{Regional_Indicator}{2}|[0-9#*]\ufe0f?\u20e3))$/u;
const snowflake = /^\d{17,20}$/;

export function createCxPlusReactionHandler(host: {
    messages: (channel: string) => MessageCache | undefined;
    guild: (channel: string) => string | undefined;
    emojis: () => EmojiStore | undefined;
    unicode: (name: string) => string | undefined;
    react: (channel: string, message: string, emoji: ReactionEmoji) => unknown;
    error: () => void;
}) {
    return (channel: unknown, message?: Draft, options?: SendOptions) => {
        if (typeof channel !== "string" || !snowflake.test(channel) || typeof message?.content !== "string"
            || message.reaction || message.tts || message.attachments?.length || message.stickers?.length || message.stickerIds?.length
            || options?.uploads?.length || options?.attachmentsToUpload?.length || options?.stickers?.length || options?.stickerIds?.length
            || options?.messageReference || options?.replyOptions?.messageReference || options?.scheduledTimestamp != null) return;
        const parsed = shortcut.exec(message.content.trim());
        if (!parsed) return;
        try {
            const [, pluses, shortcode, customId, rawEmoji] = parsed;
            const cache = host.messages(channel);
            if (cache?.hasMoreAfter) return;
            const list = cache?._array ?? cache?.toArray?.();
            const target = list?.[list.length - pluses.length];
            if (!target?.id || !snowflake.test(target.id) || (target.channel_id ?? target.channelId ?? channel) !== channel) return;
            let emoji: ReactionEmoji | undefined;
            if (rawEmoji) emoji = { id: null, name: rawEmoji };
            else {
                const store = host.emojis();
                const guild = host.guild(channel);
                const matches = (item: CustomEmoji) => item.available !== false && (item.uniqueName === shortcode || item.name === shortcode);
                const custom = customId
                    ? (store?.getUsableCustomEmojiById ?? store?.getCustomEmojiById)?.call(store, customId)
                    : (guild ? store?.getUsableGuildEmoji?.(guild)?.find(matches) : undefined)
                        ?? Object.values(store?.getGuilds?.() ?? {})
                            .flatMap(group => group.usableEmojis ?? group.emojis ?? group._emojis ?? []).find(matches);
                if (custom?.id && snowflake.test(custom.id) && custom.name && custom.available !== false) {
                    emoji = { id: custom.id, name: custom.name, animated: custom.animated === true };
                } else if (shortcode) {
                    const unicode = host.unicode(shortcode);
                    if (unicode) emoji = { id: null, name: unicode };
                }
            }
            if (!emoji) return;
            const { id } = target;
            const reaction = emoji;
            return Promise.resolve().then(() => host.react(channel, id, reaction)).then(() => undefined, () => {
                try { host.error(); } catch { /* A failed reaction must never send the shortcut as a message. */ }
            });
        } catch { /* Discord can still send the original message if its cache is unavailable. */ }
    };
}
