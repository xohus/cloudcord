/*
 * CloudCord, a Discord client mod
 * Copyright (c) 2026 CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Divider } from "@components/Divider";
import { Heading } from "@components/Heading";
import { AppsIcon, OpenExternalIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";
import { openModal } from "@utils/modal";
import { React } from "@webpack/common";

function OutsidePluginsTabComponent() {
    return (
        <SettingsTab>
            <Paragraph className={Margins.bottom16}>
                Install, manage, and update custom community plugins and user plugins from outside GitHub repositories.
            </Paragraph>

            <Card style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <AppsIcon style={{ width: "28px", height: "28px", color: "var(--brand-500)" }} />
                    <div>
                        <div style={{ fontWeight: 600, fontSize: "16px" }}>User Plugin Manager</div>
                        <div style={{ fontSize: "13px", opacity: 0.7 }}>Install plugins directly from GitHub URLs or local plugin files</div>
                    </div>
                </div>

                <Button
                    onClick={() => {
                        const plugin = (window as any).Vencord?.Plugins?.plugins?.userpluginInstaller;
                        if (plugin?.start) {
                            // Plugin action
                        }
                    }}
                >
                    Open Plugin Directory
                </Button>
            </Card>

            <Divider className={Margins.top16 + " " + Margins.bottom16} />

            <Heading tag="h2" className={Margins.bottom16}>Community Repositories</Heading>
            <Paragraph style={{ opacity: 0.8 }}>
                You can install third-party plugins by pasting a GitHub repository URL into chat or using the CloudCord plugin installer.
            </Paragraph>
        </SettingsTab>
    );
}

export default wrapTab(OutsidePluginsTabComponent, "Outside Plugins");
