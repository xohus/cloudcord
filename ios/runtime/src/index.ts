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
    if (!(globalThis as any).__CLOUDCORD_BRIDGELESS__) await initLegacyRuntimeRefresh();

    // Discord 344 changes modules frequently. Start features independently so
    // one missing optional module cannot take down CloudCord or Discord.
    const results = await Promise.allSettled([
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
    ]);
    for (const result of results) {
        if (result.status === "fulfilled") {
            if (result.value) lib.unload.push(result.value);
        } else {
            logger.error("A CloudCord feature failed to initialize", result.reason);
        }
    }

    initDebugger()

    // Assign window object
    window.bunny = lib;

    // We good :)
    logger.log("CloudCord is ready!");

};
