/* SPDX-License-Identifier: GPL-3.0-or-later */

export type CxChannelLabel = { id?: string; name?: string; type?: number; guild_id?: string | null; };

export function getCxChannelNameCopy(channel: CxChannelLabel & { recipients?: readonly string[]; }, username: (id: string) => string | undefined) {
    if (typeof channel.id !== "string" || !/^\d{17,20}$/.test(channel.id)) return;
    const label = channel.type === 4 ? "Copy Category Name" : "Copy Channel Name";
    const recipient = channel.recipients?.[0];
    const name = channel.name || (channel.type === 1 ? (recipient && username(recipient)) || "Direct Message"
        : channel.type === 3 ? "Group DM" : channel.id);
    return { label, name };
}

// CleanChannelName by AutumnVN (GPL-3.0-or-later).
const smallCaps = Object.fromEntries([..."ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ"].map((letter, index) => [letter, "abcdefghijklmnopqrstuvwxyz"[index]]));

export function cleanChannelName(name: string, type: number) {
    return name.normalize("NFKC")
        .replace(/[ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ]/g, letter => smallCaps[letter])
        .replace(/[^ -~]?\p{Extended_Pictographic}[^ -~]?/ug, "")
        .replace(/-?[^\p{Letter} -~]-?/ug, [2, 4].includes(type) ? " " : "-")
        .replace(/(^-|-$)/g, "")
        .replace(/-+/g, "-") || name;
}

// Reimplements the default BetterChatNames behavior described by Break.
// https://betterdiscord.app/plugins/BetterChatNames
const conventionalCase = new Map(["a", "and", "at", "for", "of", "or", "the", "to", "FAQ", "GitHub", "VC"]
    .map(word => [word.toLowerCase(), word]));

export function formatCxChannelName(label: string, channel: CxChannelLabel, modes: { clean: number; titles: number; }) {
    if (typeof channel.type !== "number" || !channel.name || !label) return label;
    const cleaned = modes.clean ? cleanChannelName(label, channel.type) : label;
    if (!modes.titles || !channel.guild_id) return cleaned;
    return cleaned.replace(/[-_]+/g, " ").trim().replace(/\p{L}[\p{L}\p{M}\d]*(?:['’][\p{L}\p{M}\d]+)*/gu,
        (word, index) => {
            const conventional = conventionalCase.get(word.toLowerCase());
            if (conventional && (index > 0 || conventional !== conventional.toLowerCase())) return conventional;
            return word.replace(/^\p{L}/u, letter => letter.toUpperCase());
        }) || cleaned;
}
