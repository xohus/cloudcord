import base64
import hashlib
import json
import sys
import zipfile
from pathlib import Path
import importlib.util

spec = importlib.util.spec_from_file_location("branding", Path(__file__).with_name("brand-loader.py"))
branding = importlib.util.module_from_spec(spec)
spec.loader.exec_module(branding)

with zipfile.ZipFile(sys.argv[1]) as archive:
    rain = archive.read("Payload/Discord.app/Frameworks/RainTweak.dylib")
    source = base64.b64decode((Path(__file__).parent.parent / "rain-original/RainTweak.dylib.b64").read_text())
    assert hashlib.sha256(source).hexdigest() == "e43cad3e64c2d518b1744a214d1ecb8fe89342e064976c5eed8e6b6f1d82b825"
    assert rain == branding.brand_loader(source)
    original = json.loads((Path(__file__).parent.parent / "rain-original/CydiaSubstrate.framework.json").read_text())
    for filename, data in original.items():
        assert archive.read(filename) == base64.b64decode(data), filename
    assert "Payload/Discord.app/Frameworks/CloudCordTweak.dylib" not in archive.namelist()
    assert "Payload/Discord.app/Frameworks/CloudCordBootstrap.dylib" in archive.namelist()
print("Packaged injector matches original hooks with only approved CloudCord UI branding")
