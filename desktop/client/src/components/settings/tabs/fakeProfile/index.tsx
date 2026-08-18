/*
 * CloudCord, a Discord client mod
 * Copyright (c) 2026 CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Divider } from "@components/Divider";
import { Heading } from "@components/Heading";
import { UserIcon, OpenExternalIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";
import { openModal } from "@utils/modal";
import { React } from "@webpack/common";

function FakeProfileTabComponent() {
    const handleOpenModal = () => {
        try {
            const fakeProfile = (window as any).Vencord?.Plugins?.plugins?.fakeProfile;
            if (fakeProfile?.settingsAboutComponent) {
                // Trigger the modal opener from the plugin
            }
        } catch { }
    };

    return (
        <SettingsTab title="Fake Profile">
            <Paragraph className={Margins.bottom16}>
                Customize your local and cloud profile appearance including Nitro badges, profile banners, custom badges, avatar decorations, and account creation dates.
            </Paragraph>

            <Card style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <UserIcon style={{ width: "28px", height: "28px", color: "var(--brand-500)" }} />
                    <div>
                        <div style={{ fontWeight: 600, fontSize: "16px" }}>Profile Customizer</div>
                        <div style={{ fontSize: "13px", opacity: 0.7 }}>Edit your fake badges, nitro status, banner, and bio</div>
                    </div>
                </div>

                <Button
                    onClick={() => {
                        const btn = document.querySelector(".vc-profile-spoofer-btn") as HTMLElement;
                        if (btn) {
                            btn.click();
                        } else {
                            const fp = (window as any).Vencord?.Plugins?.plugins?.fakeProfile;
                            if (fp) {
                                openModal((props: any) => {
                                    const modalComp = fp.settingsAboutComponent?.();
                                    return modalComp || <div style={{ padding: 20 }}>Fake Profile Customizer</div>;
                                });
                            }
                        }
                    }}
                >
                    Open Profile Editor
                </Button>
            </Card>

            <Divider className={Margins.top16 + " " + Margins.bottom16} />

            <Heading level={2} className={Margins.bottom16}>Profile Sync & Badges</Heading>
            <Paragraph style={{ opacity: 0.8 }}>
                Changes made with Fake Profile can be synced across other CloudCord users using Cloud Profiles so others with CloudCord see your customized profile and badges.
            </Paragraph>
        </SettingsTab>
    );
}

export default wrapTab(FakeProfileTabComponent, "Fake Profile");
