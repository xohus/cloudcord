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
        // Discord 344: keep startup non-invasive. Legacy runtime patches can
        // interfere with Discord's channel/navigation stores under bridgeless
        // React Native, so expose the CloudCord settings shell only for now.
        const settingsUnpatch = await patchSettings();
        initSettings();
        if (settingsUnpatch) lib.unload.push(settingsUnpatch);

        window.bunny = lib;
        logger.log("CloudCord 344 safe settings shell is ready!");
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
            showConfirmationAlert({title: "Temporary CloudCord Issues", content: "CloudCord is currently experiencing issues. You may see errors such as channels not loading, pages failing to load, or other parts of the app not working correctly. The CloudCord section is currently broken and will be fixed tomorrow. Thanks for your patience.", confirmText: "I understand"});
        }, 5000);
    } catch(e) {}
};
