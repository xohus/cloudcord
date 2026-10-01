import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transformSync } from "esbuild";

const repoRoot = process.env.CLOUDCORD_REPO_ROOT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const workflow = fs.readFileSync(path.join(repoRoot, ".github/workflows/cloudcord.yml"), "utf8");
function extract(start, end) {
    const offset = workflow.indexOf(start);
    assert.ok(offset >= 0, `Missing ${start}`);
    const stop = workflow.indexOf(end, offset);
    assert.ok(stop > offset, `Missing ${end}`);
    return workflow.slice(offset, stop);
}
const functions = extract("function cloneObject(", "function decorateProfileResult(")
    + extract("function setOwnValue(", "function monthsAgo(");
const layoutContext = vm.createContext({ badgeLayoutChoices: [] });
vm.runInContext(transformSync(extract("function applyBadgeLayout(", "function moveBadge("), { loader: "ts", format: "cjs" }).code, layoutContext);
layoutContext.fake = [{ id: "fakeprofile-active" }, { id: "fakeprofile-quest" }];
layoutContext.real = [{ id: "partner" }, { id: "early_supporter" }];
layoutContext.layout = { hiddenBadgeKeys: ["real:partner", "fake:quest"], badgeOrder: ["real:early_supporter", "fake:active"] };
assert.equal(vm.runInContext("applyBadgeLayout(fake, real, layout).map(item => item.id).join(',')", layoutContext), "early_supporter,fakeprofile-active");
layoutContext.fake = [{ id: "cloudcord-shared-active" }, { id: "cloudcord-shared-quest" }];
assert.equal(vm.runInContext("applyBadgeLayout(fake, real, layout).map(item => item.id).join(',')", layoutContext), "early_supporter,cloudcord-shared-active");
assert.equal(vm.runInContext("applyBadgeLayout(fake, real, {}).length", layoutContext), 4);
const preview = { enabled: true, selectedBadges: {}, bio: "", pronouns: "", avatarDecoration: "" };
const context = vm.createContext({
    preview, userCache: new WeakMap(), profileCache: new WeakMap(), BADGES: [],
    mediaUri: key => preview[key]?.uri,
    colorNumber: value => value,
    shouldReplaceLocalBadges: () => false,
    selectedBadgeObjects: existing => existing,
    profileDate: () => null,
    monthsAgo: () => new Date(),
    decorationAsset: value => value
});
vm.runInContext(transformSync(functions, { loader: "ts" }).code, context);
const original = {
    id: "test", username: "real", banner: "real-banner-hash",
    premiumType: 2, premiumSince: "2020-01-01", premiumGuildSince: "2021-01-01",
    avatarURL: "real-avatar", badges: [{ id: "real-badge" }],
    themeColors: [1, 2], userProfile: { banner: "nested-banner" }
};
Object.defineProperty(original, "bannerURL", { enumerable: true, value: "real-banner-url" });
Object.defineProperty(original, "getBannerURL", { get: () => () => "real-banner-url" });
context.original = original;
const cloned = vm.runInContext("cloneObject(original, 'profile')", context);
assert.notEqual(cloned, original);
for (const key of ["banner", "bannerURL", "premiumType", "premiumSince", "premiumGuildSince", "avatarURL", "themeColors", "userProfile"])
    assert.equal(cloned[key], original[key], `${key} is preserved without an override`);
assert.equal(cloned.getBannerURL(), "real-banner-url");
assert.equal(original.bannerURL, "real-banner-url");
assert.equal(Object.getOwnPropertyDescriptor(original, "bannerURL").configurable, false);

preview.bannerMedia = { uri: "custom-banner" };
context.profileCache = new WeakMap();
const overridden = vm.runInContext("cloneObject(original, 'profile')", context);
assert.equal(overridden.bannerURL, "custom-banner");
assert.equal(overridden.getBannerURL(), "custom-banner");
assert.equal(original.getBannerURL(), "real-banner-url");

preview.enabled = false;
assert.equal(vm.runInContext("cloneObject(original, 'profile')", context), original);

const settings = {};
const sections = {};
const sectionModule = { exports: {} };
const sectionSource = fs.readFileSync(path.join(repoRoot, "ios/runtime/src/core/ui/settings/index.ts"), "utf8");
const sectionContext = vm.createContext({
    module: sectionModule, exports: sectionModule.exports,
    __CLOUDCORD_BRIDGELESS__: true,
    require(name) {
        if (name === "@assets/icons/cloudcord.png") return "icon";
        if (name === "@core/i18n") return { Strings: { PUPU: "CloudCord", THEMES: "Themes", FONTS: "Fonts" } };
        if (name === "@core/vendetta/storage") return { useProxy: value => value };
        if (name === "@lib/api/assets") return { findAssetId: () => 1 };
        if (name === "@lib/api/settings") return { settings };
        if (name === "@ui/settings") return { registerSection: section => { sections[section.name] = section.items; } };
        if (name === "bunny-build-info") return { version: "test" };
        throw new Error(`Unexpected import: ${name}`);
    }
});
vm.runInContext(transformSync(sectionSource, { loader: "ts", format: "cjs" }).code, sectionContext);
sectionModule.exports.default();
for (const key of ["BUNNY_THEMES", "BUNNY_FONTS"])
    assert.equal(sections.CloudCord.find(row => row.key === key).usePredicate(), true, `${key} remains visible`);
settings.cloudcordHiddenTabs = ["BUNNY_THEMES"];
assert.equal(sections.CloudCord.find(row => row.key === "BUNNY_THEMES").usePredicate(), false, "explicit hiding still works");
console.log("preview banner preservation, custom overrides, and theme/font tab visibility passed");

