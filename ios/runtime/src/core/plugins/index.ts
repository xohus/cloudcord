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
    "cloudcord.friendinvites": { ...require("./friendinvites"), preenabled: false },
    "cloudcord.sendtimestamps": { ...require("./sendtimestamps"), preenabled: false },
    "cloudcord.scheduledmessages": { ...require("./scheduledmessages"), preenabled: false },
    "cloudcord.customcommands": { ...require("./customcommands"), preenabled: false },
    "cloudcord.relationshipnotifier": { ...require("./relationshipnotifier"), preenabled: false },
    "cloudcord.ignorecalls": { ...require("./ignorecalls"), preenabled: false },
    "cloudcord.spotifysharecommands": { ...require("./spotifysharecommands"), preenabled: false },
    "cloudcord.followvoiceuser": { ...require("./followvoiceuser"), preenabled: false },
    "cloudcord.voicerejoin": { ...require("./voicerejoin"), preenabled: false },
    "cloudcord.voicejoinmessages": { ...require("./voicejoinmessages"), preenabled: false },
    "cloudcord.messagelogger": { ...require("./messagelogger"), preenabled: false },
    "cloudcord.hopon": { ...require("./hopon"), preenabled: false },
    "cloudcord.noprofilethemes": { ...require("./noprofilethemes"), preenabled: false },
    "cloudcord.fakeprofilethemes": { ...require("./fakeprofilethemes"), preenabled: false },
    "cloudcord.dontroundmytimestamps": { ...require("./dontroundmytimestamps"), preenabled: false },
    "cloudcord.readallnotifications": { ...require("./readallnotifications"), preenabled: false },
    "cloudcord.newguildsettings": { ...require("./newguildsettings"), preenabled: false },
    "cloudcord.betterplusreacts": { ...require("./betterplusreacts"), preenabled: false },
    "cloudcord.translate": { ...require("./translate"), preenabled: false },
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
