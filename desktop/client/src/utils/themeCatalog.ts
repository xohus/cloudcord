export interface CatalogTheme {
    id: number;
    name: string;
    description: string;
    author: string;
    fileName: string;
    source: string;
    thumbnail: string | null;
}

export function parseThemeCatalog(input: unknown): CatalogTheme[] {
    if (!Array.isArray(input)) throw new Error("The theme catalogue returned an invalid response.");
    const seen = new Set<number>();
    const themes: CatalogTheme[] = [];
    for (const item of input) {
        if (!item || !Number.isSafeInteger(item.id) || seen.has(item.id)
            || typeof item.name !== "string" || typeof item.file_name !== "string"
            || !/^[\w .()+-]+\.theme\.css$/i.test(item.file_name)) continue;
        let source: URL;
        try { source = new URL(item.latest_source_url); } catch { continue; }
        if (source.protocol !== "https:" || source.hostname !== "raw.githubusercontent.com"
            || source.username || source.password || source.port) continue;
        seen.add(item.id);
        themes.push({
            id: item.id, name: item.name.slice(0, 120), fileName: item.file_name,
            description: typeof item.description === "string" ? item.description.slice(0, 1000) : "",
            author: typeof item.author?.display_name === "string" ? item.author.display_name.slice(0, 120) : "Unknown author",
            source: source.href,
            thumbnail: typeof item.thumbnail_url === "string" && /^\/image\/\d+$/.test(item.thumbnail_url)
                ? `https://betterdiscord.app${item.thumbnail_url}` : null
        });
    }
    return themes;
}
