/*
 * CloudCord, a Discord desktop client mod
 * Copyright (c) 2026 Xohus
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import definePlugin from "@utils/types";
import { Text } from "@webpack/common";
import type { ReactNode } from "react";

const REPO_URL = "https://github.com/xohus/cloudcord";

function InfoRow({ label, value }: { label: string; value: ReactNode; }) {
    return (
        <div style={{ display: "grid", gridTemplateColumns: "11rem 1fr", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <Text variant="text-sm/semibold">{label}</Text>
            <Text variant="text-sm/normal">{value}</Text>
        </div>
    );
}

const features = [
    ["BotCord", "Account tools and CloudCord companion integration."],
    ["Fake Profile", "Local profile previews and appearance tools."],
    ["Cloud Sync", "Keep settings and add-ons consistent across installations."],
    ["Add-ons", "Manage plugins, themes and fonts in one place."]
] as const;

function FeatureCards() {
    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.75rem", marginTop: "1rem" }}>
            {features.map(([name, description]) => (
                <div key={name} style={{ padding: "1rem", borderRadius: "16px", background: "linear-gradient(135deg, rgba(124, 92, 252, .18), rgba(57, 208, 255, .08))", border: "1px solid rgba(124, 92, 252, .35)" }}>
                    <Text variant="text-md/semibold">{name}</Text>
                    <div style={{ marginTop: ".35rem" }}>
                        <Text variant="text-sm/normal" color="text-muted">{description}</Text>
                    </div>
                </div>
            ))}
        </div>
    );
}

function CloudCordCoreAbout() {
    const installStatus = IS_DISCORD_DESKTOP ? "Injected into Discord Desktop" : "Running outside Discord Desktop";

    return (
        <div className={Margins.top16}>
            <InfoRow label="CloudCord Desktop version" value={VERSION} />
            <InfoRow label="Repository" value={<Link href={REPO_URL}>{REPO_URL}</Link>} />
            <InfoRow label="Install status" value={installStatus} />
            <InfoRow label="Mobile runtime" value="iOS and Android use CloudCord's separate React Native runtime." />
            <Paragraph className={Margins.top16}>
                Your CloudCord features live together here. Installer updates replace only the runtime and preserve your settings and add-on data.
            </Paragraph>
            <FeatureCards />
        </div>
    );
}

export default definePlugin({
    name: "CloudCord Core",
    description: "Core CloudCord desktop integration",
    authors: [Devs.Xohus],
    required: true,
    settingsAboutComponent: CloudCordCoreAbout,
});
