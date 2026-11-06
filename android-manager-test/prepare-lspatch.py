"""Use the pinned maintained LSPatch engine; retain the AAR packaging shell."""
from pathlib import Path
import hashlib
import io
import urllib.request
import zipfile

url = "https://github.com/JingMatrix/LSPatch/releases/download/v1.2/lspatch-v1.2-487-release.jar"
digest = "d238fdc414d121b7fa454d8b4ccf420df3a8c97d563761861ff92bd9c5da2165"
with urllib.request.urlopen(url, timeout=120) as response:
    engine = response.read()
if hashlib.sha256(engine).hexdigest() != digest:
    raise SystemExit("LSPatch engine hash mismatch")
target = Path(__file__).parent / "app/libs/lspatch.aar"
with zipfile.ZipFile(target) as archive:
    manifest = archive.read("AndroidManifest.xml")
temporary = target.with_suffix(".prepared.aar")
with zipfile.ZipFile(temporary, "w", zipfile.ZIP_DEFLATED) as archive:
    archive.writestr("AndroidManifest.xml", manifest)
    archive.writestr("classes.jar", engine)
temporary.replace(target)
# Android assets shadow resources bundled in the dependency JAR. Keep the
# native engine and Java loader from the same release; mixing them boots
# Discord without any working hooks (missing nativebridge classes).
assets = Path(__file__).parent / "app/src/main"
with zipfile.ZipFile(io.BytesIO(engine)) as archive:
    for entry in archive.infolist():
        if not entry.is_dir() and entry.filename.startswith("assets/lspatch/so/") and entry.filename.endswith(".so"):
            destination = assets / entry.filename
            if not destination.resolve().is_relative_to((assets / "assets/lspatch").resolve()):
                raise SystemExit("Invalid LSPatch asset path")
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(archive.read(entry))
print("Prepared JingMatrix LSPatch v1.2 (487), SHA-256 verified")
