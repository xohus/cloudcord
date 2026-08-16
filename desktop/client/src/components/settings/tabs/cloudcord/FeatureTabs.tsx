/*
 * CloudCord, a Discord desktop client mod
 * Copyright (c) 2026 Xohus
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { Settings } from "@api/Settings";
import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { Notice } from "@components/Notice";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";
import { TextInput, useEffect, useState } from "@webpack/common";

import Plugins from "~plugins";

interface BotCordAccount {
    id: string;
    username: string;
    token: string;
}

const BOTCORD_ACCOUNTS_KEY = "CloudCord_BotCordAccounts";

function BotCord() {
    const [accounts, setAccounts] = useState<BotCordAccount[]>([]);
    const [token, setToken] = useState("");
    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        DataStore.get<BotCordAccount[]>(BOTCORD_ACCOUNTS_KEY).then(value => setAccounts(value ?? []));
    }, []);

    async function save(next: BotCordAccount[]) {
        setAccounts(next);
        await DataStore.set(BOTCORD_ACCOUNTS_KEY, next);
    }

    async function addAccount() {
        const cleanToken = token.trim().replace(/^Bot\s+/i, "");
        if (!cleanToken) return;

        setBusy(true);
        setStatus("Checking bot token...");
        try {
            const response = await fetch("https://discord.com/api/v10/users/@me", {
                headers: { Authorization: `Bot ${cleanToken}` }
            });
            if (!response.ok) throw new Error("Discord rejected this bot token.");

            const user = await response.json();
            if (!user.bot) throw new Error("This token does not belong to a bot account.");

            const next = accounts.filter(account => account.id !== user.id);
            next.push({ id: user.id, username: user.global_name || user.username, token: cleanToken });
            await save(next);
            setToken("");
            setStatus(`${user.global_name || user.username} is ready in BotCord.`);
        } catch (error) {
            setStatus(error instanceof Error ? error.message : "Could not add this bot account.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <SettingsTab>
            <Heading className={Margins.top16}>BotCord</Heading>
            <Paragraph className={Margins.bottom16}>
                Add bot accounts to CloudCord. Tokens stay in this desktop installation and are preserved by installer updates.
            </Paragraph>
            <Notice.Warning className={Margins.bottom16}>
                Treat bot tokens like passwords. Never paste a user-account token here.
            </Notice.Warning>
            <Flex gap="8px" alignItems="center">
                <div style={{ flex: 1 }}>
                    <TextInput
                        type="password"
                        value={token}
                        onChange={setToken}
                        placeholder="Bot token"
                    />
                </div>
                <Button disabled={busy || !token.trim()} onClick={addAccount}>
                    {busy ? "Adding..." : "Add Bot"}
                </Button>
            </Flex>
            {status && <Paragraph className={Margins.top8}>{status}</Paragraph>}

            <Divider className={Margins.top20} />
            <Heading className={Margins.top20}>Saved bots</Heading>
            {accounts.length === 0
                ? <Paragraph>No BotCord accounts yet.</Paragraph>
                : accounts.map(account => (
                    <Flex key={account.id} gap="8px" alignItems="center" className={Margins.top8}>
                        <div style={{ flex: 1 }}>
                            <Paragraph><strong>{account.username}</strong></Paragraph>
                            <Paragraph color="text-muted">{account.id}</Paragraph>
                        </div>
                        <Button variant="dangerSecondary" onClick={() => save(accounts.filter(item => item.id !== account.id))}>
                            Remove
                        </Button>
                    </Flex>
                ))}
        </SettingsTab>
    );
}

function FakeProfile() {
    const plugin = Plugins.FakeProfileThemes;
    const [enabled, setEnabled] = useState(Settings.plugins[plugin.name]?.enabled ?? false);
    const SettingsComponent = plugin.settingsAboutComponent;

    return (
        <SettingsTab>
            <Heading className={Margins.top16}>Fake Profile</Heading>
            <Paragraph className={Margins.bottom16}>
                Preview and publish custom profile colors without Nitro. The encoded colors are copied into your bio and decoded locally by compatible clients.
            </Paragraph>
            <FormSwitch
                title="Enable Fake Profile"
                description="A Discord restart is required after changing this setting."
                value={enabled}
                onChange={value => {
                    Settings.plugins[plugin.name].enabled = value;
                    setEnabled(value);
                }}
                hideBorder
            />
            {enabled && SettingsComponent && <SettingsComponent />}
        </SettingsTab>
    );
}

export const BotCordTab = wrapTab(BotCord, "BotCord");
export const FakeProfileTab = wrapTab(FakeProfile, "Fake Profile");

