"""Reject a Manager APK that mixes native and Java loader generations."""
from pathlib import Path
import hashlib
import io
import sys
import zipfile

with zipfile.ZipFile(Path(__file__).parent / "app/libs/lspatch.aar") as aar:
    engine_bytes = aar.read("classes.jar")
with zipfile.ZipFile(io.BytesIO(engine_bytes)) as engine, zipfile.ZipFile(sys.argv[1]) as manager:
    expected = [name for name in engine.namelist() if name.startswith("assets/lspatch/") and
                (name.endswith(".dex") or name.endswith(".so"))]
    if len(expected) != 6:
        raise SystemExit("Unexpected pinned LSPatch asset set")
    for name in expected:
        if manager.namelist().count(name) != 1:
            raise SystemExit(f"Missing or duplicate loader asset: {name}")
        if hashlib.sha256(manager.read(name)).digest() != hashlib.sha256(engine.read(name)).digest():
            raise SystemExit(f"Mismatched loader asset: {name}")
print("Verified matching loader DEX and native libraries for all four ABIs")
