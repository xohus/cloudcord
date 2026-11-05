//go:build !cli

/*
 * CloudCord Desktop Installer
 * Copyright (c) 2026 Xohus and CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

package main

import (
	"bytes"
	_ "embed"
	"errors"
	"image"
	"image/color"
	_ "image/png"
	"os"
	"runtime"
	"strconv"
	"strings"

	imgui "github.com/AllenDang/cimgui-go/imgui"
	g "github.com/AllenDang/giu"
)

var (
	discords        []any
	radioIdx        int
	customChoiceIdx int

	customDir              string
	autoCompleteDir        string
	autoCompleteFile       string
	autoCompleteCandidates []string
	autoCompleteIdx        int
	lastAutoComplete       string
	didAutoComplete        bool

	noticeTitle   string
	noticeMessage string

	acceptedOpenAsar   bool
	showedUpdatePrompt bool

	cachedCandidates []any
	lastCustomDir    string

	win *g.MasterWindow

	patchSuccessTitle = "CloudCord Desktop installed"
	activeOperation *installerOperation
	finishOperation func(error)
	operationStatus string
	releaseReady bool
	releaseReadySignal = make(chan bool, 1)
)

//go:embed winres/icon.png
var iconBytes []byte

func init() {
	LogLevel = LevelDebug
}

func main() {
	hideConsole()
	var fallbackScale float32 = 1.0
	if scaleStr := os.Getenv("EQUILOTL_SCALE"); scaleStr != "" {
		if s, err := strconv.ParseFloat(scaleStr, 32); err == nil && s > 0 && s < 99 {
			fallbackScale = float32(s)
		}
	}

	imgui.SetAssertHandler(func(expression string, file string, line int) {
		if strings.Contains(expression, "DpiScale") {
			io := imgui.CurrentPlatformIO()
			monitors := io.Monitors().Slice()
			for _, mon := range monitors {
				scale := mon.DpiScale()
				if scale <= 0 || scale >= 99 {
					mon.SetDpiScale(fallbackScale)
				}
			}
			return
		}
		panic(imgui.AssertionError{
			Expression: expression,
			File:       file,
			Line:       line,
		})
	})

	InitGithubDownloader()
	discords = FindDiscords()
	customChoiceIdx = len(discords)

	var linuxFlags g.MasterWindowFlags = 0
	if runtime.GOOS == "linux" {
		os.Setenv("GDK_SCALE", "1")
		os.Setenv("GDK_DPI_SCALE", "1")
	}

	win = g.NewMasterWindow("CloudCord Desktop", 760, 480, linuxFlags)
	win.SetCloseCallback(func() bool { return activeOperation == nil })

	go func() {
		<-GithubDoneChan
		releaseReadySignal <- true
		g.Update()
	}()

	go func() {
		<-SelfUpdateCheckDoneChan
		g.Update()
	}()

	icon, _, err := image.Decode(bytes.NewReader(iconBytes))
	if err == nil {
		win.SetIcon(icon)
	}
	win.Run(loop)
}

type CondWidget struct {
	predicate  bool
	ifWidget   func() g.Widget
	elseWidget func() g.Widget
}

func (w *CondWidget) Build() {
	if w.predicate {
		w.ifWidget().Build()
	} else if w.elseWidget != nil {
		w.elseWidget().Build()
	}
}

func getChosenInstall() *DiscordInstall {
	var choice *DiscordInstall
	if radioIdx == customChoiceIdx {
		choice = ParseDiscord(customDir, "")
		if choice == nil {
			choice = ParseDiscordNew(customDir, "", strings.Contains(customDir, "com.discordapp"))
		}
		if choice == nil {
			ShowInstallerNotice("Discord folder not found", "Choose the folder containing your Discord installation, then try again. CloudCord has not changed any files.")
		}
	} else {
		if radioIdx >= 0 && radioIdx < len(discords) {
			choice = discords[radioIdx].(*DiscordInstall)
		}
	}
	return choice
}

func installationPicker(width float32) g.Widget {
	items := make([]string, 0, len(discords)+1)
	for _, candidate := range discords {
		install := candidate.(*DiscordInstall)
		items = append(items, strings.Title(install.branch)+" Discord — "+install.path)
	}
	items = append(items, "Choose a custom folder")
	selected := int32(radioIdx)
	if radioIdx < 0 || radioIdx >= len(items) {
		radioIdx = len(items) - 1
		selected = int32(radioIdx)
	}
	return g.Column(
		g.Combo("##discord-installation", items[radioIdx], items, &selected).
			Size(width).
			OnChange(func() { radioIdx = int(selected) }),
		&CondWidget{
			predicate: radioIdx == customChoiceIdx,
			ifWidget: func() g.Widget {
				return g.InputText(&customDir).Hint("Path to your Discord folder").Size(width)
			},
		},
	)
}

func InstallLatestBuilds() (err error) {
	if IsDevInstall {
		return
	}

	return installLatestBuilds()
}

func handlePatch() {
	if activeOperation != nil || !releaseReady {
		return
	}
	choice := getChosenInstall()
	if choice == nil || CheckScuffedInstall() {
		return
	}
	copy := *choice
	noticeTitle, noticeMessage = "", ""
	operationStatus = "Installing CloudCord. Downloading may take a few minutes…"
	finishOperation = func(err error) {
		*choice = copy
		if err != nil {
			handleErr(choice, err, "install")
		} else {
			ShowInstallerNotice(patchSuccessTitle, "Open Discord, then go to Settings → CloudCord. Your plugins, themes and settings have been kept.")
		}
	}
	activeOperation = startInstallerOperation(copy.patch, func() { g.Update() })
}

func handleUnpatch() {
	if activeOperation != nil {
		return
	}
	choice := getChosenInstall()
	if choice == nil {
		return
	}
	copy := *choice
	noticeTitle, noticeMessage = "", ""
	operationStatus = "Removing CloudCord…"
	finishOperation = func(err error) {
		*choice = copy
		if err != nil {
			handleErr(choice, err, "uninstall")
		} else {
			ShowInstallerNotice("CloudCord Desktop removed", "CloudCord has been uninstalled. Restart Discord to return to stock.")
		}
	}
	activeOperation = startInstallerOperation(copy.unpatch, func() { g.Update() })
}

func handleErr(di *DiscordInstall, err error, action string) {
	if errors.Is(err, ErrAlreadyReported) {
		return
	}
	if errors.Is(err, os.ErrPermission) {
		switch runtime.GOOS {
		case "windows":
			err = errors.New("Permission denied. Make sure your Discord is fully closed (from the system tray)!")
		default:
			err = errors.New("Permission denied. Try running the installer as Administrator.")
		}
	}

	ShowInstallerNotice("Failed to "+action+" CloudCord", err.Error())
}

func ShowInstallerNotice(title, desc string) {
	noticeTitle, noticeMessage = title, desc
	g.Update()
}

func finishPendingOperation() {
	if activeOperation != nil {
		select {
		case err := <-activeOperation.result:
			activeOperation = nil
			operationStatus = ""
			finishOperation(err)
			finishOperation = nil
			g.Update()
		default:
		}
	}
}

func loop() {
	// Consume results before constructing widgets so the same frame reflects
	// completion, the updated installation and the enabled action buttons.
	finishPendingOperation()
	select {
	case <-releaseReadySignal:
		releaseReady = true
	default:
	}
	if wi, hi := win.GetSize(); wi < 96 || hi < 96 {
		return
	}

	wi, _ := win.GetSize()
	w := float32(wi) - 56
	if w < 200 {
		w = 200
	}
	btnWidth := (w - 24) / 3
	if btnWidth < 1 {
		btnWidth = 1
	}

	var currentDiscord *DiscordInstall
	if radioIdx != customChoiceIdx && radioIdx >= 0 && radioIdx < len(discords) {
		currentDiscord = discords[radioIdx].(*DiscordInstall)
	}
	isPatched := currentDiscord != nil && currentDiscord.isPatched

	installText := "Stable Discord"
	if currentDiscord != nil {
		installText = strings.Title(currentDiscord.branch) + " Discord"
	} else if len(discords) == 0 {
		installText = "No Discord installation found"
	}

	bgCardCol := color.RGBA{R: 0x16, G: 0x20, B: 0x32, A: 0xFF}
	accentCyan := color.RGBA{R: 0x38, G: 0xBD, B: 0xF8, A: 0xFF}
	textMuted := color.RGBA{R: 0x94, G: 0xA3, B: 0xB8, A: 0xFF}
	btnPurple := color.RGBA{R: 0x7C, G: 0x5D, B: 0xFA, A: 0xFF}
	btnCyan := color.RGBA{R: 0x38, G: 0xBD, B: 0xF8, A: 0xFF}
	btnDelete := color.RGBA{R: 0xF8, G: 0x71, B: 0x71, A: 0xFF}

	g.PushWindowPadding(28, 24)

	g.SingleWindow().
		Layout(
			// 1. Top Header
			g.Row(
				g.Style().SetFontSize(22).SetColor(g.StyleColorText, color.White).To(
					g.Label("CloudCord"),
				),
				g.Style().SetFontSize(16).SetColor(g.StyleColorText, textMuted).To(
					g.Label(" Desktop Installer"),
				),
			),

			g.Dummy(0, 24),
			&CondWidget{
				predicate: noticeTitle != "",
				ifWidget: func() g.Widget {
					return g.Column(
						g.Label(noticeTitle),
						g.Label(noticeMessage).Wrapped(true),
						g.Button("Dismiss").OnClick(func() { noticeTitle, noticeMessage = "", "" }),
						g.Separator(),
					)
				},
			},

			// 2. Hero Card
			g.Style().
				SetColor(g.StyleColorChildBg, bgCardCol).
				SetStyleFloat(g.StyleVarChildRounding, 8).
				SetStyle(g.StyleVarWindowPadding, 16, 12).
				To(
					g.Child().Size(w, 100).Layout(
						g.Style().SetFontSize(11).SetColor(g.StyleColorText, accentCyan).To(
							g.Label("CLOUDCORD DESKTOP"),
						),
						g.Dummy(0, 2),
						g.Style().SetFontSize(17).SetColor(g.StyleColorText, color.White).To(
							g.Label("Your Discord, upgraded."),
						),
						g.Dummy(0, 2),
						g.Style().SetFontSize(13).SetColor(g.StyleColorText, textMuted).To(
							g.Label("BotCord  |  Fake Profile  |  CloudSync  |  Plugins  |  Themes"),
						),
					),
				),

			g.Dummy(0, 10),

			// 3. Discord Installation Card
			g.Style().
				SetColor(g.StyleColorChildBg, bgCardCol).
				SetStyleFloat(g.StyleVarChildRounding, 8).
				SetStyle(g.StyleVarWindowPadding, 16, 12).
				To(
					g.Child().Size(w, 130).Layout(
						g.Row(
							g.Style().SetFontSize(15).SetColor(g.StyleColorText, color.White).To(
								g.Label("Discord installation "),
							),
							g.Style().SetFontSize(13).SetColor(g.StyleColorText, accentCyan).To(
								g.Label(Ternary(isPatched, "CloudCord installed", "Not installed")),
							),
						),
						g.Dummy(0, 4),
						g.Style().SetFontSize(14).SetColor(g.StyleColorText, color.RGBA{R: 0xCB, G: 0xD5, B: 0xE1, A: 0xFF}).To(
							g.Label(installText),
						),
						installationPicker(w - 32),
					),
				),

			g.Dummy(0, 12),

			// 4. Subtitle
			g.Style().SetFontSize(13).SetColor(g.StyleColorText, textMuted).To(
				g.Label(Ternary(activeOperation != nil, operationStatus, "Update keeps your plugins, settings, themes, fonts and CloudCord data.")).Wrapped(true),
			),

			g.Dummy(0, 14),

			// 5. 3 Action Buttons
			g.Style().SetStyleFloat(g.StyleVarFrameRounding, 10).To(
				g.Row(
					// Install (Purple)
					g.Style().
						SetColor(g.StyleColorButton, btnPurple).
						SetColor(g.StyleColorButtonHovered, color.RGBA{R: 0x6D, G: 0x4E, B: 0xEB, A: 0xFF}).
						SetColor(g.StyleColorText, color.White).
						SetFontSize(15).
						To(
							g.Button("Install").
								Disabled(activeOperation != nil || !releaseReady).
								OnClick(func() {
									patchSuccessTitle = "CloudCord Desktop installed"
									handlePatch()
								}).
								Size(btnWidth, 42),
						),

					// Update / Fix (Cyan)
					g.Style().
						SetColor(g.StyleColorButton, btnCyan).
						SetColor(g.StyleColorButtonHovered, color.RGBA{R: 0x2A, G: 0xAE, B: 0xE9, A: 0xFF}).
						SetColor(g.StyleColorText, color.RGBA{R: 0x0F, G: 0x17, B: 0x2A, A: 0xFF}).
						SetFontSize(15).
						To(
							g.Button("Update / Fix").
								Disabled(activeOperation != nil || !releaseReady).
								OnClick(func() {
									patchSuccessTitle = "CloudCord Desktop updated"
									handlePatch()
								}).
								Size(btnWidth, 42),
						),

					// Delete (Red)
					g.Style().
						SetColor(g.StyleColorButton, btnDelete).
						SetColor(g.StyleColorButtonHovered, color.RGBA{R: 0xEF, G: 0x44, B: 0x44, A: 0xFF}).
						SetColor(g.StyleColorText, color.White).
						SetFontSize(15).
						To(
							g.Button("Uninstall").
								Disabled(activeOperation != nil).
								OnClick(handleUnpatch).
								Size(btnWidth, 42),
						),
				),
			),

		)
	g.PopStyle()
}

func HandleScuffedInstall() {
	ShowInstallerNotice("Broken Discord Install", "You have a broken Discord install in ProgramData.\nPlease reinstall Discord before proceeding!")
}
