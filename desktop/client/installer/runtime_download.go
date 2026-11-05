package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

var releaseClient = &http.Client{Timeout: 30 * time.Second}
var runtimeClient = &http.Client{Timeout: 10 * time.Minute}

// Keep the currently installed runtime intact until the transfer completes.
// A sibling temporary file also keeps the final rename on the same volume.
func downloadRuntimeFile(client *http.Client, req *http.Request, destination string) error {
	res, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("download failed: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("download failed: %s", res.Status)
	}
	const maxSize = 128 << 20
	if res.ContentLength > maxSize {
		return fmt.Errorf("runtime download exceeds 128 MB")
	}
	out, err := os.CreateTemp(filepath.Dir(destination), ".cloudcord-download-*")
	if err != nil {
		return err
	}
	temporary := out.Name()
	defer os.Remove(temporary)
	defer out.Close()
	read, err := io.Copy(out, io.LimitReader(res.Body, maxSize+1))
	if err != nil {
		return fmt.Errorf("runtime download interrupted: %w", err)
	}
	if read == 0 || read > maxSize || (res.ContentLength >= 0 && read != res.ContentLength) {
		return fmt.Errorf("incomplete runtime download: received %d bytes, expected %d", read, res.ContentLength)
	}
	if err = out.Chmod(0644); err != nil {
		return err
	}
	if err = out.Sync(); err != nil {
		return err
	}
	if err = out.Close(); err != nil {
		return err
	}
	if err = os.Rename(temporary, destination); err != nil {
		return fmt.Errorf("could not replace runtime; existing installation preserved: %w", err)
	}
	return nil
}
