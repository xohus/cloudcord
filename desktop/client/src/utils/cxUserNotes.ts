/* SPDX-License-Identifier: GPL-3.0-or-later */

import { isCxProfileUserId } from "./cxProfileMenu";

type Notes = Record<string, string>;
type EditNote = (initial: string, save: (value: string) => Promise<void>) => void;

export const CX_USER_NOTE_LIMIT = 2000;

export function createCxUserNotes(
    account: () => string | undefined,
    read: (id: string) => Promise<Notes | undefined>,
    update: (id: string, mutate: (notes: Notes | undefined) => Notes) => Promise<void>,
    enabled = () => true,
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
                await update(owner, notes => {
                    if (!current(owner)) return notes ?? {};
                    const next = { ...notes };
                    if (value.trim()) {
                        if (!Object.hasOwn(next, user) && Object.keys(next).length >= 500) throw new Error("Clear a note before adding another.");
                        next[user] = value;
                    } else delete next[user];
                    return next;
                });
            });
        },
        async clear(confirm: () => Promise<boolean>) {
            const owner = account();
            if (!isCxProfileUserId(owner) || !current(owner) || !await confirm() || !current(owner)) return;
            await update(owner, notes => current(owner) ? {} : notes ?? {});
        },
        stop() { active = false; },
    };
}
