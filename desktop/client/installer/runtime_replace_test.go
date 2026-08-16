package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestReplaceRuntimeFileOverExistingDestination(t *testing.T) {
	dir := t.TempDir()
	destination := filepath.Join(dir, "cloudcord.asar")
	temporary := destination + ".download"

	if err := os.WriteFile(destination, []byte("old-runtime"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(temporary, []byte("new-runtime"), 0644); err != nil {
		t.Fatal(err)
	}

	if err := replaceRuntimeFile(temporary, destination); err != nil {
		t.Fatalf("replaceRuntimeFile failed: %v", err)
	}

	got, err := os.ReadFile(destination)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != "new-runtime" {
		t.Fatalf("destination contains %q", got)
	}
	if ExistsFile(destination + ".previous") {
		t.Fatal("rollback file was not removed")
	}
}
