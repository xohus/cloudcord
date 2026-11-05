import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { ccpCommandCapabilities, parseCcp, runCcpCommand } from "@utils/ccp";
import { inspectCcpRuntime } from "@utils/ccpInspect";
import { copyToClipboard } from "@utils/clipboard";
import definePlugin from "@utils/types";
import { wreq } from "@webpack";
import * as Common from "@webpack/common";

import source from "./character-counter.ccp";

const plugin = parseCcp(source, ccpCommandCapabilities);

export default definePlugin({
    name: "CCPCharacterCounter",
    description: "Counts text with the portable /ccp-count command.",
    authors: [{ name: "CloudCord", id: 0n }],
    commands: [{
        name: plugin.command,
        description: "Count the characters in some text",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [{
            name: "text",
            description: "Text to count",
            type: ApplicationCommandOptionType.STRING,
            required: true,
        }],
        execute(args, context) {
            const input = findOption(args, "text", "");
            sendBotMessage(context.channel.id, { content: runCcpCommand(plugin, input) });
        },
    }, {
        name: "ccp-inspect",
        description: "Copy a local report of the Discord functions CloudCord can see",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [],
        async execute(_args, context) {
            const report = inspectCcpRuntime("desktop", name => (Common as Record<string, unknown>)[name], wreq?.c);
            await copyToClipboard(JSON.stringify(report));
            sendBotMessage(context.channel.id, { content: `Copied the CCP report. Found ${report.modules.length} loaded modules and checked ${Object.keys(report.checks).length} read-only calls.` });
        },
    }],
});
