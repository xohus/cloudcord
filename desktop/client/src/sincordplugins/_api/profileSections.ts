/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ProfileSectionsAPI",
    description: "API to add sections near the 'Member Since' area of user profile panels.",
    authors: [Devs.thororen],
    patches: [
        {
            find: "#{intl::PROVISIONAL_ACCOUNT}),headingIcon:",
            replacement: {
                match: /(#{intl::USER_PROFILE_MEMBER_SINCE}\),.{0,100}userId:(\i\.id)}\)}\))/,
                replace: "$1,Vencord.Api.ProfileSections.renderProfileSections({userId:$2,isSideBar:true})",
            }
        },
        {
            find: ",applicationRoleConnection:",
            replacement: {
                match: /(#{intl::USER_PROFILE_MEMBER_SINCE}\),.{0,100}userId:(\i\.id),.{0,100}}\)}\)),/,
                replace: "$1,Vencord.Api.ProfileSections.renderProfileSections({userId:$2,isSideBar:false}),",
            }
        },
        {
            find: ".MODAL_V2,onClose:",
            replacement: {
                match: /(#{intl::USER_PROFILE_MEMBER_SINCE}\),.{0,100}userId:(\i\.id),.{0,100}}\)}\)),/,
                replace: "$1,Vencord.Api.ProfileSections.renderProfileSections({userId:$2,isSideBar:false}),",
            }
        },
        // The Member Since row is shared by popouts, full profiles and the DM
        // sidebar. Match that row itself, not a modal-only discriminator.
        {
            find: "#{intl::USER_PROFILE_MEMBER_SINCE}",
            all: true,
            replacement: {
                match: /(#{intl::USER_PROFILE_MEMBER_SINCE}\),.{0,100}?userId:(\i\.id)(?:,.{0,100}?)?}\)}\))/g,
                replace: (match, row, userId, _offset, source) => source.includes("Vencord.Api.ProfileSections.renderProfileSections") ? match
                    : `${row},Vencord.Api.ProfileSections.renderProfileSections({userId:${userId},isSideBar:false})`,
            }
        }
    ]
});
