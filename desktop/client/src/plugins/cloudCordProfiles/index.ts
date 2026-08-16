/*
 * CloudCord shared profile transport
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "CloudCordProfiles",
    description: "Publishes and loads complete opt-in CloudCord profiles.",
    authors: [Devs.Xohus],
    required: true
});
