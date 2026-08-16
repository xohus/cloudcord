# Generated desktop runtime

Release builds place `desktop.asar` in this directory immediately before the
Go installer is compiled. The runtime is embedded in `cloudcord.exe` so a
fresh installer works even when a GitHub release asset is unavailable.
