#!/bin/sh
set -e

if [ "$(id -u)" -eq 0 ]; then
    echo "Run me as normal user, not root!"
    exit 1
fi

if grep -q "CHROMEOS_RELEASE_NAME" /etc/lsb-release 2>/dev/null; then
	echo "ChromeOS is not supported! Use the CloudCord browser extension instead: https://getcloudcord.com/download"
	exit 1
fi

case "$(uname -m)" in
	x86_64|amd64) asset="CloudCordSetupCli-Linux" ;;
	aarch64|arm64) asset="CloudCordSetupCli-Linux-aarch64" ;;
	*) echo "Unsupported CPU: $(uname -m). CloudCord's Linux installer supports x86_64 and aarch64."; exit 1 ;;
esac

outfile=$(mktemp --tmpdir="$HOME")
trap 'rm -f "$outfile"' EXIT

echo "Downloading CloudCord Installer..."

set -- "XDG_CONFIG_HOME=$XDG_CONFIG_HOME"

curl -sS "https://github.com/cloudcord-mod/hub/releases/download/new_beta_t_desktop/$asset" \
  --output "$outfile" \
  --location \
  --fail

chmod +x "$outfile"

if command -v sudo >/dev/null; then
  echo "Running with sudo"
  sudo env "$@" "$outfile"
elif command -v doas >/dev/null; then
  echo "Running with doas"
  doas env "$@" "$outfile"
elif command -v run0 >/dev/null; then
  echo "Running with run0"
  run0 env "$@" "$outfile"
elif command -v pkexec >/dev/null; then
  echo "Running with pkexec"
  pkexec env "$@" "SUDO_USER=$(whoami)" "$outfile"
else
  echo "Neither sudo nor doas were found. Please install either of them to proceed."
  exit 1
fi
