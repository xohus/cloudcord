#!/usr/bin/env python3
"""Inject the unsigned CloudCord runtime package into a decrypted Discord IPA."""

import argparse
import io
import lzma
import plistlib
import shutil
import struct
import tarfile
import tempfile
import zipfile
from pathlib import Path


LC_SEGMENT_64 = 0x19
LC_LOAD_DYLIB = 0xC


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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--discord-ipa", type=Path, required=True)
    parser.add_argument("--runtime-deb", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    with tempfile.TemporaryDirectory(prefix="cloudcord-ios-") as temporary:
        root = Path(temporary)
        app_root = root / "app"
        with zipfile.ZipFile(args.discord_ipa) as archive:
            archive.extractall(app_root)
        discord_app = next((app_root / "Payload").glob("*.app"))
        info = plistlib.loads((discord_app / "Info.plist").read_bytes())
        if info.get("CFBundleShortVersionString") != "341.0":
            raise RuntimeError(f"Expected Discord 341.0, got {info.get('CFBundleShortVersionString')}")

        dylibs, bundles = extract_deb(args.runtime_deb, root / "runtime")
        if not any(path.name == "CloudCordTweak.dylib" for path in dylibs):
            raise RuntimeError("CloudCordTweak.dylib is missing")
        frameworks = discord_app / "Frameworks"
        frameworks.mkdir(exist_ok=True)
        executable = discord_app / info["CFBundleExecutable"]
        for dylib in dylibs:
            shutil.copy2(dylib, frameworks / dylib.name)
            add_load_command(executable, f"@executable_path/Frameworks/{dylib.name}")
        for bundle in bundles:
            target = discord_app / bundle.name
            if target.exists():
                shutil.rmtree(target)
            shutil.copytree(bundle, target)

        args.output.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(args.output, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
            for path in app_root.rglob("*"):
                if path.is_file():
                    archive.write(path, path.relative_to(app_root).as_posix())


if __name__ == "__main__":
    main()
