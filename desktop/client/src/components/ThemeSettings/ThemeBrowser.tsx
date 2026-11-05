import "./themeBrowser.css";

import { Button } from "@components/Button";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab } from "@components/settings/tabs/BaseTab";
import { usePluginPagination } from "@components/settings/tabs/plugins/usePluginPagination";
import type { CatalogTheme } from "@utils/themeCatalog";
import type { PluginNative } from "@utils/types";
import { React, TextInput } from "@webpack/common";

export default function ThemeBrowser({ onInstalled }: { onInstalled?: () => void | Promise<void>; }) {
    const [themes, setThemes] = React.useState<CatalogTheme[]>([]);
    const [query, setQuery] = React.useState("");
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [busy, setBusy] = React.useState<number | null>(null);
    const [installed, setInstalled] = React.useState<Set<number>>(() => new Set());
    const [notice, setNotice] = React.useState("");
    const mounted = React.useRef(true);
    const native = VencordNative.pluginHelpers.ThemeLibrary as PluginNative<typeof import("../../sincordplugins/themeLibrary/native")>;

    async function load() {
        setLoading(true);
        setError("");
        try {
            if (!native?.fetchCatalog) throw new Error("Restart Discord after updating CloudCord to open the theme catalogue.");
            const result = await native.fetchCatalog();
            if (mounted.current) setThemes(result);
        } catch (e) { if (mounted.current) setError(String((e as Error)?.message ?? e)); }
        finally { if (mounted.current) setLoading(false); }
    }

    React.useEffect(() => {
        mounted.current = true;
        void load();
        return () => { mounted.current = false; };
    }, []);

    async function install(theme: CatalogTheme) {
        setBusy(theme.id);
        setNotice("");
        try {
            const result = await native.installCatalogTheme(theme.id);
            if (!mounted.current) return;
            setInstalled(previous => new Set([...previous, theme.id]));
            setNotice(result.installed
                ? `${theme.name} installed. Enable it in Installed Themes when you're ready.`
                : `${theme.name} is already installed. Your existing file was kept.`);
            try { await onInstalled?.(); }
            catch { if (mounted.current) setNotice(`${theme.name} is saved. Reopen Themes to refresh the installed list.`); }
        } catch (e) { if (mounted.current) setNotice(`Couldn't install ${theme.name}: ${String((e as Error)?.message ?? e)}`); }
        finally { if (mounted.current) setBusy(null); }
    }

    const search = query.trim().toLowerCase();
    const filtered = React.useMemo(() => themes.filter(theme =>
        `${theme.name} ${theme.author} ${theme.description}`.toLowerCase().includes(search)), [themes, search]);
    const { visibleCount, loadMore } = usePluginPagination(filtered.length, search, false);

    return <SettingsTab>
        <Heading tag="h2">Discover themes</Heading>
        <Paragraph>Browse the BetterDiscord catalogue. Install a theme here, then enable it in Installed Themes.</Paragraph>
        <TextInput value={query} onChange={setQuery} placeholder="Search themes or authors" aria-label="Search themes or authors" />
        <div role="status" aria-live="polite"><Paragraph>{notice}</Paragraph></div>
        {loading ? <Paragraph>Loading themes…</Paragraph> : error ? <div role="alert">
            <Paragraph>{error}</Paragraph><Button onClick={() => void load()}>Try again</Button>
        </div> : <>
            <Paragraph>{filtered.length} themes</Paragraph>
            <div className="cc-theme-browser-grid">
                {filtered.slice(0, visibleCount).map(theme => <article className="cc-theme-browser-card" key={theme.id}>
                    {theme.thumbnail && <img src={theme.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true; }} />}
                    <div className="cc-theme-browser-body">
                        <Heading tag="h3">{theme.name}</Heading>
                        <Paragraph>by {theme.author}</Paragraph>
                        <Paragraph>{theme.description}</Paragraph>
                        <Button disabled={busy !== null || installed.has(theme.id)} onClick={() => void install(theme)}>
                            {installed.has(theme.id) ? "Installed" : busy === theme.id ? "Installing…" : "Install theme"}
                        </Button>
                    </div>
                </article>)}
            </div>
            {visibleCount < filtered.length && <Button onClick={loadMore}>Show more themes</Button>}
            {!filtered.length && <Paragraph>No themes match your search.</Paragraph>}
        </>}
    </SettingsTab>;
}
