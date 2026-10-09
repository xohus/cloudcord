"""Rebrand known UI strings without shifting Mach-O offsets or touching hooks."""


def brand_loader(data: bytes) -> bytes:
    for old, new in (
        (b"\0RainTweak v%@ Recovery Menu\0", b"\0CloudCord v%@ Recovery Menu\0"),
        (b"\0RainTweak\0", b"\0CloudCord\0"),
        (b"\0https://codeberg.org/raincord/RainTweak/issues/new?title=%@&body=%@\0", b"\0https://github.com/xohus/cloudcord/issues/new?title=%@&body=%@\0"),
        (b"\0https://codeberg.org/raincord/rain/releases/download/latest/rain.98.hbc\0", b"\0https://getcloudcord.com/api/proxy/raw/dist/cc.js\0"),
    ):
        if len(new) > len(old) or data.count(old) != 1:
            raise RuntimeError("Loader branding layout changed; refusing an unsafe patch")
        data = data.replace(old, new + b"\0" * (len(old) - len(new)))
    return data
