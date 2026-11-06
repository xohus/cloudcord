"""Use the pinned maintained LSPatch engine; retain the AAR packaging shell."""
from pathlib import Path
import hashlib
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
print("Prepared JingMatrix LSPatch v1.2 (487), SHA-256 verified")
