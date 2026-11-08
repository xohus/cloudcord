"""Replace user-visible KettuXposed branding in the bundled module."""
import sys
from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    source = path.read_text(encoding="utf-8")
    if source.count(old) != 1:
        raise SystemExit(f"Unexpected Xposed module branding in {path}")
    path.write_text(source.replace(old, new), encoding="utf-8")


if __name__ == "__main__":
    root = Path(sys.argv[1])
    replace_once(
        root / "app/src/main/kotlin/io/github/revenge/xposed/Constants.kt",
        'const val LOADER_NAME = "KettuXposed"',
        'const val LOADER_NAME = "CloudCord"',
    )
    replace_once(
        root / "app/src/main/kotlin/io/github/revenge/xposed/Constants.kt",
        'const val USER_AGENT = "KettuXposed"',
        'const val USER_AGENT = "CloudCord"',
    )
    replace_once(
        root / "app/src/main/res/values/strings.xml",
        '<string name="app_name">KettuXposed</string>',
        '<string name="app_name">CloudCord</string>',
    )
    replace_once(
        root / "app/src/main/AndroidManifest.xml",
        'android:value="an Xposed module to inject Kettu into discord"',
        'android:value="An Xposed module to inject CloudCord into Discord"',
    )
    replace_once(
        root / "app/src/main/kotlin/io/github/revenge/xposed/modules/LogBoxModule.kt",
        'text = "KettuXposed Recovery"',
        'text = "CloudCord Recovery"',
    )
