# CloudCord Manager Test

Modified by CloudCord on October 16, 2026 from Raincord rainManager
commit 69edb0df94cb84b261b6c49bba6b389b426c16b2, itself based on Aliucord Manager.
Original source: https://codeberg.org/raincord/rainManager

This directory retains its original OSL-3.0 LICENSE and upstream notices.
The parent repository's proprietary license does not replace this directory's license.
This derivative Manager is distributed under OSL-3.0 with source available here.
It is not endorsed by Raincord or Aliucord.

Changes: separate test Manager/client IDs, CloudCord branding, bundled CloudCord
Xposed module, latest stable Discord selection, disabled upstream Manager updates
and remote control data, and failure on missing LSPatch outputs.

October 17 repair: validate HTTP status and complete download sizes, reject bad
cached Discord APKs, retry failed transfers at most twice, preserve cancellation,
check the final file move, and show the download error instead of "Unknown".

Experimental: do not uninstall an existing Manager or Discord. Both test packages
use separate IDs. Not a production update. Compatibility is unverified. Record
Android version, device, target Discord version, and export the installation log.
Do not disable Play Protect to force installation. The injected CloudCord module
is a separate artifact; this Manager's license does not relicense that module.
