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

function CloudCordCoreAbout() {
    const installStatus = IS_DISCORD_DESKTOP ? "Injected into Discord Desktop" : "Running outside Discord Desktop";

    return (
        <div className={Margins.top16}>
            <InfoRow label="CloudCord Desktop version" value={VERSION} />
            <InfoRow label="Repository" value={<Link href={REPO_URL}>{REPO_URL}</Link>} />
            <InfoRow label="Install status" value={installStatus} />
            <InfoRow label="Credits" value="CloudCord by Xohus, based on Sincord and inspired by Vencord architecture." />
            <InfoRow label="Mobile runtime" value="iOS and Android use CloudCord's separate React Native runtime." />
            <InfoRow label="Desktop runtime" value="Desktop uses this Vencord/Sincord-style desktop bundle." />
            <Paragraph className={Margins.top16}>
                CloudCord Core provides desktop identity and integration metadata for the open-source CloudCord Desktop client mod.
            </Paragraph>
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
