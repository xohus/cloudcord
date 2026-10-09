"""Rebrand known UI strings without shifting Mach-O offsets or touching hooks."""


def brand_loader(data: bytes) -> bytes:
    for old, new in (
        (b"\0RainTweak v%@ Recovery Menu\0", b"\0CloudCord v%@ Recovery Menu\0"),
        (b"\0RainTweak\0", b"\0CloudCord\0"),
    ):
        if len(old) != len(new) or data.count(old) != 1:
            raise RuntimeError("Loader branding layout changed; refusing an unsafe patch")
        data = data.replace(old, new)
    return data
