const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const esbuild = require('esbuild');
const workflow = fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8');
const source = workflow.split("cat > src/core/ui/settings/pages/FakeProfile/index.tsx <<'TSX'")[1].split('\n          TSX')[0].replace(/^          /gm, '');
const block = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const compile = code => esbuild.transformSync(code, { loader: 'ts' }).code;
const NativeDate = Date;
class FixedDate extends NativeDate { constructor(...args) { super(...(args.length ? args : ['2026-03-31T12:00:00Z'])); } }
const context = vm.createContext({ Date: FixedDate, Number, JSON,
    preview: { nitroEnabled: true, nitroMonths: 3, nitroSince: '2025-07-28', selectedBadges: {}, hiddenBadgeIds: [], badgeOrder: [] },
    NITRO_DURATIONS: [0, 1, 3], BOOST_DURATIONS: [0], BADGES: [], REPLACE_BADGES_SYNC_ID: 'replace',
    shareableMedia: async () => null, normalizeProfileAppearance: () => ({}), colorNumber: () => null });
vm.runInContext(compile(block('function monthsAgo(', 'function durationLabel(')
    + block('function nitroSubscriberLabel(', 'const BOOST_ICONS')
    + block('async function ownSharedProfile(', 'async function publishSharedProfile(')), context);
(async () => {
    const desktopSource = fs.readFileSync('desktop/client/src/sincordplugins/fakeProfile/index.tsx', 'utf8');
    const desktop = vm.createContext({ Date: FixedDate, Number });
    vm.runInContext(compile(desktopSource.slice(desktopSource.indexOf('function monthsAgo('), desktopSource.indexOf('/** Populate every field'))), desktop);
    assert.equal(desktop.monthsAgo(1).toISOString().slice(0, 10), '2026-02-28');
    assert.equal(desktop.monthsAgo(3, '2025-07-28').toISOString().slice(0, 10), '2025-07-28');
    for (const months of [NaN, Infinity, -20, 'invalid']) assert(!Number.isNaN(desktop.monthsAgo(months).getTime()));
    assert.equal(context.monthsAgo(1).toISOString().slice(0, 10), '2026-02-28', 'subtracting months clamps month-end instead of overflowing forward');
    for (const months of [NaN, Infinity, -20, 'invalid']) assert(!Number.isNaN(context.monthsAgo(months).getTime()), 'bad saved duration cannot create invalid ISO dates');
    for (const value of ['2026-02-30', '2025-02-29', '2026-13-01', 'not-a-date', {}, 123]) assert.equal(context.profileDate(value), null);
    assert.equal(context.profileDate('2024-02-29').toISOString().slice(0, 10), '2024-02-29');
    assert(context.nitroSubscriberLabel(3, '2025-07-28').includes('7/28/25'), 'badge tooltip uses saved subscriber date, not the tier-derived estimate');
    assert.equal((await context.ownSharedProfile()).nitroSince, '2025-07-28', 'mobile re-publishing preserves the explicit desktop subscriber date');
    context.preview.nitroSince = '2026-02-30';
    assert.equal((await context.ownSharedProfile()).nitroSince, '2025-12-31', 'invalid explicit date falls back to a valid milestone estimate');
    assert(source.includes('nitroSince: typeof data.nitroSince === "string" ? data.nitroSince : ""'), 'own profile pull retains the shared date');
    assert(source.includes('key === "nitroMonths" && value !== preview.nitroMonths'), 'choosing a new milestone clears a date from the previous tier');
    console.log('PASS Nitro subscriber-date roundtrip, saved tooltip date, leap days, month-end clamping and malformed duration safety');
})().catch(error => { console.error(error); process.exitCode = 1; });
