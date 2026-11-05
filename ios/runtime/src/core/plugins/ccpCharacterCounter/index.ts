import { defineCorePlugin } from "..";
import { ccpCommandCapabilities, parseCcp, runCcpCommand } from "@lib/api/ccp";
import { copyCcpReport } from "@lib/api/ccpReport";
import { registerCommand } from "@lib/api/commands";
import { ApplicationCommandOptionType } from "@lib/api/commands/types";
import { messageUtil } from "@metro/common";

import source from "./character-counter.ccp";

const plugin = parseCcp(source, ccpCommandCapabilities);
const unregister: (() => void)[] = [];

export const preenabled = false;
export default defineCorePlugin({
    manifest: {
        id: plugin.id,
        version: plugin.version,
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: plugin.name,
            description: "Counts text with the portable /ccp-count command.",
            authors: [{ name: "CloudCord" }],
        },
    },
    start() {
        if (unregister.length) return;
        unregister.push(registerCommand({
            name: plugin.command,
            description: "Count the characters in some text",
            // The current mobile command registry filters out false.
            shouldHide: () => true,
            options: [{
                name: "text",
                displayName: "text",
                description: "Text to count",
                type: ApplicationCommandOptionType.STRING,
                required: true,
            }],
            execute(args, context) {
                const input = args.find(arg => arg.name === "text")?.value;
                messageUtil.sendBotMessage(context.channel.id, runCcpCommand(plugin, typeof input === "string" ? input : ""));
            },
        }));
        try {
            unregister.push(registerCommand({
                name: "ccp-inspect",
                description: "Copy a local report of the Discord functions CloudCord can see",
                shouldHide: () => true,
                options: [],
                async execute(_args, context) {
                    const report = await copyCcpReport();
                    messageUtil.sendBotMessage(context.channel.id, `Copied the CCP report. Found ${report.modules.length} loaded modules and checked ${Object.keys(report.checks).length} read-only calls.`);
                },
            }));
        } catch (error) {
            unregister.pop()?.();
            throw error;
        }
    },
    stop() {
        for (const remove of unregister.splice(0)) remove();
    },
});
