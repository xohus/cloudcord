/*
 * CloudCord, a Discord client mod
 * Copyright (c) 2026 CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Divider } from "@components/Divider";
import { FormSwitch } from "@components/FormSwitch";
import { Heading, HeadingTertiary } from "@components/Heading";
import { DeleteIcon, OpenExternalIcon, RobotIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { DataStore } from "@api/index";
import { Margins } from "@utils/margins";
import { relaunch } from "@utils/native";
import { Alerts, React, TextInput, Toasts, useEffect, useState } from "@webpack/common";

const DS_BOT_TOKENS = "CloudCord_BotTokens";
const DS_ACTIVE_BOT = "CloudCord_ActiveBot";

interface BotAccount {
    name: string;
    token: string;
    botId?: string;
    avatar?: string;
}

function BotCordComponent() {
    const [token, setToken] = useState("");
    const [botName, setBotName] = useState("");
    const [savedBots, setSavedBots] = useState<BotAccount[]>([]);
    const [activeBot, setActiveBot] = useState("");
    const [showToken, setShowToken] = useState(false);

    useEffect(() => {
        void Promise.all([
            DataStore.get<BotAccount[]>(DS_BOT_TOKENS),
            DataStore.get<string>(DS_ACTIVE_BOT)
        ]).then(([bots, active]) => {
            setSavedBots(Array.isArray(bots) ? bots : []);
            setActiveBot(active ?? "");
        }).catch(() => {
            setSavedBots([]);
            setActiveBot("");
        });
    }, []);

    const saveBotsList = (list: BotAccount[]) => {
        setSavedBots(list);
        void DataStore.set(DS_BOT_TOKENS, list);
    };

    const handleAddBot = () => {
        const trimmed = token.trim();
        if (!trimmed) {
            Toasts.show({ id: "bot-token-empty", message: "Please enter a valid bot token", type: Toasts.Type.FAILURE });
            return;
        }
        const name = botName.trim() || `Bot ${savedBots.length + 1}`;
        const newBots = [...savedBots.filter(b => b.token !== trimmed), { name, token: trimmed }];
        saveBotsList(newBots);
        setToken("");
        setBotName("");
        Toasts.show({ id: "bot-token-added", message: `Saved ${name} successfully!`, type: Toasts.Type.SUCCESS });
    };

    const handleLoginAsBot = (botToken: string, name: string) => {
        Alerts.show({
            title: `Switch to ${name}?`,
            body: "Logging in as a bot will reload Discord with bot credentials. Do you want to proceed?",
            confirmText: "Login & Reload",
            cancelText: "Cancel",
            onConfirm() {
                try {
                    const storage = globalThis.localStorage;
                    if (!storage) throw new Error("Discord token storage is unavailable in this client version");
                    void DataStore.set(DS_ACTIVE_BOT, botToken);
                    storage.setItem("token", `"${botToken}"`);
                    relaunch();
                } catch (e: any) {
                    Toasts.show({ id: "bot-login-fail", message: "Failed to switch account: " + e.message, type: Toasts.Type.FAILURE });
                }
            }
        });
    };

    const handleDeleteBot = (botToken: string) => {
        const updated = savedBots.filter(b => b.token !== botToken);
        saveBotsList(updated);
        if (activeBot === botToken) {
            void DataStore.del(DS_ACTIVE_BOT);
            setActiveBot("");
        }
        Toasts.show({ id: "bot-deleted", message: "Bot removed from list", type: Toasts.Type.SUCCESS });
    };

    return (
        <SettingsTab>
            <Paragraph className={Margins.bottom16}>
                BotCord lets you manage, test, and login directly with Discord Bot tokens inside CloudCord.
            </Paragraph>

            <Card style={{ padding: "16px", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <HeadingTertiary>Add Bot Account</HeadingTertiary>
                <TextInput
                    placeholder="Bot Nickname (e.g. Test Bot)"
                    value={botName}
                    onChange={setBotName}
                />
                <TextInput
                    placeholder="Bot Token (e.g. MTAx...)"
                    value={token}
                    type={showToken ? "text" : "password"}
                    onChange={setToken}
                />
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <Button onClick={handleAddBot}>Save Bot</Button>
                    <Button
                        variant="link"
                        onClick={() => setShowToken(!showToken)}
                    >
                        {showToken ? "Hide Token" : "Show Token"}
                    </Button>
                    <Button
                        variant="link"
                        onClick={() => window.open("https://discord.com/developers/applications", "_blank")}
                    >
                        Developer Portal <OpenExternalIcon style={{ marginLeft: "4px", width: "16px", height: "16px" }} />
                    </Button>
                </div>
            </Card>

            <Divider className={Margins.bottom16} />

            <Heading tag="h2" className={Margins.bottom16}>Saved Bots ({savedBots.length})</Heading>

            {savedBots.length === 0 ? (
                <Paragraph style={{ opacity: 0.7 }}>No bot tokens saved yet. Add one above to get started.</Paragraph>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {savedBots.map((bot, idx) => (
                        <Card key={idx} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <RobotIcon style={{ width: "24px", height: "24px", opacity: 0.8 }} />
                                <div>
                                    <div style={{ fontWeight: 600 }}>{bot.name}</div>
                                    <div style={{ fontSize: "12px", opacity: 0.6 }}>Token: ••••••••••••••••••••</div>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <Button
                                    size="small"
                                    onClick={() => handleLoginAsBot(bot.token, bot.name)}
                                >
                                    Login
                                </Button>
                                <Button
                                    size="small"
                                    variant="dangerSecondary"
                                    onClick={() => handleDeleteBot(bot.token)}
                                >
                                    <DeleteIcon style={{ width: "16px", height: "16px" }} />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </SettingsTab>
    );
}

export default wrapTab(BotCordComponent, "BotCord");
