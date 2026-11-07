/* SPDX-License-Identifier: GPL-3.0-or-later */

import moment from "moment";

export const cxTimestampSurfaces = ["cozy", "compact", "tooltip", "accessibility", "markdown"] as const;
export const cxCalendarPeriods = ["today", "yesterday", "week", "older"] as const;
export type CxTimestampSurface = typeof cxTimestampSurfaces[number];
export type CxTimestampTarget = CxTimestampSurface | typeof cxCalendarPeriods[number];
export type CxTimestampFormats = Partial<Record<CxTimestampTarget, string>>;

export function formatCxTimestamp(input: unknown, surface: CxTimestampSurface, formats: CxTimestampFormats | undefined) {
    const template = formats?.[surface];
    if (!template || input == null) return;

    // Native message timestamps may already carry Discord's chosen locale.
    const date = moment.isMoment(input) ? input : typeof input === "string"
        ? moment(input, moment.ISO_8601, true)
        : typeof input === "number" || Object.prototype.toString.call(input) === "[object Date]"
            ? moment(input as number | Date) : undefined;
    if (!date?.isValid()) return;
    return template.split(/(\[(?:calendar|relative)\])/g).map(part => {
        if (part === "[relative]") return date.fromNow();
        if (part !== "[calendar]") return part ? date.format(part) : "";
        return date.calendar(undefined, {
            sameDay: formats.today ?? "[Today at] LT",
            lastDay: formats.yesterday ?? "[Yesterday at] LT",
            lastWeek: formats.week ?? "ddd L LT",
            sameElse: formats.older ?? "L",
        });
    }).join("") || undefined;
}

export function createCxTimestampRegistry() {
    const active = new Set<CxTimestampFormats>();
    let current: CxTimestampFormats = {};
    const update = () => { current = Object.assign({}, ...active); };
    return {
        register(formats: CxTimestampFormats) {
            const entry = { ...formats };
            active.add(entry);
            update();
            return () => { if (active.delete(entry)) update(); };
        },
        format(input: unknown, surface: CxTimestampSurface) {
            return formatCxTimestamp(input, surface, current);
        },
    };
}
