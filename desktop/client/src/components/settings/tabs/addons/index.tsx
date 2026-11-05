import "./styles.css";

import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { useSettings } from "@api/Settings";
import { CloudIcon, PaintbrushIcon, PluginIcon, PluginsIcon } from "@components/Icons";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { React } from "@webpack/common";
import { SettingsTab, wrapTab } from "../BaseTab";

// Resolve each page only when it is opened. A failed optional page must not
// prevent the Add-ons landing page (or its Back button) from rendering.
function PluginsPage() { const Page = require("../plugins").default; return <Page />; }
function ThemesPage() { const Page = require("../../../ThemeSettings/ThemesTab").default; return <Page />; }
function CloudPage() { const Page = require("../sync/CloudTab").default; return <Page />; }
function ExtrasPage() { const Page = require("../extras").default; return <Page />; }

const rows = [
    { name: "Plugins", description: "Find new features and manage the plugins you use.", Icon: PluginsIcon, Tab: PluginsPage },
    { name: "Themes", description: "Make Discord yours with themes and custom CSS.", Icon: PaintbrushIcon, Tab: ThemesPage },
    { name: "Cloudsync", description: "Back up your settings and sync across devices.", Icon: CloudIcon, Tab: CloudPage },
    { name: "Extras", description: "Cosmetic Nitro features, gift previews and account utilities.", Icon: PluginIcon, Tab: ExtrasPage }
];

function Addons() {
    const visibility = useSettings().plugins.Settings as any;
    const [activePage, setActivePage] = React.useState<string | null>(null);
    const active = rows.find(row => row.name === activePage);
    if (active) {
        const Page = active.Tab;
        return <SettingsTab>
            <Button variant="secondary" onClick={() => setActivePage(null)}>Back to Add-ons</Button>
            <ErrorBoundary key={active.name} message={`Couldn't open ${active.name}. You can return to Add-ons and try again.`}>
                <Page />
            </ErrorBoundary>
        </SettingsTab>;
    }
    return <SettingsTab>
        <Heading tag="h2">Add-ons</Heading>
        <Paragraph>Plugins, themes, sync and extras, together in one place.</Paragraph>
        <div className="cc-addons-grid">
            {rows.filter(row => row.name === "Plugins" ? visibility.showPluginsTab !== false : row.name === "Themes" ? visibility.showThemesTab !== false : row.name === "Cloudsync" ? visibility.showCloudSyncTab !== false : true).map(({ name, description, Icon }) => <button type="button" className="cc-addons-card" key={name} onClick={() => setActivePage(name)}>
                <span className="cc-addons-icon" aria-hidden="true"><Icon width={24} height={24} /></span>
                <span className="cc-addons-title">{name}<span aria-hidden="true">↗</span></span>
                <span className="cc-addons-description">{description}</span>
            </button>)}
        </div>
    </SettingsTab>;
}
export default wrapTab(Addons, "Add-ons");
