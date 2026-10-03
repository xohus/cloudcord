#!/usr/bin/env python3
"""Inject the unsigned CloudCord runtime package into a decrypted Discord IPA."""

import argparse
import base64
import hashlib
import json
import io
import lzma
import plistlib
import shutil
import struct
import subprocess
import tarfile
import tempfile
import zipfile
from pathlib import Path


LC_SEGMENT_64 = 0x19
LC_LOAD_DYLIB = 0xC
DISCORD_APP_GROUP = "group.com.hammerandchisel.discord"


def bundle_executable(bundle: Path) -> Path:
    info = plistlib.loads((bundle / "Info.plist").read_bytes())
    return bundle / info["CFBundleExecutable"]


def read_entitlements(executable: Path) -> bytes | None:
    """Keep the original signed capabilities before modifying the app."""
    commands: list[list[str]] = []
    codesign = shutil.which("codesign")
    if codesign:
        commands.append([codesign, "-d", "--entitlements", ":-", str(executable)])
    ldid = shutil.which("ldid")
    if ldid:
        commands.append([ldid, "-e", str(executable)])

    for command in commands:
        result = subprocess.run(command, capture_output=True)
        raw = result.stdout + result.stderr
        xml_start = raw.find(b"<?xml")
        if xml_start < 0:
            xml_start = raw.find(b"<plist")
        xml_end = raw.find(b"</plist>", xml_start)
        if xml_start >= 0 and xml_end >= 0:
            payload = raw[xml_start : xml_end + len(b"</plist>")]
            try:
                return plistlib.dumps(plistlib.loads(payload))
            except plistlib.InvalidFileException:
                pass
        binary_start = raw.find(b"bplist00")
        if binary_start >= 0:
            try:
                return plistlib.dumps(plistlib.loads(raw[binary_start:]))
            except plistlib.InvalidFileException:
                pass
    return None


def sign_with_entitlements(executable: Path, entitlements: bytes | None, root: Path) -> None:
    codesign = shutil.which("codesign")
    ldid = shutil.which("ldid")
    if not codesign and not ldid:
        return
    if entitlements:
        entitlement_file = root / f"{executable.name}.entitlements.plist"
        entitlement_file.write_bytes(entitlements)
        if codesign:
            subprocess.run(
                [codesign, "--force", "--sign", "-", "--entitlements", str(entitlement_file), str(executable)],
                check=True,
            )
        else:
            subprocess.run([ldid, f"-S{entitlement_file}", str(executable)], check=True)
    else:
        if codesign:
            subprocess.run([codesign, "--force", "--sign", "-", str(executable)], check=True)
        else:
            subprocess.run([ldid, "-S", str(executable)], check=True)


def add_discord_app_group(entitlements: bytes | None) -> bytes:
    """Restore the shared container used by Discord and BroadcastUpload."""
    values = plistlib.loads(entitlements) if entitlements else {}
    key = "com.apple.security.application-groups"
    groups = list(values.get(key, []))
    if DISCORD_APP_GROUP not in groups:
        groups.append(DISCORD_APP_GROUP)
    values[key] = groups
    return plistlib.dumps(values)


def extract_deb(deb: Path, destination: Path) -> tuple[list[Path], list[Path]]:
    raw = deb.read_bytes()
    if raw[:8] != b"!<arch>\n":
        raise RuntimeError("CloudCord package is not a Debian archive")
    cursor = 8
    payload = None
    while cursor + 60 <= len(raw):
        header = raw[cursor:cursor + 60]
        name = header[:16].decode("ascii").strip().rstrip("/")
        size = int(header[48:58].decode("ascii").strip())
        body = raw[cursor + 60:cursor + 60 + size]
        if name.startswith("data.tar"):
            payload = (name, body)
            break
        cursor += 60 + size + (size & 1)
    if payload is None:
        raise RuntimeError("CloudCord package has no data archive")

    name, body = payload
    if name.endswith(".lzma"):
        body = lzma.decompress(body, format=lzma.FORMAT_ALONE)
    dylibs: list[Path] = []
    bundles: list[Path] = []
    with tarfile.open(fileobj=io.BytesIO(body), mode="r:*") as archive:
        members = archive.getmembers()
        for member in members:
            if member.isfile() and member.name.endswith(".dylib"):
                stream = archive.extractfile(member)
                if stream:
                    target = destination / Path(member.name).name
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(stream.read())
                    dylibs.append(target)
        bundle_names = sorted({
            part for member in members for part in Path(member.name).parts
            if part.endswith(".bundle")
        })
        for bundle_name in bundle_names:
            target_root = destination / bundle_name
            for member in members:
                parts = Path(member.name).parts
                if bundle_name not in parts or not member.isfile():
                    continue
                stream = archive.extractfile(member)
                if not stream:
                    continue
                target = target_root / Path(*parts[parts.index(bundle_name) + 1:])
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(stream.read())
            bundles.append(target_root)
    return dylibs, bundles


