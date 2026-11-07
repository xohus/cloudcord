// Based on the GPL-3.0-or-later SplitLargeMessages behavior by Reycko.
const maxParts = 8;

export function planCxMessageParts(draft: unknown, premiumType: number | undefined) {
    const limit = premiumType === 2 ? 4000 : 2000;
    if (typeof draft !== "string" || draft.length > limit * maxParts) return;
    let remaining = draft.trim();
    if (remaining.length <= limit) return;

    const parts: string[] = [];
    while (remaining.length > limit) {
        if (parts.length === maxParts - 1) return;
        const space = Math.max(remaining.lastIndexOf(" ", limit - 1), remaining.lastIndexOf("\n", limit - 1));
        let end = space >= limit / 2 ? space + 1 : limit;
        const code = remaining.charCodeAt(end - 1);
        if (code >= 0xd800 && code <= 0xdbff) end--;
        const part = remaining.slice(0, end);
        if (!part.trim()) return;
        parts.push(part);
        remaining = remaining.slice(end);
    }
    if (!remaining.trim()) return;
    parts.push(remaining);
    return parts;
}

type SplitHost = {
    currentUser: () => { id: string; premiumType?: number; } | undefined | null;
    channel: (id: string) => { rateLimitPerUser?: number; rate_limit_per_user?: number; } | undefined | null;
    enabled: () => boolean;
    failed: () => void;
    wait?: () => Promise<unknown>;
};

function failedSend(result: unknown) {
    return result === false || Boolean(result && typeof result === "object"
        && (("ok" in result && result.ok === false) || ("status" in result && typeof result.status === "number" && result.status >= 400)));
}

export function createCxSplitSender(host: SplitHost) {
    const busy = new Set<string>();
    const wait = host.wait ?? (() => new Promise(resolve => setTimeout(resolve, 1000)));
    function plan(channelId: unknown, draft: unknown) {
        if (!host.enabled() || typeof channelId !== "string") return;
        const user = host.currentUser();
        const channel = host.channel(channelId);
        if (!user?.id || !channel || (channel.rateLimitPerUser ?? channel.rate_limit_per_user ?? 0) !== 0) return;
        const key = user.id + ":" + channelId;
        if (busy.has(key)) return;
        const parts = planCxMessageParts(draft, user.premiumType);
        if (parts) return { user: user.id, channelId, key, parts };
    }
    return {
        canSplit(channel: unknown, text: unknown) { return Boolean(plan(channel, text)); },
        send(args: unknown[], invoke: (args: unknown[]) => unknown) {
            const [channel, draft, ready, sendOptions] = args;
            const message = draft as Record<string, any> | undefined;
            const options = sendOptions as Record<string, any> | undefined;
            if (message?.tts || message?.attachments?.length || message?.stickers?.length || message?.stickerIds?.length
                || options?.uploads?.length || options?.stickers?.length || options?.stickerIds?.length || options?.scheduledTimestamp) return invoke(args);
            const pending = plan(channel, message?.content);
            if (!pending) return invoke(args);
            const { channelId, parts, key, user } = pending;
            busy.add(key);
            return (async () => {
                try {
                    const first = await invoke([channelId, { ...message, content: parts[0] }, ...args.slice(2)]);
                    if (failedSend(first)) return first;
                    for (const part of parts.slice(1)) {
                        await wait();
                        const currentChannel = host.channel(channelId);
                        if (!host.enabled() || host.currentUser()?.id !== user
                            || !currentChannel || (currentChannel.rateLimitPerUser ?? currentChannel.rate_limit_per_user ?? 0) !== 0) {
                            host.failed();
                            break;
                        }
                        try {
                            const followUp = await invoke([channelId, { content: part, validNonShortcutEmojis: message?.validNonShortcutEmojis ?? [],
                                invalidEmojis: [], tts: false }, ready, {
                                flags: (options?.flags ?? 0) & 4096,
                                ...(options?.allowedMentions ? { allowedMentions: { ...options.allowedMentions, repliedUser: false, replied_user: false } } : {}),
                            }]);
                            if (!failedSend(followUp)) continue;
                        } catch { /* Stop after the first failed follow-up. */ }
                        host.failed();
                        break;
                    }
                    return first;
                } finally {
                    busy.delete(key);
                }
            })();
        },
    };
}
