/*
 * CloudCord, a Discord client mod
 * Fake Profile originally created by xohus for CloudCord on iOS and Android,
 * then adapted and expanded for CloudCord Desktop.
 * Copyright (c) 2026 xohus and CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Divider } from "@components/Divider";
import { Heading } from "@components/Heading";
import { UserIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";
import { React } from "@webpack/common";

function FakeProfileTabComponent() {
    return (
        <SettingsTab>
            <Paragraph className={Margins.bottom16}>
                Edit your profile, badges and avatar decorations.
            </Paragraph>

            <Card style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <UserIcon style={{ width: "28px", height: "28px", color: "var(--brand-500)" }} />
                    <div>
                        <div style={{ fontWeight: 600, fontSize: "16px" }}>Profile</div>
                        <div style={{ fontSize: "13px", opacity: 0.7 }}>Edit your badges, profile pictures, banner and bio</div>
                    </div>
                </div>

                <Button
                    onClick={() => {
                        const profileSpoofer = (window as any).Vencord?.Plugins?.plugins?.ProfileSpoofer;
                        profileSpoofer?.toolboxActions?.["Open Profile Spoofer"]?.();
                    }}
                >
                    Open Profile Editor
                </Button>
            </Card>

            <Divider className={Margins.top16 + " " + Margins.bottom16} />

            <Heading tag="h2" className={Margins.bottom16}>Profile Sync</Heading>
            <Paragraph style={{ opacity: 0.8 }}>
                Shared profile changes are visible to other CloudCord users, not unmodified Discord. Local edits stay on your device.
            </Paragraph>
        </SettingsTab>
    );
}

export default wrapTab(FakeProfileTabComponent, "Profile");
