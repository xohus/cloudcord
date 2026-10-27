import { PluginInstanceInternal } from "@lib/addons/plugins/types";

interface CorePlugin {
  default: PluginInstanceInternal;
  preenabled: boolean;
}

// Called from @lib/plugins
export const getCorePlugins = (): Record<string, CorePlugin> => ({
    "bunny.quickinstall": require("./quickinstall"),
    "bunny.badges": require("./badges"),
    "bunny.notrack": require("./notrack"),
    "bunny.messagefix": require("./messagefix"),
    // Mobile versions of desktop plugins; each credits the plugin's original authors. Off until turned on.
    "cloudcord.clearurls": { ...require("./clearurls"), preenabled: false },
    "cloudcord.noreplymention": { ...require("./noreplymention"), preenabled: false },
    "cloudcord.unindent": { ...require("./unindent"), preenabled: false },
    "cloudcord.silenttyping": { ...require("./silenttyping"), preenabled: false },
    "cloudcord.noblockedmessages": { ...require("./noblockedmessages"), preenabled: false },
    "cloudcord.blockkeywords": { ...require("./blockkeywords"), preenabled: false },
    "cloudcord.atsomeone": { ...require("./atsomeone"), preenabled: false },
    "cloudcord.morecommands": { ...require("./morecommands"), preenabled: false },
    "cloudcord.textreplace": { ...require("./textreplace"), preenabled: false },
    "cloudcord.nopendingcount": { ...require("./nopendingcount"), preenabled: false },
    "cloudcord.googlethat": { ...require("./googlethat"), preenabled: false },
    "cloudcord.ingtoninator": { ...require("./ingtoninator"), preenabled: false },
    "cloudcord.writeuppercase": { ...require("./writeuppercase"), preenabled: false },
    "cloudcord.talkinreverse": { ...require("./talkinreverse"), preenabled: false },
    "cloudcord.signature": { ...require("./signature"), preenabled: false },
    "cloudcord.silentmessagetoggle": { ...require("./silentmessagetoggle"), preenabled: false },
    "cloudcord.splitlargemessages": { ...require("./splitlargemessages"), preenabled: false },
    "cloudcord.polishwording": { ...require("./polishwording"), preenabled: false },
});

/**
 * @internal
 */
export function defineCorePlugin(
  instance: PluginInstanceInternal,
): PluginInstanceInternal {
  // @ts-expect-error
  instance[Symbol.for("bunny.core.plugin")] = true;
  return instance;
}
