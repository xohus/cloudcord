chrome.commands.onCommand.addListener(async command => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) chrome.tabs.sendMessage(tab.id, { command });
});

chrome.runtime.onMessage.addListener(message => {
    if (message.action === "openShortcuts")
        chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});
