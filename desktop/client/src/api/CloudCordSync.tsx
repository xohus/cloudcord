/*
 * CloudCord desktop adapter for the Cloud Sync service used by CloudCord mobile.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { exportSettings, importSettings } from "@api/SettingsSync/offline";
import { OAuth2AuthorizeModal, openModal, React, UserStore } from "@webpack/common";

const HOST = "https://dc.cloudsync.nexpid.xyz/";
const CLIENT_ID = "1120793656878714913";
const REDIRECT_URI = `${HOST}api/auth/authorize`;
const TOKEN_KEY = "CloudCord_CloudSyncTokens";
const DESKTOP_BACKUP_KEY = "https://github.com/xohus/cloudcord/desktop";
const listeners = new Set<() => void>();

function userId() {
    const id = UserStore.getCurrentUser()?.id;
    if (!id) throw new Error("Log in to Discord before connecting Cloud Sync.");
    return id;
}

async function tokens() {
    return await DataStore.get<Record<string, string>>(TOKEN_KEY) ?? {};
}

export async function getCloudCordSyncToken() {
    return (await tokens())[userId()];
}

async function setToken(token?: string) {
    const all = await tokens();
    if (token) all[userId()] = token;
    else delete all[userId()];
    await DataStore.set(TOKEN_KEY, all);
    listeners.forEach(listener => listener());
}

export function useCloudCordSyncAuthorization() {
    const [authorized, setAuthorized] = React.useState(false);
    React.useEffect(() => {
        const update = () => getCloudCordSyncToken().then(value => setAuthorized(Boolean(value))).catch(() => setAuthorized(false));
        listeners.add(update);
        update();
        return () => { listeners.delete(update); };
    }, []);
    return authorized;
}

export function connectCloudCordSync(onResult?: (message: string) => void) {
    openModal(props => <OAuth2AuthorizeModal
        {...props}
        clientId={CLIENT_ID}
        scopes={["identify"]}
        permissions={0n}
        responseType="code"
        redirectUri={REDIRECT_URI}
        cancelCompletesFlow={false}
        callback={async ({ location }: any) => {
            if (!location) return;
            try {
                const response = await fetch(location);
                if (!response.ok) throw new Error(`Cloud Sync authorization failed (${response.status}).`);
                const token = (await response.text()).trim();
                if (!token) throw new Error("Cloud Sync returned no access token.");
                await setToken(token);
                onResult?.("Connected to the same Cloud Sync service used by CloudCord mobile.");
            } catch (error) {
                onResult?.(error instanceof Error ? error.message : String(error));
            }
        }}
    />);
}

export async function disconnectCloudCordSync() {
    await setToken();
}

async function request(path: string, init?: RequestInit) {
    const token = await getCloudCordSyncToken();
    if (!token) throw new Error("Connect Cloud Sync first.");
    const response = await fetch(new URL(path, HOST), {
        ...init,
        headers: { Authorization: token, ...init?.headers }
    });
    if (!response.ok) {
        if (response.status === 401) await setToken();
        let message = `Cloud Sync request failed (${response.status}).`;
        try { message = (await response.json())?.message ?? message; } catch { }
        throw new Error(message);
    }
    return response;
}

export async function uploadCloudCordSettings() {
    const backup = await exportSettings({ syncDataStore: true, type: "all", minify: true });
    let cloudData: any = { plugins: {}, themes: {}, fonts: { installed: {}, custom: [] } };
    try { cloudData = await (await request("api/data")).json(); } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("404")) throw error;
    }
    cloudData.plugins ??= {};
    cloudData.themes ??= {};
    cloudData.fonts ??= { installed: {}, custom: [] };
    cloudData.plugins[DESKTOP_BACKUP_KEY] = { enabled: true, storage: backup };
    await request("api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cloudData)
    });
}

export async function restoreCloudCordSettings() {
    const cloudData = await (await request("api/data")).json();
    const backup = cloudData?.plugins?.[DESKTOP_BACKUP_KEY]?.storage;
    if (typeof backup !== "string" || !backup) throw new Error("No CloudCord desktop backup exists in Cloud Sync yet.");
    await importSettings(backup, "all", true);
}

export async function deleteCloudCordSettings() {
    const cloudData = await (await request("api/data")).json();
    if (cloudData?.plugins) delete cloudData.plugins[DESKTOP_BACKUP_KEY];
    await request("api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cloudData)
    });
}

export const CLOUDCORD_SYNC_HOST = HOST;

