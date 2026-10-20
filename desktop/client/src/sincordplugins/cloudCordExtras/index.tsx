/*
 * CloudCord, a Discord client mod
 * Copyright (c) 2026 CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { SincordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Alerts, Button, FluxDispatcher, GuildStore, Menu, RelationshipStore, RestAPI, showToast, Toasts, UserStore } from "@webpack/common";

const INCOMING_REQUEST = 3;
// Users we showed a local-only incoming request from, so we can take it back.
const fakeRequests = new Set<string>();

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function leavableGuilds() {
    const me = UserStore.getCurrentUser()?.id;
    return Object.values(GuildStore.getGuilds()).filter((guild: any) => guild && guild.ownerId !== me);
}

let leaving = false;
async function leaveAllServers() {
    if (leaving) return;
    leaving = true;
    const guilds = leavableGuilds();
    let left = 0;
    try {
        for (const guild of guilds as any[]) {
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    await RestAPI.del({ url: `/users/@me/guilds/${guild.id}`, body: { lurking: false } });
                    left++;
                    break;
                } catch (error: any) {
                    // Wait out rate limits instead of hammering the API.
                    const retry = Number(error?.body?.retry_after ?? error?.retryAfter);
                    if (error?.status === 429 && Number.isFinite(retry)) { await sleep(retry * 1000 + 250); continue; }
                    break;
                }
            }
            await sleep(1200);
        }
    } finally {
        leaving = false;
    }
    showToast(`Left ${left} of ${guilds.length} servers.`, left === guilds.length ? Toasts.Type.SUCCESS : Toasts.Type.FAILURE);
}

function confirmLeaveAll() {
    const count = leavableGuilds().length;
    if (!count) { showToast("There are no servers you can leave (servers you own are skipped).", Toasts.Type.MESSAGE); return; }
    Alerts.show({
        title: "Leave all servers?",
        body: `You will leave ${count} server${count === 1 ? "" : "s"}. Servers you own are skipped. This can't be undone, and you'll need new invites to rejoin.`,
        confirmText: `Leave ${count} server${count === 1 ? "" : "s"}`,
        cancelText: "Cancel",
        confirmColor: "red",
        onConfirm: () => {
            Alerts.show({
                title: "Are you sure?",
                body: "This is your last chance to cancel. Leaving runs slowly in the background to avoid rate limits.",
                confirmText: "Yes, leave them all",
                cancelText: "Cancel",
                confirmColor: "red",
                onConfirm: () => { void leaveAllServers(); }
            });
        }
    });
}

async function resetEverything() {
    try { await DataStore.clear(); } catch { }
    try {
        for (const key of Object.keys(localStorage)) {
            if (/^(customProfile|cloudcord|CloudCord|Vencord|sincord)/i.test(key)) localStorage.removeItem(key);
        }
    } catch { }
    try { await VencordNative.settings.set({} as any); } catch { }
    location.reload();
}

function confirmReset() {
    Alerts.show({
        title: "Reset CloudCord?",
        body: "This turns off every plugin change, deletes your custom profile, badges, themes settings and all saved CloudCord data on this device, then restarts Discord as if CloudCord was just installed. Your Discord account is not touched.",
        confirmText: "Reset everything",
        cancelText: "Cancel",
        confirmColor: "red",
        onConfirm: () => { void resetEverything(); }
    });
}

function addFakeRequest(user: any) {
    if (RelationshipStore.getRelationshipType(user.id) !== 0) {
        showToast("You already have a relationship with this user.", Toasts.Type.FAILURE);
        return;
    }
    fakeRequests.add(user.id);
    FluxDispatcher.dispatch({
        type: "RELATIONSHIP_ADD",
        relationship: { id: user.id, type: INCOMING_REQUEST, user, since: new Date().toISOString(), nickname: null },
        shouldNotify: true
    });
}

function removeFakeRequest(userId: string) {
    fakeRequests.delete(userId);
    FluxDispatcher.dispatch({ type: "RELATIONSHIP_REMOVE", relationship: { id: userId, type: INCOMING_REQUEST } });
}

const userContextPatch: NavContextMenuPatchCallback = (children, { user }: any) => {
    if (!user?.id || user.id === UserStore.getCurrentUser()?.id || user.bot) return;
    children.push(<Menu.MenuGroup>
        {fakeRequests.has(user.id)
            ? <Menu.MenuItem id="cc-fake-request-remove" label="Remove fake friend request" action={() => removeFakeRequest(user.id)} />
            : <Menu.MenuItem id="cc-fake-request" label="Fake friend request (only you see it)" action={() => addFakeRequest(user)} />}
    </Menu.MenuGroup>);
};

const settings = definePluginSettings({
    tools: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
                <Button color={Button.Colors.RED} onClick={confirmLeaveAll}>Leave all servers</Button>
                <p style={{ color: "var(--text-muted)", marginTop: 6 }}>Leaves every server except ones you own. You'll be asked twice.</p>
            </div>
            <div>
                <Button color={Button.Colors.RED} onClick={confirmReset}>Reset CloudCord</Button>
                <p style={{ color: "var(--text-muted)", marginTop: 6 }}>Deletes everything CloudCord saved on this device and restarts like a fresh install.</p>
            </div>
        </div>
    }
});

export default definePlugin({
    name: "CloudCordExtras",
    description: "Leave all servers, reset CloudCord to a fresh install, and show a local-only fake friend request from anyone.",
    authors: [SincordDevs.nobody],
    enabledByDefault: true,
    settings,
    contextMenus: { "user-context": userContextPatch },
    toolboxActions: {
        "Leave all servers": confirmLeaveAll,
        "Reset CloudCord": confirmReset
    },
    stop() {
        for (const id of [...fakeRequests]) removeFakeRequest(id);
    }
});
