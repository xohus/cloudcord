/* SPDX-License-Identifier: GPL-3.0-or-later */

import { isCxProfileUserId } from "./cxProfileMenu";

type Notes = Record<string, string>;
type EditNote = (initial: string, save: (value: string) => Promise<void>) => void;

export const CX_USER_NOTE_LIMIT = 2000;
const tagPattern = /^[a-z0-9_]{1,32}$/i;

function normalizeTags(value: string) {
    const tags = new Map<string, string>();
    for (const line of value.split(/\r?\n/)) {
        const tag = line.trim();
        if (!tag) continue;
        if (!tagPattern.test(tag)) throw new Error("Use one tag per line, with up to 32 letters, numbers, or underscores.");
        tags.set(tag.toLowerCase(), tag);
    }
    if (tags.size > 20) throw new Error("Use up to 20 tags per user.");
    return [...tags.values()].join("\n");
}

function findTaggedUsers(query: string, entries: Notes | undefined) {
    const terms = query.trim().replace(/^&/, "").trim().toLowerCase().split(/\s+/);
    if (terms.length > 16 || terms.some(term => !tagPattern.test(term.replace(/^!/, ""))))
        return "Enter tag words such as friends or !muted. A leading ! matches users without that tag.";
    const matches = Object.entries(entries ?? {}).filter(([id, value]) => {
        if (!isCxProfileUserId(id) || typeof value !== "string" || !value.trim()) return false;
        const tags = value.toLowerCase().split("\n");
        return terms.some(term => term.startsWith("!")
            ? !tags.some(tag => tag.includes(term.slice(1)))
            : tags.some(tag => tag.includes(term)));
    });
    if (!matches.length) return "No tagged users match.";
    return "Matching users\n" + matches.slice(0, 25).map(([id]) => "<@" + id + ">").join("\n")
        + (matches.length > 25 ? "\n…and " + (matches.length - 25) + " more." : "");
}

export function createCxUserNotes(
    account: () => string | undefined,
    read: (id: string) => Promise<Notes | undefined>,
    update: (id: string, mutate: (notes: Notes | undefined) => Notes) => Promise<void>,
    enabled = () => true,
    kind: "notes" | "tags" = "notes",
) {
    let active = true;
    const current = (id: string) => active && enabled() && account() === id;
    return {
        async open(user: string, edit: EditNote) {
            const owner = account();
            if (!isCxProfileUserId(owner) || !isCxProfileUserId(user) || !current(owner)) return;
            const saved = (await read(owner))?.[user];
            if (!current(owner)) return;
            edit(typeof saved === "string" ? saved.slice(0, CX_USER_NOTE_LIMIT) : "", async value => {
                if (!current(owner)) return;
                if (value.length > CX_USER_NOTE_LIMIT) throw new Error("User notes can have up to 2,000 characters.");
                const text = kind === "tags" ? normalizeTags(value) : value;
                await update(owner, notes => {
                    if (!current(owner)) return notes ?? {};
                    const next = { ...notes };
                    if (text.trim()) {
                        if (!Object.hasOwn(next, user) && Object.keys(next).length >= 500) throw new Error("Clear an entry before adding another.");
                        next[user] = text;
                    } else delete next[user];
                    return next;
                });
            });
        },
        async search(query: string) {
            const owner = account();
            if (kind !== "tags" || !isCxProfileUserId(owner) || !current(owner)) return;
            const entries = await read(owner);
            if (current(owner)) return findTaggedUsers(query, entries);
        },
        async clear(confirm: () => Promise<boolean>) {
            const owner = account();
            if (!isCxProfileUserId(owner) || !current(owner) || !await confirm() || !current(owner)) return;
            await update(owner, notes => current(owner) ? {} : notes ?? {});
        },
        stop() { active = false; },
    };
}
