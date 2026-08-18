/*
 * SPDX-License-Identifier: GPL-3.0
 * Vencord Installer, a cross platform gui/cli app for installing Vencord
 * Copyright (c) 2023 Vendicated and Vencord contributors
 */

package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	path "path/filepath"
	"regexp"
	"strconv"
	"strings"
)

type GithubRelease struct {
	Name    string `json:"name"`
	TagName string `json:"tag_name"`
	Assets  []struct {
		Name        string `json:"name"`
		DownloadURL string `json:"browser_download_url"`
	} `json:"assets"`
}

var ReleaseData GithubRelease
var GithubError error
var GithubDoneChan chan bool

var InstalledHash = "None"
var LatestHash = "Unknown"
var IsDevInstall bool

func GetGithubRelease(url, fallbackUrl string) (*GithubRelease, error) {
	Log.Debug("Fetching", url)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		Log.Error("Failed to create Request", err)
		return nil, err
	}

	req.Header.Set("User-Agent", UserAgent)

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		Log.Error("Failed to send Request", err)
		return nil, err
	}

	defer res.Body.Close()

	if res.StatusCode >= 300 {
		isRateLimitedOrBlocked := res.StatusCode == 401 || res.StatusCode == 403 || res.StatusCode == 429
		triedFallback := url == fallbackUrl

		if isRateLimitedOrBlocked && !triedFallback {
			Log.Error(fmt.Sprintf("Failed to fetch %s (status code %d). Trying fallback url %s", url, res.StatusCode, fallbackUrl))
			return GetGithubRelease(fallbackUrl, fallbackUrl)
		}

		err = errors.New(res.Status)
		Log.Error(url, "returned Non-OK status", GithubError)
		return nil, err
	}

	var data GithubRelease

	if err = json.NewDecoder(res.Body).Decode(&data); err != nil {
		Log.Error("Failed to decode GitHub JSON Response", err)
		return nil, err
	}

	return &data, nil
}

func InitGithubDownloader() {
	GithubDoneChan = make(chan bool, 1)

	IsDevInstall = os.Getenv("CLOUDCORD_DEV_INSTALL") == "1"
	Log.Debug("Is Dev Install: ", IsDevInstall)
	if IsDevInstall {
		GithubDoneChan <- true
		return
	}

	go func() {
		// Make sure UI updates once the request either finished or failed
		defer func() {
			GithubDoneChan <- GithubError == nil
		}()

		data, err := GetGithubRelease(ReleaseUrl, ReleaseUrlFallback)
		if err != nil {
			GithubError = err
			return
		}

		ReleaseData = *data

		i := strings.LastIndex(data.Name, " ") + 1
		LatestHash = data.Name[i:]
		Log.Debug("Finished fetching GitHub Data")
		Log.Debug("Latest hash is", LatestHash, "Local Install is", Ternary(LatestHash == InstalledHash, "up to date!", "outdated!"))
	}()

	// either .asar file or directory with main.js file (in DEV)
	CloudCordFile := CloudCordDirectory

	stat, err := os.Stat(CloudCordFile)
	if err != nil {
		return
	}

	// dev
	if stat.IsDir() {
		CloudCordFile = path.Join(CloudCordFile, "main.js")
	}

	// Check hash of installed version if exists
	b, err := os.ReadFile(CloudCordFile)
	if err != nil {
		return
	}

	Log.Debug("Found existing CloudCord Install. Checking for hash...")

	re := regexp.MustCompile(`// CloudCord (\w+)`)
	match := re.FindSubmatch(b)
	if match != nil {
		InstalledHash = string(match[1])
		Log.Debug("Existing hash is", InstalledHash)

	} else {
		Log.Debug("Didn't find hash")

	}
}

func installLatestBuilds() (retErr error) {
	Log.Debug("Installing latest builds...")

	if IsDevInstall {
		Log.Debug("Skipping due to dev install")
		return
	}

	if len(ReleaseData.Assets) == 0 {
		data, err := GetGithubRelease(ReleaseUrl, ReleaseUrlFallback)
		if err == nil && data != nil {
			ReleaseData = *data
		}
	}

	downloadUrl := ""
	for _, ass := range ReleaseData.Assets {
		if IsTestBuild {
			if ass.Name == "desktop-test.asar" || ass.Name == "cloudcord-test.asar" || ass.Name == "desktop.asar" {
				downloadUrl = ass.DownloadURL
				break
			}
		} else {
			if ass.Name == "desktop.asar" || ass.Name == "cloudcord.asar" || ass.Name == "runtime" {
				downloadUrl = ass.DownloadURL
				break
			}
		}
	}

	if downloadUrl == "" {
		if IsTestBuild {
			downloadUrl = "https://github.com/xohus/cloudcord/releases/download/new_beta_test_desktop/desktop-test.asar"
		} else {
			downloadUrl = "https://github.com/xohus/cloudcord/releases/download/new_beta_t_desktop/desktop.asar"
		}
	}

	Log.Debug("Downloading asar from", downloadUrl)

	req, err := http.NewRequest("GET", downloadUrl, nil)
	if err != nil {
		Log.Error("Failed to create request:", err)
		return err
	}
	req.Header.Set("User-Agent", UserAgent)

	res, err := http.DefaultClient.Do(req)
	if err == nil && res.StatusCode >= 300 {
		err = errors.New(res.Status)
	}
	if err != nil {
		Log.Error("Failed to download desktop.asar:", err)
		return err
	}
	defer res.Body.Close()

	out, err := os.OpenFile(CloudCordDirectory, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0644)
	if err != nil {
		Log.Error("Failed to create", CloudCordDirectory+":", err)
		return err
	}
	defer out.Close()

	read, err := io.Copy(out, res.Body)
	if err != nil {
		Log.Error("Failed to download to", CloudCordDirectory+":", err)
		return err
	}
	contentLength := res.Header.Get("Content-Length")
	if contentLength != "" {
		expected := strconv.FormatInt(read, 10)
		if expected != contentLength {
			err = errors.New("Unexpected end of input. Content-Length was " + contentLength + ", but I only read " + expected)
			Log.Error(err.Error())
			return err
		}
	}

	_ = FixOwnership(CloudCordDirectory)

	InstalledHash = LatestHash
	return nil
}

