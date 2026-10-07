package main

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestBundledRuntimeKeepsWorkingCopyOnFailure(t *testing.T) {
	dir := t.TempDir()
	previousPath, previousInstalled, previousLatest := CloudCordDirectory, InstalledHash, LatestHash
	t.Cleanup(func() {
		CloudCordDirectory, InstalledHash, LatestHash = previousPath, previousInstalled, previousLatest
	})
	CloudCordDirectory = filepath.Join(dir, "installed.asar")
	LatestHash = "Bundled"
	old := []byte("previous working runtime")
	if err := os.WriteFile(CloudCordDirectory, old, 0644); err != nil {
		t.Fatal(err)
	}
	source := filepath.Join(dir, "preview.asar")
	if err := os.WriteFile(source, nil, 0644); err != nil {
		t.Fatal(err)
	}
	if err := installBundledRuntime(source); err == nil {
		t.Fatal("accepted an empty runtime")
	}
	data, err := os.ReadFile(CloudCordDirectory)
	if err != nil || !bytes.Equal(data, old) {
		t.Fatal("failed installation damaged the working copy")
	}
	replacement := []byte("complete replacement")
	if err := os.WriteFile(source, replacement, 0644); err != nil {
		t.Fatal(err)
	}
	if err := installBundledRuntime(source); err != nil {
		t.Fatal(err)
	}
	data, err = os.ReadFile(CloudCordDirectory)
	if err != nil || !bytes.Equal(data, replacement) {
		t.Fatal("replacement runtime was not installed")
	}
	leftovers, err := filepath.Glob(filepath.Join(dir, "cloudcord-bundled-*.asar"))
	if err != nil || len(leftovers) != 0 {
		t.Fatal("temporary runtime files were not cleaned up")
	}
}

func TestReleaseWithoutFallbackReturnsOriginalError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	defer server.Close()
	_, err := GetGithubRelease(server.URL, "")
	if err == nil || err.Error() != "403 Forbidden" {
		t.Fatalf("expected original HTTP status, got %v", err)
	}
}

func TestReleaseUsesConfiguredFallback(t *testing.T) {
	primary := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer primary.Close()
	fallback := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"name":"CloudCord Desktop test","tag_name":"new_beta_t_desktop","assets":[]}`))
	}))
	defer fallback.Close()
	release, err := GetGithubRelease(primary.URL, fallback.URL)
	if err != nil || release == nil || release.TagName != "new_beta_t_desktop" {
		t.Fatalf("fallback failed: release=%#v error=%v", release, err)
	}
}
