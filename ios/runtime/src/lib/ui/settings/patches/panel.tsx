import { after } from "@lib/api/patcher";
import { findInReactTree } from "@lib/utils";
import { i18n, NavigationNative } from "@metro/common";
import { LegacyFormDivider,LegacyFormIcon, LegacyFormRow, LegacyFormSection } from "@metro/common/components";
import { findByNameLazy } from "@metro/wrappers";
import { registeredSections } from "@ui/settings";

import { CustomPageRenderer, wrapOnPress } from "./shared";

function SettingsRow({ row, navigation, showDivider }: { row: any; navigation: any; showDivider: boolean; }) {
    // Keep each row's hook-based predicate/trailing renderer inside its own keyed
    // component so one row can never inherit another row's hook state.
    const visible = row.usePredicate?.() ?? true;
    const trailing = row.useTrailing?.() || undefined;
    if (!visible) return null;

    return <>
        <LegacyFormRow
            label={row.title()}
            leading={<LegacyFormIcon source={row.icon} />}
            trailing={<LegacyFormRow.Arrow label={trailing} />}
            onPress={wrapOnPress(row.onPress, navigation, row.render, row.title())}
        />
        {showDivider && <LegacyFormDivider />}
    </>;
}

function SettingsSection() {
    const navigation = NavigationNative.useNavigation();

    return <>
        {Object.keys(registeredSections).map(sect => registeredSections[sect].length > 0 && (
            <LegacyFormSection key={sect} title={sect}>
                {registeredSections[sect].map((row, i, arr) => (
                    <SettingsRow
                        key={row.key}
                        row={row}
                        navigation={navigation}
                        showDivider={i !== arr.length - 1}
                    />
                ))}
            </LegacyFormSection>
        ))}
    </>;
}

export function patchPanelUI(unpatches: (() => void | boolean)[]) {
    try {
        unpatches.push(
            after("default", findByNameLazy("getScreens", false), (_a, screens) => ({
                ...screens,
                VendettaCustomPage: {
                    title: "CloudCord",
                    render: () => <CustomPageRenderer />
                },
                BUNNY_CUSTOM_PAGE: {
                    title: "CloudCord",
                    render: () => <CustomPageRenderer />
                },
                PUPU_CUSTOM_PAGE: {
                    title: "CloudCord",
                    render: () => <CustomPageRenderer />
                }
            }))
        );

        const unpatch = after("default", findByNameLazy("UserSettingsOverviewWrapper", false), (_a, ret) => {
            const UserSettingsOverview = findInReactTree(ret.props.children, n => n.type?.name === "UserSettingsOverview");

            unpatches.push(after("renderSupportAndAcknowledgements", UserSettingsOverview.type.prototype, (_args, { props: { children } }) => {
                const index = children.findIndex((c: any) => c?.type?.name === "UploadLogsButton");
                if (index !== -1) children.splice(index, 1);
            }));

            unpatches.push(after("render", UserSettingsOverview.type.prototype, (_args, res) => {
                const titles = [i18n.Messages.BILLING_SETTINGS, i18n.Messages.PREMIUM_SETTINGS];
                const sections = findInReactTree(
                    res.props.children,
                    n => n?.children?.[1]?.type === LegacyFormSection
                )?.children || res.props.children;

                if (sections) {
                    const index = sections.findIndex((section: any) => titles.includes(section?.props?.label));
                    sections.splice(-~index || 4, 0, <SettingsSection key="CLOUDCORD_SETTINGS_SECTION" />);
                }
            }));
        }, true);

        unpatches.push(unpatch);
    } catch {

    }
}

