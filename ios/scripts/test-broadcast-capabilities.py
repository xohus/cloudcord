import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("broadcast_check", Path(__file__).with_name("verify-broadcast-ipa.py"))
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)


class BroadcastCapabilitiesTest(unittest.TestCase):
    def setUp(self):
        self.host = {"com.apple.security.application-groups": [check.packager.DISCORD_APP_GROUP]}
        self.extension = dict(self.host)
        self.info = {"NSExtension": {"NSExtensionPointIdentifier": "com.apple.broadcast-services-upload"}}

    def test_matching_group(self):
        check.verify_capabilities(self.host, self.extension, self.info)

    def test_missing_host_group(self):
        with self.assertRaises(ValueError):
            check.verify_capabilities({}, self.extension, self.info)

    def test_missing_extension_group(self):
        with self.assertRaises(ValueError):
            check.verify_capabilities(self.host, {}, self.info)

    def test_wrong_extension_kind(self):
        with self.assertRaises(ValueError):
            check.verify_capabilities(self.host, self.extension, {})

    def test_different_teams(self):
        self.host["com.apple.developer.team-identifier"] = "HOST"
        self.extension["com.apple.developer.team-identifier"] = "OTHER"
        with self.assertRaises(ValueError):
            check.verify_capabilities(self.host, self.extension, self.info)


if __name__ == "__main__":
    unittest.main()
