package main

import (
	"embed"
	"errors"
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
	if err = os.Rename(temporary, CloudCordDirectory); err != nil {
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
