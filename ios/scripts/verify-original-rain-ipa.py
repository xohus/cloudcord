import base64
import hashlib
import json
import sys
import zipfile
from pathlib import Path

with zipfile.ZipFile(sys.argv[1]) as archive:
    rain = archive.read("Payload/Discord.app/Frameworks/RainTweak.dylib")
    assert hashlib.sha256(rain).hexdigest() == "e43cad3e64c2d518b1744a214d1ecb8fe89342e064976c5eed8e6b6f1d82b825"
    original = json.loads((Path(__file__).parent.parent / "rain-original/CydiaSubstrate.framework.json").read_text())
    for filename, data in original.items():
        assert archive.read(filename) == base64.b64decode(data), filename
    assert "Payload/Discord.app/Frameworks/CloudCordTweak.dylib" not in archive.namelist()
    assert "Payload/Discord.app/Frameworks/CloudCordBootstrap.dylib" in archive.namelist()
print("Packaged Rain injector and CydiaSubstrate exactly match supplied IPA")
