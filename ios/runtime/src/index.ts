import { initBotCordSwitcher } from "@core/ui/botcord/FloatingSwitcher";
import patchErrorBoundary from "@core/debug/patches/patchErrorBoundary";
import initFixes from "@core/fixes";
import { initFetchI18nStrings } from "@core/i18n";
import initSettings from "@core/ui/settings";
import { initVendettaObject } from "@core/vendetta/api";
import { VdPluginManager } from "@core/vendetta/plugins";
import { updateFonts } from "@lib/addons/fonts";
import { initPlugins, updatePlugins } from "@lib/addons/plugins";
import { initThemes } from "@lib/addons/themes";
import { patchCommands } from "@lib/api/commands";
import { patchLogHook } from "@lib/api/debug";
import { initLegacyRuntimeRefresh } from "@lib/api/native/legacyRuntimeRefresh";
import { injectFluxInterceptor } from "@lib/api/flux";
import { patchJsx } from "@lib/api/react/jsx";
import { logger } from "@lib/utils/logger";
import { patchSettings } from "@ui/settings";
import { initDebugger } from "@lib/api/debug";

import * as lib from "./lib";

export default async () => {
    if ((globalThis as any).__CLOUDCORD_BRIDGELESS__) {
        // Discord 344: expose only the CloudCord settings shell. The legacy
        // plugin/profile startup patches account, guild and navigation stores
        // and is not safe under React Native's bridgeless architecture.
        const settingsUnpatch = await patchSettings();
        initSettings();
        if (settingsUnpatch) lib.unload.push(settingsUnpatch);
        window.bunny = lib;
        logger.log("CloudCord 344 settings shell is ready!");
        return;
    }

    await initLegacyRuntimeRefresh();

    // Load everything in parallel
    await Promise.all([
        initThemes(),
        injectFluxInterceptor(),
        patchSettings(),
        patchLogHook(),
        patchCommands(),
        patchJsx(),
        initVendettaObject(),
        initFetchI18nStrings(),
        initSettings(),
        initBotCordSwitcher(),
        initFixes(),
        patchErrorBoundary(),
        updatePlugins(),
        updateFonts(),
        initPlugins(),
        VdPluginManager.initPlugins(),
    ]).then(
        // Push them all to unloader
        u => u.forEach(f => f && lib.unload.push(f))
    );

    initDebugger()

    // Assign window object
    window.bunny = lib;

    // We good :)
    logger.log("CloudCord is ready!");

    try {
        const { showConfirmationAlert } = require("@lib/ui/alerts");
        setTimeout(() => {
            showConfirmationAlert({title: "Critical Update Required", content: "CloudCord is migrating to private servers! You MUST download the new App from our website to continue receiving updates.", confirmText: "I understand"});
        }, 5000);
    } catch(e) {}
};
