import { Button } from "@components/Button";
import { useSettings } from "@api/Settings";
import { CloudIcon, PaintbrushIcon, PluginsIcon } from "@components/Icons";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { React } from "@webpack/common";
import { openSettingsTabModal, SettingsTab, wrapTab } from "../BaseTab";
import PluginsTab from "../plugins";
import ThemesTab from "../../../ThemeSettings/ThemesTab";
import CloudTab from "../sync/CloudTab";

function Addons() {
    const visibility = useSettings().plugins.Settings as any;
    const rows = [
        { name: "Plugins", description: "Manage installed plugins and their settings.", Icon: PluginsIcon, Tab: PluginsTab },
        { name: "Themes", description: "Change Discord's appearance and manage your themes.", Icon: PaintbrushIcon, Tab: ThemesTab },
        { name: "Cloudsync", description: "Sync your settings across devices.", Icon: CloudIcon, Tab: CloudTab }
    ];
    return <SettingsTab>
        <Heading tag="h2">Add-ons</Heading>
        <Paragraph>Plugins, themes and sync, together in one place.</Paragraph>
        {rows.filter(row => row.name === "Plugins" ? visibility.showPluginsTab !== false : row.name === "Themes" ? visibility.showThemesTab !== false : row.name === "Cloudsync" ? visibility.showCloudSyncTab !== false : true).map(({ name, description, Icon, Tab }) => <div key={name} style={{ display: "flex", gap: 16, alignItems: "center", padding: "16px 0", borderBottom: "1px solid var(--background-modifier-accent)" }}>
            <Icon width={24} height={24} />
            <div style={{ flex: 1, minWidth: 0 }}><Heading tag="h3">{name}</Heading><Paragraph>{description}</Paragraph></div>
            <Button disabled={!Tab} onClick={() => { if (Tab) openSettingsTabModal(Tab); }}>Open</Button>
        </div>)}
    </SettingsTab>;
}
export default wrapTab(Addons, "Add-ons");