def add_load_command(executable: Path, dylib_path: str) -> None:
    data = bytearray(executable.read_bytes())
    magic, ncmds, sizeofcmds = struct.unpack_from("<I12xII", data, 0)
    if magic != 0xFEEDFACF:
        raise RuntimeError(f"Unsupported Discord Mach-O magic: {magic:#x}")
    cursor = 32
    first_section = len(data)
    for _ in range(ncmds):
        command, command_size = struct.unpack_from("<II", data, cursor)
        if command == LC_LOAD_DYLIB:
            name_offset = struct.unpack_from("<I", data, cursor + 8)[0]
            end = data.find(0, cursor + name_offset, cursor + command_size)
            if data[cursor + name_offset:end].decode("utf-8") == dylib_path:
                return
        if command == LC_SEGMENT_64:
            section_count = struct.unpack_from("<I", data, cursor + 64)[0]
            section_cursor = cursor + 72
            for _ in range(section_count):
                section_offset = struct.unpack_from("<I", data, section_cursor + 48)[0]
                if section_offset:
                    first_section = min(first_section, section_offset)
                section_cursor += 80
        if command_size < 8:
            raise RuntimeError("Invalid Discord Mach-O load command")
        cursor += command_size

    encoded = dylib_path.encode("utf-8") + b"\0"
    command_size = (24 + len(encoded) + 7) & ~7
    command_offset = 32 + sizeofcmds
    if command_offset + command_size > first_section:
        raise RuntimeError("Discord executable has insufficient Mach-O header padding")
    command = struct.pack("<IIIIII", LC_LOAD_DYLIB, command_size, 24, 2, 0, 0)
    data[command_offset:command_offset + command_size] = command + encoded + bytes(command_size - 24 - len(encoded))
    struct.pack_into("<I", data, 16, ncmds + 1)
    struct.pack_into("<I", data, 20, sizeofcmds + command_size)
    executable.write_bytes(data)


