import { findByProps, findByStoreName } from "@metro";

/** Joins a voice channel through Discord's own action, if this Discord version has it. */
export function joinVoice(channelId: string) {
    const actions = findByProps("selectVoiceChannel");
    if (typeof actions?.selectVoiceChannel === "function") actions.selectVoiceChannel(channelId);
}

export const myVoiceChannelId = (): string | null => findByStoreName("SelectedChannelStore")?.getVoiceChannelId?.() ?? null;
export const myId = (): string | undefined => findByStoreName("UserStore")?.getCurrentUser?.()?.id;

export type VoiceState = { userId: string; channelId?: string | null; oldChannelId?: string | null; guildId?: string | null; };
