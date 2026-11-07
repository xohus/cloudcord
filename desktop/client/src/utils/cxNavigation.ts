/* SPDX-License-Identifier: GPL-3.0-or-later */

type NavigationControl = "jump-to-first-message" | "read-all-servers-button";

export function createCxNavigationControls() {
    const active = new Map<NavigationControl, { count: number; stop?: () => void; }>();
    return {
        has: (control: NavigationControl) => active.has(control),
        register(control: NavigationControl, install?: () => () => void) {
            let binding = active.get(control);
            if (!binding) {
                binding = { count: 0, stop: install?.() };
                active.set(control, binding);
            }
            let registered = true;
            binding.count++;
            return () => {
                if (!registered) return;
                registered = false;
                if (--binding.count === 0) {
                    active.delete(control);
                    binding.stop?.();
                }
            };
        },
    };
}

export type CxNavigationChannel = { id?: string; type?: number; isForumPost?: () => boolean; };

// JumpToTop by Kaerion (GPL-3.0-or-later).
export function getCxFirstMessageTarget(channel: CxNavigationChannel | undefined) {
    if (!channel || typeof channel.id !== "string" || !/^\d{17,20}$/.test(channel.id) || channel.isForumPost?.()) return;
    if (channel.type === undefined || ![0, 1, 2, 3, 5, 10, 11, 12, 13].includes(channel.type)) return;
    return { channelId: channel.id, messageId: channel.id, flash: false, jumpType: "INSTANT" } as const;
}
