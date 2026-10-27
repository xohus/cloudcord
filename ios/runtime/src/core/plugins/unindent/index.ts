import { defineCorePlugin } from "..";
import { onSendMessage } from "../shared/sendMessage";

// Mobile version of the Unindent plugin by Ven.
function unindent(code: string) {
    const lines = code.replace(/^\n+/, "").split("\n");
    const indents = lines.filter(line => line.trim()).map(line => line.match(/^[\t ]*/)![0].length);
    const minimum = indents.length ? Math.min(...indents) : 0;
    return minimum ? lines.map(line => line.slice(minimum)).join("\n") : code;
}

let unpatch: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.unindent",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "Unindent",
            description: "Removes extra indentation from code blocks you send",
            authors: [{ name: "Ven" }],
        },
    },
    start() {
        unpatch = onSendMessage(message => {
            if (typeof message.content === "string")
                message.content = message.content.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => `\`\`\`${lang}\n${unindent(code)}\`\`\``);
        });
    },
    stop() { unpatch?.(); unpatch = undefined; },
});
