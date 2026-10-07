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
