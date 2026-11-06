/*
 * CloudCord
 * Copyright (c) 2026 xohus and CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Builds themes/mobile/index.json, the list shown in the mobile Theme Store.
 * Each entry links to the theme file in its own repository; no theme is copied.
 * Run: node ios/scripts/build-theme-index.mjs
 */

import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// [repo, branch, which files are Vendetta/Bunny/Kettu-format themes, source label]
const SOURCES = [
    ["catppuccin/vendetta", "main", p => /^themes\/[a-z]+\/[a-z]+\.json$/.test(p), "Catppuccin"],
    ["sudo9000/Enmity-Themes", "main", p => /_V2\.json$/i.test(p), "sudo9000"],
];

const headers = { "User-Agent": "CloudCord-theme-index", Accept: "application/vnd.github+json" };

async function json(url) {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json();
}

function pick(semantic, ...keys) {
    for (const key of keys) {
        const value = semantic?.[key];
        const color = Array.isArray(value) ? value[0] : value;
        if (typeof color === "string" && /^#[0-9a-f]{3,8}$/i.test(color)) return color;
    }
    return null;
}

const themes = [];
for (const [repo, branch, isTheme, source] of SOURCES) {
    const tree = await json(`https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`);
    const paths = tree.tree.map(t => t.path).filter(isTheme).sort();
    for (const path of paths) {
        const url = `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
        let data;
        try { data = await (await fetch(url)).json(); } catch { continue; }
        if (!data || typeof data.name !== "string" || (!data.semanticColors && !data.rawColors)) continue;

        const semantic = data.semanticColors ?? {};
        const raw = data.rawColors ?? {};
        themes.push({
            id: url,
            name: data.name,
            description: typeof data.description === "string" ? data.description : "",
            authors: Array.isArray(data.authors) ? data.authors.map(a => a?.name).filter(Boolean) : [],
            source,
            repo: `https://github.com/${repo}`,
            hasBackground: !!data.background?.url,
            preview: {
                background: pick(semantic, "BACKGROUND_PRIMARY", "BG_BASE_PRIMARY", "BACKGROUND_SECONDARY") ?? raw.PRIMARY_600 ?? "#313338",
                surface: pick(semantic, "BACKGROUND_SECONDARY", "BG_BASE_SECONDARY", "BACKGROUND_TERTIARY") ?? raw.PRIMARY_700 ?? "#2b2d31",
                accent: pick(semantic, "TEXT_LINK", "BRAND_500", "INTERACTIVE_ACTIVE") ?? raw.BRAND_500 ?? "#7c5cff",
                text: pick(semantic, "TEXT_NORMAL", "HEADER_PRIMARY", "TEXT_DEFAULT") ?? "#dbdee1",
            },
        });
    }
}

const out = join(root, "themes", "mobile", "index.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ version: 1, generated: new Date().toISOString().slice(0, 10), themes }, null, 2) + "\n");
console.log(`wrote ${themes.length} themes to ${out}`);
