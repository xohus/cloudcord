import type { IncomingPayload, IncomingRule } from "./cxIncoming";
import { overrideCxMethods } from "./cxNativeEffects";

type SocialContext = {
    currentUser: () => string | undefined;
    isFriend: (id: string) => boolean;
    userName: (id: string) => string | undefined | null;
    channelName: (id: string) => string | undefined;
    voiceChannel: () => string | null | undefined;
    joinVoice: (id: string) => void;
    notify: (message: string) => void;
    removalActions: () => object | undefined;
    enabled: () => boolean;
};

const isId = (id: unknown): id is string => typeof id === "string" && /^\d{17,20}$/.test(id);
const label = (name: string | null | undefined, fallback: string) => name?.replace(/[\r\n\t]/g, " ").slice(0, 100).trim() || fallback;

export function bindCxSocialEvents(rules: readonly IncomingRule[], context: SocialContext) {
    const watchFriends = rules.find(rule => rule.kind === "friends-voice");
    const follow = rules.find(rule => rule.kind === "follow-voice")?.values[0];
    const watchRemoval = rules.some(rule => rule.kind === "friend-removals");
    if (!watchFriends && !follow && !watchRemoval) return;

    let active = true;
    let account: string | undefined;
    let pending: string | undefined;
    const lastChannel = new Map<string, string>();
    const recentRemovals = new Map<string, number>();
    function reset() {
        pending = undefined;
        lastChannel.clear();
        recentRemovals.clear();
    }
    function boundAccount() {
        const current = context.currentUser();
        if (account !== current) {
            reset();
            account = current;
        }
        return current;
    }
    function remember<T>(map: Map<string, T>, id: string, value: T) {
        if (map.size >= 256 && !map.has(id)) map.delete(map.keys().next().value!);
        map.set(id, value);
    }
    const stopRemoval = watchRemoval ? overrideCxMethods(context.removalActions(), {
        removeRelationship(args, invoke) {
            const id = args[0];
            try {
                if (boundAccount() && isId(id)) remember(recentRemovals, id, Date.now());
            } catch { /* Let Discord remove the relationship normally. */ }
            return invoke(args);
        },
    }, context.enabled) : undefined;

    return {
        observe(payload: IncomingPayload) {
            if (!active || !context.enabled() || !["CONNECTION_OPEN", "LOGOUT", "RELATIONSHIP_ADD", "RELATIONSHIP_REMOVE", "VOICE_STATE_UPDATES"].includes(payload.type)) return;
            const me = boundAccount();
            if (!me) return;
            if (payload.type === "CONNECTION_OPEN" || payload.type === "LOGOUT") {
                reset();
                return;
            }
            if (watchRemoval && (payload.type === "RELATIONSHIP_ADD" || payload.type === "RELATIONSHIP_REMOVE")) {
                const id = payload.relationship?.id;
                if (!isId(id) || id === me) return;
                if (payload.type === "RELATIONSHIP_ADD") {
                    recentRemovals.delete(id);
                    return;
                }
                const previous = recentRemovals.get(id);
                const now = Date.now();
                if ((previous === undefined || now - previous >= 30_000)
                    && (payload.relationship?.type === 1 || context.isFriend(id))) {
                    remember(recentRemovals, id, now);
                    context.notify(label(context.userName(id), "Someone") + " removed you as a friend");
                }
                return;
            }
            if ((!watchFriends && !follow) || payload.type !== "VOICE_STATE_UPDATES" || !Array.isArray(payload.voiceStates)) return;
            for (const state of payload.voiceStates) {
                const id = state?.userId;
                if (!isId(id) || id === me || !context.isFriend(id)) continue;
                const watch = watchFriends && (!watchFriends.values.length || watchFriends.values.includes(id));
                if (id !== follow && !watch) continue;
                const channel = state.channelId;
                const previous = lastChannel.get(id) ?? state.oldChannelId;
                if (!isId(channel)) {
                    lastChannel.delete(id);
                    if (id === follow) pending = undefined;
                    continue;
                }
                remember(lastChannel, id, channel);
                if (previous === channel) continue;
                if (watch) context.notify(label(context.userName(id), "A friend") + " joined " + label(context.channelName(channel), "a voice channel"));
                if (id !== follow || pending === channel) continue;
                const current = context.voiceChannel();
                if (!current || current === channel) continue;
                pending = channel;
                void Promise.resolve().then(() => {
                    if (pending !== channel) return;
                    pending = undefined;
                    if (!active || !context.enabled() || context.currentUser() !== me || !context.isFriend(id)
                        || lastChannel.get(id) !== channel || context.voiceChannel() !== current) return;
                    context.joinVoice(channel);
                }).catch(() => { /* The destination may have become unavailable. */ });
            }
        },
        stop() {
            active = false;
            reset();
            stopRemoval?.();
        },
    };
}
