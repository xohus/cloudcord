// CX implementation of Zerebos' HideDisabledEmojis picker behavior.
type EmojiCell = { id?: string; isDisabled?: boolean; };
type Section = { sectionId?: string; count?: number; };
type DesktopGrid = {
    emojiGrid?: readonly (readonly EmojiCell[])[];
    rowCountBySection?: readonly number[];
    sectionDescriptors?: readonly Section[];
    collapsedSections?: ReadonlySet<string>;
};

export function filterCxEmojiGrid(props: DesktopGrid) {
    const { emojiGrid, rowCountBySection, sectionDescriptors, collapsedSections } = props;
    if (!Array.isArray(emojiGrid) || !Array.isArray(rowCountBySection) || !Array.isArray(sectionDescriptors)
        || rowCountBySection.length !== sectionDescriptors.length || !emojiGrid.every(Array.isArray)
        || !sectionDescriptors.every(section => section && typeof section === "object")
        || !rowCountBySection.every(count => Number.isInteger(count) && count >= 0)
        || rowCountBySection.reduce((total, count) => total + count, 0) !== emojiGrid.length) return;

    const rows: (readonly EmojiCell[])[] = [];
    const counts: number[] = [];
    const sections: Section[] = [];
    let cursor = 0;
    let changed = false;
    for (const [index, section] of sectionDescriptors.entries()) {
        const rowCount = rowCountBySection[index];
        const sectionRows: readonly (readonly EmojiCell[])[] = emojiGrid.slice(cursor, cursor + rowCount);
        cursor += rowCount;
        const visible = sectionRows.map(row => row.filter(emoji => emoji?.isDisabled !== true));
        if (visible.every((row, rowIndex) => row.length === sectionRows[rowIndex].length)) {
            rows.push(...sectionRows);
            counts.push(rowCount);
            sections.push(section);
            continue;
        }
        changed = true;
        const kept = visible.filter(row => row.length > 0);
        if (!kept.length && !(section.sectionId && collapsedSections?.has(section.sectionId))) continue;
        rows.push(...kept);
        counts.push(kept.length);
        sections.push({ ...section, count: kept.reduce((total, row) => total + row.length, 0) });
    }
    if (changed) return { emojiGrid: rows, rowCountBySection: counts, sectionDescriptors: sections };
}

type MobileCategory = {
    emojis?: readonly EmojiCell[];
    emojisDisabled?: ReadonlySet<string>;
    isNitroLocked?: boolean;
};

export function filterCxEmojiCategories(categories: readonly MobileCategory[]) {
    let changed = false;
    const visible: MobileCategory[] = [];
    for (const category of categories) {
        if (category?.isNitroLocked === true) { changed = true; continue; }
        const { emojis, emojisDisabled } = category ?? {};
        if (!Array.isArray(emojis) || typeof emojisDisabled?.has !== "function") {
            visible.push(category);
            continue;
        }
        const kept = emojis.filter(emoji => !emoji?.id || !emojisDisabled.has(emoji.id));
        if (kept.length === emojis.length) visible.push(category);
        else {
            changed = true;
            if (kept.length) visible.push({ ...category, emojis: kept });
        }
    }
    return changed ? visible : categories;
}
