"""Inspect Mach-O symbol tables in an IPA without executing its contents."""
import struct
import sys
import zipfile

def symbols(data):
    if data[:4] == b'\xca\xfe\xba\xbe':
        count = struct.unpack_from('>I', data, 4)[0]
        slices = [struct.unpack_from('>IIIII', data, 8 + i * 20) for i in range(count)]
        # The arm64 slice is the device architecture, not arm64e.
        item = next((s for s in slices if s[1] == 0), slices[0])
        data = data[item[2]:item[2]+item[3]]
    if data[:4] != b'\xcf\xfa\xed\xfe':
        return set(), set()
    count = struct.unpack_from('<I', data, 16)[0]
    cursor = 32
    defined, undefined = set(), set()
    for _ in range(count):
        cmd, size = struct.unpack_from('<II', data, cursor)
        if cmd == 2:
            symoff, nsyms, stroff, strsize = struct.unpack_from('<IIII', data, cursor+8)
            for i in range(nsyms):
                index, kind, section, desc, value = struct.unpack_from('<IBBHQ', data, symoff+i*16)
                if not index or kind & 0xe0: continue
                end = data.find(b'\0', stroff+index, stroff+strsize)
                name = data[stroff+index:end].decode('utf8', errors='replace')
                (undefined if kind & 0x0e == 0 else defined).add(name)
        cursor += size
    return defined, undefined

with zipfile.ZipFile(sys.argv[1]) as archive:
    exports = set()
    imports = set()
    for name in archive.namelist():
        if name.endswith('/') or '/PlugIns/' in name: continue
        if name.endswith('.dylib') or name.endswith('/Discord') or '.framework/' in name:
            defined, undefined = symbols(archive.read(name))
            exports.update(defined)
            if name.endswith('/CloudCordTweak.dylib'): imports.update(undefined)
    jsi = sorted(s for s in imports if 'facebook3jsi' in s)
    print('JSI imports:', len(jsi))
    for name in jsi:
        print(('FOUND ' if name in exports else 'MISSING ')+name)