def strip_mod_load_commands(executable: Path) -> None:
    """Only detach known old mod injectors; preserve every Discord dependency."""
    data = bytearray(executable.read_bytes())
    magic, count, size = struct.unpack_from("<I12xII", data, 0)
    if magic != 0xFEEDFACF:
        raise RuntimeError("Unsupported Discord executable")
    cursor = 32
    commands = []
    for _ in range(count):
        kind, length = struct.unpack_from("<II", data, cursor)
        command = bytes(data[cursor:cursor + length])
        discard = False
        if kind == LC_LOAD_DYLIB:
            offset = struct.unpack_from("<I", command, 8)[0]
            name = command[offset:].split(b"\\0", 1)[0].decode()
            discard = Path(name).name in {"RainTweak.dylib", "CloudCordTweak.dylib", "CloudCordBootstrap.dylib"}
        if not discard:
            commands.append(command)
        cursor += length
    joined = b"".join(commands)
    data[32:32 + size] = joined + bytes(size - len(joined))
    struct.pack_into("<II", data, 16, len(commands), len(joined))
    executable.write_bytes(data)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--discord-ipa", type=Path, required=True)
    parser.add_argument("--discord-version", required=True)
    parser.add_argument("--runtime-deb", type=Path)
    parser.add_argument("--rain-loader", type=Path)
    parser.add_argument("--rain-bootstrap", type=Path)
    parser.add_argument("--runtime-js", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--startup-diagnostics", action="store_true", help="Expose local startup.txt through Files for testing")
    args = parser.parse_args()

    with tempfile.TemporaryDirectory(prefix="cloudcord-ios-") as temporary:
        root = Path(temporary)
        app_root = root / "app"
        with zipfile.ZipFile(args.discord_ipa) as archive:
            archive.extractall(app_root)
        discord_app = next((app_root / "Payload").glob("*.app"))
        info = plistlib.loads((discord_app / "Info.plist").read_bytes())
        if args.startup_diagnostics:
            info["UIFileSharingEnabled"] = True
            info["LSSupportsOpeningDocumentsInPlace"] = True
            (discord_app / "Info.plist").write_bytes(plistlib.dumps(info))
        if info.get("CFBundleShortVersionString") != args.discord_version:
            raise RuntimeError(
                f"Expected Discord {args.discord_version}, got {info.get('CFBundleShortVersionString')}"
            )

        main_bundle = discord_app / "main.jsbundle"
        if not main_bundle.exists():
            raise RuntimeError("Discord main.jsbundle is missing")
        bundle_data = main_bundle.read_bytes()
        required_runtime_markers = (
            b"getCurrentUser",
            b"UserProfileStore",
            b"useBadges",
            b"showSimpleActionSheet",
            b"ChannelStore",
        )
        missing_markers = [
            marker.decode("ascii") for marker in required_runtime_markers if marker not in bundle_data
        ]
        if missing_markers:
            raise RuntimeError(
                "Discord runtime is incompatible; missing hook markers: "
                + ", ".join(missing_markers)
            )

        executable = discord_app / info["CFBundleExecutable"]
        app_entitlements = read_entitlements(executable)
        broadcast = discord_app / "PlugIns" / "BroadcastUpload.appex"
        if not broadcast.exists():
            raise RuntimeError("Discord BroadcastUpload extension is missing; iOS call streaming would not work")
        extension_entitlements = {
            extension: read_entitlements(bundle_executable(extension))
            for extension in (discord_app / "PlugIns").glob("*.appex")
        }
        if not extension_entitlements.get(broadcast):
            raise RuntimeError("Could not preserve BroadcastUpload entitlements; refusing to break iOS call streaming")
        app_entitlements = add_discord_app_group(app_entitlements)
        extension_entitlements[broadcast] = add_discord_app_group(extension_entitlements[broadcast])

        frameworks = discord_app / "Frameworks"
        frameworks.mkdir(exist_ok=True)
        if args.rain_loader:
            if not args.rain_bootstrap or not args.runtime_js:
                raise RuntimeError("Rain mode requires the bootstrap and runtime")
            raw = base64.b64decode(args.rain_loader.read_text(), validate=False)
            expected = "e43cad3e64c2d518b1744a214d1ecb8fe89342e064976c5eed8e6b6f1d82b825"
            if hashlib.sha256(raw).hexdigest() != expected:
                raise RuntimeError("Original RainTweak binary changed")
            strip_mod_load_commands(executable)
            legacy = frameworks / "CloudCordTweak.dylib"
            if legacy.exists():
                legacy.unlink()
            rain = frameworks / "RainTweak.dylib"
            rain.write_bytes(raw)
            # Preserve Rain's actual hook engine, not our compatibility shim.
            substrate_files = json.loads((args.rain_loader.parent / "CydiaSubstrate.framework.json").read_text())
            for original_path, encoded in substrate_files.items():
                suffix = original_path.split("/CydiaSubstrate.framework/", 1)[1]
                target = frameworks / "CydiaSubstrate.framework" / suffix
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(base64.b64decode(encoded))
            # Keep Rain byte-for-byte intact; the sideload signer signs nested code.
            bootstrap = frameworks / "CloudCordBootstrap.dylib"
            shutil.copy2(args.rain_bootstrap, bootstrap)
            add_load_command(executable, "@executable_path/Frameworks/CloudCordBootstrap.dylib")
            sign_with_entitlements(bootstrap, None, root)
            resources = discord_app / "BunnyResources.bundle"
            resources.mkdir(exist_ok=True)
            shutil.copy2(args.runtime_js, resources / "runtime.js")
            shutil.copy2(args.rain_loader.parent / "payload-base.js", resources / "payload-base.js")
            for filename in ("RAIN-LICENSE", "RAIN-NOTICE.md"):
                shutil.copy2(Path(__file__).parent.parent / "native-ios" / filename, resources / filename)
        else:
            if not args.runtime_deb:
                raise RuntimeError("A runtime package is required")
            dylibs, bundles = extract_deb(args.runtime_deb, root / "runtime")
            if not any(path.name == "CloudCordTweak.dylib" for path in dylibs):
                raise RuntimeError("CloudCordTweak.dylib is missing")
            for dylib in dylibs:
                shutil.copy2(dylib, frameworks / dylib.name)
                add_load_command(executable, f"@executable_path/Frameworks/{dylib.name}")
                sign_with_entitlements(frameworks / dylib.name, None, root)
            for bundle in bundles:
                target = discord_app / bundle.name
                if target.exists():
                    shutil.rmtree(target)
                shutil.copytree(bundle, target)

        # Screen sharing runs in BroadcastUpload.appex. Preserve and re-apply every
        # extension's original capabilities, then sign the containing app last.
        for extension, entitlements in extension_entitlements.items():
            sign_with_entitlements(bundle_executable(extension), entitlements, root)
        sign_with_entitlements(executable, app_entitlements, root)

        args.output.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(args.output, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
            for path in app_root.rglob("*"):
                if path.is_file():
                    archive.write(path, path.relative_to(app_root).as_posix())


if __name__ == "__main__":
    main()
