#!/usr/bin/env bash
# Builds out/CloudCordInstaller.exe, the animated Windows installer, with the C# compiler
# that ships with Windows (.NET Framework 4.8). It downloads the latest CloudCord
# desktop build from GitHub Releases, so nothing else needs to be built first.
set -euo pipefail
cd "$(dirname "$0")"

FW=/c/Windows/Microsoft.NET/Framework64/v4.0.30319
OUT=out
mkdir -p "$OUT"

"$FW/csc.exe" -nologo -target:winexe -optimize+ -out:"$OUT/CloudCordInstaller.exe" \
    -win32icon:icon.ico \
    -r:"$FW/WPF/PresentationCore.dll" -r:"$FW/WPF/PresentationFramework.dll" -r:"$FW/WPF/WindowsBase.dll" \
    -r:"$FW/System.Xaml.dll" -r:System.dll -r:System.Core.dll \
    -resource:logo-white.png,logo.png \
    Installer.cs

ls -la "$OUT/CloudCordInstaller.exe"
