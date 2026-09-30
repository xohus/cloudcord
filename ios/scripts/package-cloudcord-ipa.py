#!/usr/bin/env python3
"""Inject the unsigned CloudCord runtime package into a decrypted Discord IPA."""

import argparse
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
LC_LOAD_WEAK_DYLIB = 0x80000018
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


def remove_rain_load_commands(executable: Path) -> int:
    """Replace the known Rain loader without stacking two runtime injectors.

    Compact only the load-command area; section offsets and all other dylib
    dependencies (including Hermes and Substrate) remain unchanged.
    """
    data = bytearray(executable.read_bytes())
    if len(data) < 32 or struct.unpack_from("<I", data)[0] != 0xFEEDFACF:
        raise RuntimeError("Rain replacement requires a thin 64-bit Mach-O")
    ncmds, size = struct.unpack_from("<II", data, 16)
    end = 32 + size
    if end > len(data):
        raise RuntimeError("Truncated Mach-O load commands")
    commands = []
    cursor = 32
    removed = 0
    for _ in range(ncmds):
        if cursor + 8 > end:
            raise RuntimeError("Truncated Mach-O command header")
        kind, length = struct.unpack_from("<II", data, cursor)
        if length < 8 or length % 8 or cursor + length > end:
            raise RuntimeError("Invalid Mach-O command size")
        command = bytes(data[cursor:cursor + length])
        is_rain = False
        if kind in (LC_LOAD_DYLIB, LC_LOAD_WEAK_DYLIB):
            if length < 24:
                raise RuntimeError("Invalid Mach-O dylib command")
            offset = struct.unpack_from("<I", command, 8)[0]
            if offset < 24 or offset >= length or b"\0" not in command[offset:]:
                raise RuntimeError("Invalid Mach-O dylib name")
            name = command[offset:].split(b"\0", 1)[0].decode("utf-8")
            is_rain = name.rsplit("/", 1)[-1] == "RainTweak.dylib"
        if is_rain:
            removed += 1
        else:
            commands.append(command)
        cursor += length
    if cursor != end:
        raise RuntimeError("Mach-O load command count does not match size")
    if removed:
        packed = b"".join(commands)
        data[32:end] = packed + bytes(size - len(packed))
        struct.pack_into("<II", data, 16, len(commands), len(packed))
        executable.write_bytes(data)
    return removed


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--discord-ipa", type=Path, required=True)
    parser.add_argument("--discord-version", required=True)
    parser.add_argument("--runtime-deb", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--replace-rain-loader", action="store_true",
                        help="Replace RainTweak in a RainTweak-based IPA, preserving Discord resources")
    args = parser.parse_args()

    with tempfile.TemporaryDirectory(prefix="cloudcord-ios-") as temporary:
        root = Path(temporary)
        app_root = root / "app"
        with zipfile.ZipFile(args.discord_ipa) as archive:
            archive.extractall(app_root)
        discord_app = next((app_root / "Payload").glob("*.app"))
        info = plistlib.loads((discord_app / "Info.plist").read_bytes())
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
        rain_loader = discord_app / "Frameworks" / "RainTweak.dylib"
        if rain_loader.exists() and not args.replace_rain_loader:
            raise RuntimeError("RainTweak is already injected; use --replace-rain-loader to avoid two loaders")
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

        dylibs, bundles = extract_deb(args.runtime_deb, root / "runtime")
        if not any(path.name == "CloudCordTweak.dylib" for path in dylibs):
            raise RuntimeError("CloudCordTweak.dylib is missing")
        if args.replace_rain_loader:
            removed = remove_rain_load_commands(executable)
            if rain_loader.exists() and not removed:
                raise RuntimeError("RainTweak exists but no matching load command was found")
            if rain_loader.exists():
                rain_loader.unlink()
        frameworks = discord_app / "Frameworks"
        frameworks.mkdir(exist_ok=True)
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
