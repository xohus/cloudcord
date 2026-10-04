const updateAction = chrome.action || chrome.browserAction;
async function checkCloudCordUpdate() {
    try {
        const response = await fetch("https://getcloudcord.com/api/browser/release", { cache: "no-store" });
        if (!response.ok) return;
        const release = await response.json();
        if (!/^[a-f0-9]{40}$/.test(release.hash || "")) return;
        const current = "__CLOUDCORD_BUILD_HASH__";
        const available = !release.hash.startsWith(current || "unknown");
        await chrome.storage.local.set({ cloudcordUpdateAvailable: available });
        updateAction.setBadgeText({ text: available ? "↑" : "" });
        updateAction.setBadgeBackgroundColor({ color: "#5865f2" });
        updateAction.setTitle({ title: available ? "CloudCord update available — click to download" : "CloudCord — Your Discord, your way." });
    } catch { /* Offline: retry at the next scheduled check. */ }
}
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create("cloudcord-updates", { periodInMinutes: 60 });
    void checkCloudCordUpdate();
});
chrome.runtime.onStartup.addListener(() => void checkCloudCordUpdate());
chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === "cloudcord-updates") void checkCloudCordUpdate(); });
updateAction.onClicked.addListener(() => chrome.tabs.create({ url: "https://getcloudcord.com/#download" }));
