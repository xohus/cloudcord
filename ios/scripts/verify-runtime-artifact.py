import hashlib
import json
import os
import sys
from pathlib import Path


def verify_runtime(directory: Path, expected_source: str = "") -> str:
    manifest = json.loads((directory / "runtime-manifest.json").read_text(encoding="utf-8"))
    bundle = (directory / "cc.js").read_bytes()
    if manifest.get("schema") != 1 or not bundle:
        raise ValueError("Invalid runtime manifest or empty bundle")
    if expected_source and manifest.get("version") != expected_source:
        raise ValueError("Runtime artifact does not match the source commit")
    if len(bundle) != manifest.get("size") or hashlib.sha256(bundle).hexdigest() != manifest.get("sha256"):
        raise ValueError("Runtime bundle does not match its manifest")
    return manifest["version"]


if __name__ == "__main__":
    version = verify_runtime(Path(sys.argv[1]), os.getenv("EXPECTED_RUNTIME_SOURCE", ""))
    print(f"Verified CloudCord runtime {version}")
