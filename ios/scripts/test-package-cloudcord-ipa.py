import importlib.util
import struct
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("packager", Path(__file__).with_name("package-cloudcord-ipa.py"))
packager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packager)


def dylib(name, kind=packager.LC_LOAD_DYLIB):
    value = name.encode() + b"\0"
    size = (24 + len(value) + 7) & ~7
    return struct.pack("<IIIIII", kind, size, 24, 2, 0, 0) + value + bytes(size - 24 - len(value))


class RainReplacementTests(unittest.TestCase):
    def image(self, commands):
        header = struct.pack("<8I", 0xFEEDFACF, 0x100000C, 0, 2, len(commands), sum(map(len, commands)), 0, 0)
        return header + b"".join(commands) + b"SECTION_BYTES_UNCHANGED"

    def test_removes_only_rain_and_preserves_sections(self):
        hermes = dylib("@rpath/hermesvm.framework/hermesvm")
        rain = dylib("@executable_path/Frameworks/RainTweak.dylib")
        substrate = dylib("@rpath/CydiaSubstrate.framework/CydiaSubstrate")
        with tempfile.TemporaryDirectory() as directory:
            file = Path(directory) / "Discord"
            original = self.image([hermes, rain, substrate])
            file.write_bytes(original)
            self.assertEqual(packager.remove_rain_load_commands(file), 1)
            result = file.read_bytes()
            self.assertEqual(len(result), len(original))
            self.assertEqual(result[32:32 + len(hermes + substrate)], hermes + substrate)
            self.assertTrue(result.endswith(b"SECTION_BYTES_UNCHANGED"))
            self.assertEqual(struct.unpack_from("<II", result, 16), (2, len(hermes + substrate)))
            self.assertEqual(packager.remove_rain_load_commands(file), 0)

    def test_clean_ipa_is_unchanged(self):
        with tempfile.TemporaryDirectory() as directory:
            file = Path(directory) / "Discord"
            original = self.image([dylib("@rpath/hermesvm.framework/hermesvm")])
            file.write_bytes(original)
            self.assertEqual(packager.remove_rain_load_commands(file), 0)
            self.assertEqual(file.read_bytes(), original)

    def test_invalid_input_is_not_modified(self):
        with tempfile.TemporaryDirectory() as directory:
            file = Path(directory) / "Discord"
            file.write_bytes(b"not a mach-o")
            with self.assertRaises(RuntimeError):
                packager.remove_rain_load_commands(file)
            self.assertEqual(file.read_bytes(), b"not a mach-o")


if __name__ == "__main__":
    unittest.main()
