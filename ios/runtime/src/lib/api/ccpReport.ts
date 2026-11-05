import { inspectCcpRuntime } from "@lib/api/ccpInspect";
import { findByStoreName } from "@metro";
import { clipboard } from "@metro/common";

export async function copyCcpReport() {
    const globals = globalThis as typeof globalThis & { modules?: unknown; __CLOUDCORD_MODULE_VIEW__?: unknown };
    const report = inspectCcpRuntime("mobile", findByStoreName, globals.modules ?? globals.__CLOUDCORD_MODULE_VIEW__);
    await clipboard.setString(JSON.stringify(report));
    return report;
}
