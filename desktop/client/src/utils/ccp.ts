const quotedString = '"(?:[^"\\\\]|\\\\.)*"';
const declaration = new RegExp('^plugin ([a-z][a-z0-9.-]{2,63}) (' + quotedString + ') version (' + quotedString + ')$');
const replyStatement = new RegExp('^reply (' + quotedString + ')$');
const commandHandler = /^on command ([a-z][a-z0-9-]{1,31})\(text\) \{$/;

export function parseCcp(source: string, supported: ReadonlySet<string>) {
    if (source.length > 16_384) throw new Error("CCP file exceeds 16 KiB");
    const lines = source.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith("//"));
    if (lines[0] !== "ccp 1") throw new Error("Expected CCP language version 1");

    const plugin = lines[1]?.match(declaration);
    const permissions = lines[2]?.match(/^requires ([a-z.]+(?:,\s*[a-z.]+)*)$/)?.[1].split(/,\s*/);
    const command = lines[3]?.match(commandHandler);
    const reply = lines[4]?.match(replyStatement);
    if (!plugin || !permissions || !command || !reply || lines[5] !== "}" || lines.length !== 6) {
        throw new Error("Expected a plugin declaration and a single command handler with a reply");
    }

    for (const capability of ["command.register", "reply.local"]) {
        if (!permissions.includes(capability)) throw new Error("CCP plugin must declare " + capability);
    }
    for (const permission of permissions) {
        if (!supported.has(permission)) throw new Error("Unsupported CCP capability: " + permission);
    }

    const name: string = JSON.parse(plugin[2]);
    const version: string = JSON.parse(plugin[3]);
    const template: string = JSON.parse(reply[1]);
    if (!name.trim() || name.length > 64 || !/^\d+\.\d+\.\d+$/.test(version)) {
        throw new Error("Invalid CCP plugin name or version");
    }
    if (!template.trim() || template.length > 1_000 || /\$\{/.test(template.replaceAll("${length(text)}", ""))) {
        throw new Error("CCP reply supports literal text and length(text)");
    }
    return { id: plugin[1], name, version, command: command[1], template };
}

export const ccpCommandCapabilities = new Set(["command.register", "reply.local"]);

export function runCcpCommand(plugin: ReturnType<typeof parseCcp>, input: string): string {
    // Discord counts JavaScript UTF-16 units for its message length limit.
    return plugin.template.replaceAll("${length(text)}", String(input.length));
}
