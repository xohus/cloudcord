package main

import (
	"embed"
	"errors"
	"fmt"
	"os"
	path "path/filepath"
)

// bundledDesktop contains the runtime produced by the desktop build. Release
// builds add bundled/desktop.asar before compiling the installer. Keeping the
// whole directory embedded lets source checkouts compile even before that
// generated artifact exists.
//
//go:embed bundled/*
var bundledDesktop embed.FS

// replaceRuntimeFile performs a Windows-safe staged replacement. os.Rename
// cannot replace an existing destination on Windows, so keep the working
// runtime as a rollback file until the new one is in place.
func replaceRuntimeFile(temporary, destination string) error {
	backup := destination + ".previous"
	_ = os.Remove(backup)

	hadExisting := ExistsFile(destination)
	if hadExisting {
		if err := os.Rename(destination, backup); err != nil {
			return fmt.Errorf("close Discord completely so CloudCord can update its runtime: %w", err)
		}
	}

	if err := os.Rename(temporary, destination); err != nil {
		if hadExisting {
			_ = os.Rename(backup, destination)
		}
		return err
	}

	if hadExisting {
		_ = os.Remove(backup)
	}
	return nil
}

func installBundledBuild() error {
	data, err := bundledDesktop.ReadFile("bundled/desktop.asar")
	if err != nil {
		return errors.New("this development build does not include the CloudCord desktop runtime")
	}

	if err = os.MkdirAll(path.Dir(CloudCordDirectory), 0755); err != nil {
		return err
	}

	temporary := CloudCordDirectory + ".download"
	if err = os.WriteFile(temporary, data, 0644); err != nil {
		return err
	}
	if err = replaceRuntimeFile(temporary, CloudCordDirectory); err != nil {
		_ = os.Remove(temporary)
		return err
	}

	_ = FixOwnership(CloudCordDirectory)
	InstalledHash = "bundled"
	if LatestHash == "Unknown" {
		LatestHash = "bundled"
	}
	return nil
}
