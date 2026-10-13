#!/usr/bin/env python3
"""Check packaged ReplayKit capabilities, not device/provisioning compatibility."""
import argparse
import importlib.util
import plistlib
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

spec = importlib.util.spec_from_file_location("cloudcord_packager", Path(__file__).with_name("package-cloudcord-ipa.py"))
packager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packager)


def verify_capabilities(host, extension, info):
    group_key = "com.apple.security.application-groups"
    for label, entitlements in (("Discord", host), ("BroadcastUpload", extension)):
        groups = entitlements.get(group_key)
        if not isinstance(groups, list) or packager.DISCORD_APP_GROUP not in groups:
            raise ValueError(f"{label} is missing Discord's shared App Group")
    if info.get("NSExtension", {}).get("NSExtensionPointIdentifier") != "com.apple.broadcast-services-upload":
        raise ValueError("BroadcastUpload is not a ReplayKit upload extension")
    team_key = "com.apple.developer.team-identifier"
    if host.get(team_key) and extension.get(team_key) and host[team_key] != extension[team_key]:
        raise ValueError("Host and broadcast extension have different signing teams")


def verify_ipa(ipa):
    with tempfile.TemporaryDirectory(prefix="cloudcord-broadcast-check-") as directory:
        root = Path(directory)
        with zipfile.ZipFile(ipa) as archive:
            for name in archive.namelist():
                path = PurePosixPath(name)
                if path.is_absolute() or ".." in path.parts or "\\" in name:
                    raise ValueError("Unsafe IPA archive path")
            archive.extractall(root)
        apps = list((root / "Payload").glob("*.app"))
        if len(apps) != 1:
            raise ValueError("IPA must contain one app")
        app = apps[0]
        broadcast = app / "PlugIns" / "BroadcastUpload.appex"
        info = plistlib.loads((broadcast / "Info.plist").read_bytes())
        host_bytes = packager.read_entitlements(packager.bundle_executable(app))
        extension_bytes = packager.read_entitlements(packager.bundle_executable(broadcast))
        if not host_bytes or not extension_bytes:
            raise ValueError("Unable to inspect packaged host/broadcast entitlements")
        verify_capabilities(plistlib.loads(host_bytes), plistlib.loads(extension_bytes), info)
        print("PASS: packaged ReplayKit extension and shared App Group preserved; final signer and device testing still required")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("ipa", type=Path)
    verify_ipa(parser.parse_args().ipa)
