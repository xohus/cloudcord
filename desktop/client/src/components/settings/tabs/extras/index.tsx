/*
 * CloudCord, a Discord client mod
 * Copyright (c) 2026 xohus and CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "@sincordplugins/fakeProfile/editor.css";

import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { ExtrasPanel } from "@sincordplugins/fakeProfile/extras";

// Device-only mods: Fake Nitro, gift links, boosts, friend requests and account tools.
export default function ExtrasTab() {
    return <>
        <Heading tag="h2">Extras</Heading>
        <Paragraph>Everything here only changes what you see on this device, except Leave all servers and Reset.</Paragraph>
        <div className="cpx-root cpx-page"><ExtrasPanel /></div>
    </>;
}
