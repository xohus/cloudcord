package main

import (
	"bytes"
	"os"
	"path/filepath"
	"testing"
)

func TestParseMacDiscordBundle(t *testing.T) {
	for _, patched := range []bool{false, true} {
		t.Run(map[bool]string{false: "original", true: "patched"}[patched], func(t *testing.T) {
			bundle := filepath.Join(t.TempDir(), "Discord.app")
			resources := filepath.Join(bundle, "Contents", "Resources")
			if err := os.MkdirAll(resources, 0755); err != nil {
				t.Fatal(err)
			}
			name := "app.asar"
			if patched {
				name = "_app.asar"
			}
			if err := os.WriteFile(filepath.Join(resources, name), []byte("fixture"), 0644); err != nil {
				t.Fatal(err)
			}
			install := ParseDiscord(bundle, "stable")
			if install == nil || install.appPath != filepath.Join(resources, "app") || install.isPatched != patched {
				t.Fatalf("incorrect bundle discovery: %#v", install)
			}
		})
	}
}

func TestParseMacRejectsIncompleteBundle(t *testing.T) {
	if install := ParseDiscord(t.TempDir(), "stable"); install != nil {
		t.Fatalf("accepted an incomplete bundle: %#v", install)
	}
}

func TestMacInstallAndRestoreBundle(t *testing.T) {
    bundle := filepath.Join(t.TempDir(), "Discord With Spaces.app")
    resources := filepath.Join(bundle, "Contents", "Resources")
    if err := os.MkdirAll(resources, 0755); err != nil { t.Fatal(err) }
    original := bytes.Repeat([]byte("original Discord archive"), 10000)
    archive := filepath.Join(resources, "app.asar")
    if err := os.WriteFile(archive, original, 0644); err != nil { t.Fatal(err) }
    previousPath, previousInstalled, previousLatest := CloudCordDirectory, InstalledHash, LatestHash
    t.Cleanup(func() { CloudCordDirectory, InstalledHash, LatestHash = previousPath, previousInstalled, previousLatest })
    CloudCordDirectory = filepath.Join(t.TempDir(), "CloudCord Data", "cloudcord.asar")
    InstalledHash, LatestHash = "fixture", "fixture"
    install := ParseDiscord(bundle, "stable")
    if install == nil { t.Fatal("bundle was not discovered") }
    for attempt := 0; attempt < 2; attempt++ {
        if err := install.patch(); err != nil { t.Fatal(err) }
        backup, err := os.ReadFile(filepath.Join(resources, "_app.asar"))
        if err != nil || !bytes.Equal(backup, original) { t.Fatal("installation did not preserve original Discord archive") }
        loader, err := os.ReadFile(archive)
        if err != nil || !bytes.Contains(loader, []byte("cloudcord.asar")) { t.Fatal("runtime loader was not installed") }
    }
    if err := install.unpatch(); err != nil { t.Fatal(err) }
    restored, err := os.ReadFile(archive)
    if err != nil || !bytes.Equal(restored, original) { t.Fatal("uninstall did not restore the original archive") }
    for _, name := range []string{"_app.asar", "app.asar.tmp"} {
        if _, err := os.Stat(filepath.Join(resources, name)); !os.IsNotExist(err) { t.Fatalf("left unexpected backup %s", name) }
    }
}

func TestBundledMacRuntimeReplacement(t *testing.T) {
	dir := t.TempDir()
	previousPath, previousInstalled, previousLatest := CloudCordDirectory, InstalledHash, LatestHash
	t.Cleanup(func() {
		CloudCordDirectory, InstalledHash, LatestHash = previousPath, previousInstalled, previousLatest
	})
	CloudCordDirectory = filepath.Join(dir, "installed.asar")
	LatestHash = "Bundled"
	old, replacement := []byte("working previous runtime"), []byte("new bundled runtime")
	if err := os.WriteFile(CloudCordDirectory, old, 0644); err != nil {
		t.Fatal(err)
	}
	source := filepath.Join(dir, "preview.asar")
	if err := os.WriteFile(source, nil, 0644); err != nil {
		t.Fatal(err)
	}
	if err := installBundledRuntime(source); err == nil {
		t.Fatal("accepted an empty bundled runtime")
	}
	data, err := os.ReadFile(CloudCordDirectory)
	if err != nil || !bytes.Equal(data, old) {
		t.Fatal("failed replacement damaged the existing runtime")
	}
	if err := os.WriteFile(source, replacement, 0644); err != nil {
		t.Fatal(err)
	}
	if err := installBundledRuntime(source); err != nil {
		t.Fatal(err)
	}
	data, err = os.ReadFile(CloudCordDirectory)
	if err != nil || !bytes.Equal(data, replacement) || InstalledHash != "Bundled" {
		t.Fatal("bundled runtime was not installed")
	}
}
