/*
 * CloudCord, a Discord client mod
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { spawn } from "child_process";
import { join } from "path";

const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;

// The loaded ASAR is locked on Windows. Replace it only after Discord exits.
export function windowsUpdateScript(archive: string, checksum: string, executable: string, parentPid: number) {
    if (!/^[a-f0-9]{64}$/.test(checksum) || !Number.isSafeInteger(parentPid) || parentPid <= 0)
        throw new Error("Invalid staged Windows update");
    return `
$ErrorActionPreference = 'Stop'
$archive = ${literal(archive)}
$staged = $archive + '.new'
$backup = $archive + '.backup'
$failure = $archive + '.update-error.txt'
$parentProcess = $null
try { $parentProcess = [Diagnostics.Process]::GetProcessById(${parentPid}) } catch {}
if ($parentProcess -and -not $parentProcess.WaitForExit(60000)) {
    [IO.File]::WriteAllText($failure, 'Discord did not exit; update was not applied.')
    exit 1
}
try {
    $stream = [IO.File]::OpenRead($staged)
    $sha = [Security.Cryptography.SHA256]::Create()
    try { $hash = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '').ToLowerInvariant() }
    finally { $stream.Dispose(); $sha.Dispose() }
    if ($hash -ne ${literal(checksum)}) {
        throw 'Staged CloudCord update failed SHA-256 verification.'
    }
    $replaced = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        try {
            [IO.File]::Replace($staged, $archive, $backup, $true)
            $replaced = $true
            break
        } catch {
            if ($attempt -eq 29) { throw }
            [Threading.Thread]::Sleep(500)
        }
    }
    if (-not $replaced) { throw 'CloudCord update could not replace the runtime.' }
} catch {
    [IO.File]::WriteAllText($failure, $_.Exception.Message)
}
$launch = New-Object Diagnostics.ProcessStartInfo
$launch.FileName = ${literal(executable)}
$launch.WindowStyle = [Diagnostics.ProcessWindowStyle]::Normal
[Diagnostics.Process]::Start($launch) | Out-Null
`;
}

export async function launchWindowsUpdate(archive: string, checksum: string, executable: string) {
    const script = windowsUpdateScript(archive, checksum, executable, process.pid);
    const powershell = join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    const child = spawn(powershell, ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")], {
        detached: true, stdio: "ignore", windowsHide: true
    });
    await new Promise<void>((resolve, reject) => {
        child.once("error", reject);
        child.once("spawn", resolve);
    });
    child.unref();
}
