import { defineCorePlugin } from "..";
import { ccpCommandCapabilities, parseCcp, runCcpCommand } from "@lib/api/ccp";
import { inspectCcpRuntime } from "@lib/api/ccpInspect";
import { registerCommand } from "@lib/api/commands";
import { ApplicationCommandOptionType } from "@lib/api/commands/types";
import { findByStoreName } from "@metro";
import { clipboard, messageUtil } from "@metro/common";

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
            shouldHide: () => false,
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
                shouldHide: () => false,
                options: [],
                async execute(_args, context) {
                    const globals = globalThis as typeof globalThis & { modules?: unknown; __CLOUDCORD_MODULE_VIEW__?: unknown };
                    const report = inspectCcpRuntime("mobile", findByStoreName, globals.modules ?? globals.__CLOUDCORD_MODULE_VIEW__);
                    await clipboard.setString(JSON.stringify(report));
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
