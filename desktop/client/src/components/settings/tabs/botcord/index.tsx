/*
 * CloudCord, a Discord client mod
 * Copyright (c) 2026 CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Divider } from "@components/Divider";
import { Heading, HeadingTertiary } from "@components/Heading";
import { DeleteIcon, OpenExternalIcon, RobotIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";
import { Alerts, React, TextInput, Toasts, useEffect, useState } from "@webpack/common";

import { BotIdentity, closeBotCordClient, openBotCordClient, requestBotApi } from "./BotCordClient";

// Old builds kept tokens here in plain text; they're moved to secure storage on load.
const DS_LEGACY_BOT_TOKENS = "CloudCord_BotTokens";
const DS_ACTIVE_BOT = "CloudCord_ActiveBot";
const normalizeBotToken = (value: string) => value.replace(/^Bot\s+/i, "").trim();

interface BotAccount {
    id: string;
    name: string;
}

/** Moves bots saved by older builds out of plain-text storage. Returns old token → new id. */
async function migrateLegacyBots() {
    const legacy = await DataStore.get<Array<{ name: string; token: string; }>>(DS_LEGACY_BOT_TOKENS);
    const ids = new Map<string, string>();
    if (!Array.isArray(legacy) || !legacy.length) return ids;
    for (const bot of legacy) {
        if (!bot?.token) continue;
        try { ids.set(normalizeBotToken(bot.token), await VencordNative.botCord.saveBot(bot.name, bot.token)); } catch { }
    }
    await DataStore.del(DS_LEGACY_BOT_TOKENS);
    return ids;
}

function BotCordComponent() {
    const [token, setToken] = useState("");
    const [botName, setBotName] = useState("");
    const [savedBots, setSavedBots] = useState<BotAccount[]>([]);
    const [activeBot, setActiveBot] = useState("");
    const [showToken, setShowToken] = useState(false);

    useEffect(() => {
        void (async () => {
            const migrated = await migrateLegacyBots();
            const [bots, active] = await Promise.all([VencordNative.botCord.listBots(), DataStore.get<string>(DS_ACTIVE_BOT)]);
            let activeId = active ?? "";
            if (activeId && !bots.some(bot => bot.id === activeId)) {
                activeId = migrated.get(normalizeBotToken(activeId)) ?? "";
                if (activeId) await DataStore.set(DS_ACTIVE_BOT, activeId); else await DataStore.del(DS_ACTIVE_BOT);
            }
            setSavedBots(bots);
            setActiveBot(activeId);
        })().catch(() => {
            setSavedBots([]);
            setActiveBot("");
        });
    }, []);

    const handleAddBot = () => {
        const trimmed = normalizeBotToken(token);
        if (!trimmed) {
            Toasts.show({ id: "bot-token-empty", message: "Please enter a valid bot token", type: Toasts.Type.FAILURE });
            return;
        }
        const name = botName.trim() || `Bot ${savedBots.length + 1}`;
        void VencordNative.botCord.saveBot(name, trimmed).then(async () => {
            setSavedBots(await VencordNative.botCord.listBots());
            setToken("");
            setBotName("");
            Toasts.show({ id: "bot-token-added", message: `Saved ${name} securely`, type: Toasts.Type.SUCCESS });
        }, (error: any) => Toasts.show({ id: "bot-token-failed", message: error?.message || "Couldn't save the bot", type: Toasts.Type.FAILURE }));
    };

    const handleActivateBot = (botId: string, name: string) => {
        const isActive = activeBot === botId;
        Alerts.show({
            title: `${isActive ? "Open" : "Activate"} ${name}?`,
            body: "CloudCord will validate this bot with Discord and use it inside BotCord. Your Discord user account will stay signed in.",
            confirmText: isActive ? "Open BotCord" : "Activate Bot",
            cancelText: "Cancel",
            async onConfirm() {
                try {
                    const bot = await requestBotApi<BotIdentity>(botId, "/users/@me");

                    await DataStore.set(DS_ACTIVE_BOT, botId);
                    setActiveBot(botId);
                    openBotCordClient(bot, botId);
                    Toasts.show({ id: "bot-activated", message: `${name} is now active in BotCord`, type: Toasts.Type.SUCCESS });
                } catch (e: any) {
                    Toasts.show({ id: "bot-activate-fail", message: "Failed to activate bot: " + e.message, type: Toasts.Type.FAILURE });
                }
            }
        });
    };

    const handleDeleteBot = (botId: string) => {
        void VencordNative.botCord.removeBot(botId).then(async () => setSavedBots(await VencordNative.botCord.listBots()));
        if (activeBot === botId) {
            closeBotCordClient();
            void DataStore.del(DS_ACTIVE_BOT);
            setActiveBot("");
        }
        Toasts.show({ id: "bot-deleted", message: "Bot removed from list", type: Toasts.Type.SUCCESS });
    };

    return (
        <SettingsTab>
            <Paragraph className={Margins.bottom16}>
                BotCord manages and tests Discord bots in a separate session without replacing your Discord user account.
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
                    {savedBots.map(bot => (
                        <Card key={bot.id} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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

                                    onClick={() => handleActivateBot(bot.id, bot.name)}
                                >
                                    {activeBot === bot.id ? "Open" : "Activate"}
                                </Button>
                                <Button
                                    size="small"
                                    variant="dangerSecondary"
                                    onClick={() => handleDeleteBot(bot.id)}
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
