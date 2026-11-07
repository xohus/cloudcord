const base64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function validateCxWallpaper(uri: string) {
    const match = /^data:image\/(png|jpeg);base64,(iVBORw0KGgo[A-Za-z0-9+/]+={0,2}|\/9j\/[A-Za-z0-9+/]+={0,2})$/.exec(uri);
    if (!match || match[2].length % 4 !== 0 || (match[1] === "png") !== match[2].startsWith("iVBORw0KGgo"))
        throw new Error("Wallpaper must be an embedded PNG or JPEG data URL");

    const [, type, data] = match;
    const length = data.length / 4 * 3 - (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0);
    function byte(offset: number) {
        const group = Math.floor(offset / 3) * 4;
        const index = offset % 3;
        const high = base64.indexOf(data[group + index]);
        const low = base64.indexOf(data[group + index + 1]);
        return ((high << (2 * (index + 1))) | (low >>> (4 - 2 * index))) & 255;
    }
    function read(offset: number, count: number) {
        let value = 0;
        for (let i = 0; i < count; i++) value = value * 256 + byte(offset + i);
        return value;
    }
    let width: number | undefined;
    let height: number | undefined;
    if (type === "png") {
        if (length >= 33 && read(8, 4) === 13 && read(12, 4) === 0x49484452) {
            width = read(16, 4);
            height = read(20, 4);
        }
    } else {
        // Read JPEG segment headers up to the first frame or scan.
        for (let offset = 2; offset + 3 < length;) {
            if (byte(offset++) !== 0xff) break;
            while (offset < length && byte(offset) === 0xff) offset++;
            if (offset + 2 >= length) break;
            const marker = byte(offset++);
            if (marker === 0xda || marker === 0xd9) break;
            const size = read(offset, 2);
            if (size < 2 || offset + size > length) break;
            if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
                if (size >= 8) {
                    height = read(offset + 3, 2);
                    width = read(offset + 5, 2);
                }
                break;
            }
            offset += size;
        }
    }
    if (!width || !height) throw new Error("Wallpaper is missing valid image dimensions");
    if (width > 4096 || height > 4096 || width * height > 8_000_000)
        throw new Error("Wallpaper must fit within 4096 pixels per side and 8 million pixels total");
}
