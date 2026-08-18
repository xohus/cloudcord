/*
 * Sincord, a modification for Discord's desktop app
 * Copyright (c) 2024 Sincord contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
*/

import "./checkNodeVersion.js";

import { execFileSync, execSync, spawnSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const BASE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const INSTALLER_DIR = join(BASE_DIR, "installer");
const DIST_DESKTOP = join(BASE_DIR, "dist", "desktop");

function getPlatformBinaryName() {
    switch (process.platform) {
        case "win32": return "Sinlotl.exe";
        case "darwin": return process.arch === "arm64" ? "Sinlotl-darwin-arm64" : "Sinlotl-darwin-x64";
        case "linux": return "Sinlotl-linux";
        default: throw new Error("Unsupported platform: " + process.platform);
    }
}

function buildInstaller() {
    const binaryName = getPlatformBinaryName();
    const binaryPath = join(INSTALLER_DIR, binaryName);

    if (!existsSync(INSTALLER_DIR)) {
        throw new Error("installer/ folder not found. Make sure you have the full Sincord repo.");
    }

    // Check if go is available
    const goCheck = spawnSync("go", ["version"], { stdio: "pipe" });
    if (goCheck.status !== 0) {
        throw new Error("Go is not installed. Install it with: brew install go");
    }

    console.log("Building Sinlotl installer...");
    execSync(`go build -o ${binaryName} .`, {
        cwd: INSTALLER_DIR,
        stdio: "inherit"
    });

    if (!existsSync(binaryPath)) {
        throw new Error("Installer build failed - binary not found at " + binaryPath);
    }

    // Make executable on unix
    if (process.platform !== "win32") {
        execSync(`chmod +x "${binaryPath}"`);
    }

    console.log("Installer built successfully!");
    return binaryPath;
}

function getInstallerBinary() {
    const binaryName = getPlatformBinaryName();
    const binaryPath = join(INSTALLER_DIR, binaryName);

    // Already built
    if (existsSync(binaryPath)) {
        console.log("Using existing installer binary.");
        return binaryPath;
    }

    // Build it
    return buildInstaller();
}

if (!existsSync(DIST_DESKTOP)) {
    console.error("ERROR: dist/desktop not found. Run 'pnpm build' first!");
    process.exit(1);
}

const installerBin = getInstallerBinary();

console.log("Launching Sinlotl installer...");

const argStart = process.argv.indexOf("--");
const args = argStart === -1 ? [] : process.argv.slice(argStart + 1);

try {
    execFileSync(installerBin, args, {
        stdio: "inherit",
        env: {
            ...process.env,
            SINCORD_USER_DATA_DIR: BASE_DIR,
            SINCORD_DIRECTORY: DIST_DESKTOP,
            SINCORD_DEV_INSTALL: "1"
        }
    });
} catch {
    console.error("Installer exited. Check logs above.");
}
