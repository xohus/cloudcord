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

	modalId      = 0
	modalTitle   = "Oh No :("
	modalMessage = "You should never see this"

	acceptedOpenAsar   bool
	showedUpdatePrompt bool

	cachedCandidates []any
	lastCustomDir    string

	win *g.MasterWindow

	patchSuccessTitle = "CloudCord Desktop installed"
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

	go func() {
		<-GithubDoneChan
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
			g.OpenPopup("#invalid-custom-location")
		}
	} else {
		if radioIdx >= 0 && radioIdx < len(discords) {
			choice = discords[radioIdx].(*DiscordInstall)
		}
	}
	return choice
}

func InstallLatestBuilds() (err error) {
	if IsDevInstall {
		return
	}

	err = installLatestBuilds()
	if err != nil {
		ShowModal("Uh Oh!", "Failed to install the latest CloudCord builds from GitHub:\n"+err.Error())
	}
	return
}

func handlePatch() {
	choice := getChosenInstall()
	if choice != nil {
		choice.Patch()
	}
}

func handleUnpatch() {
	choice := getChosenInstall()
	if choice != nil {
		choice.Unpatch()
	}
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

	ShowModal("Failed to "+action+" this Install", err.Error())
}

func (di *DiscordInstall) Patch() {
	if CheckScuffedInstall() {
		return
	}
	if err := di.patch(); err != nil {
		handleErr(di, err, "patch")
	} else {
		g.OpenPopup("#patched")
	}
}

func (di *DiscordInstall) Unpatch() {
	if err := di.unpatch(); err != nil {
		handleErr(di, err, "unpatch")
	} else {
		g.OpenPopup("#unpatched")
	}
}

func ShowModal(title, desc string) {
	modalTitle = title
	modalMessage = desc
	modalId++
	g.OpenPopup("#modal" + strconv.Itoa(modalId))
}

func InfoModal(id, title, description string) g.Widget {
	return RawInfoModal(id, title, description, false)
}

func RawInfoModal(id, title, description string, unformatted bool) g.Widget {
	return g.PopupModal(id).
		Flags(g.WindowFlagsAlwaysAutoResize|g.WindowFlagsNoMove).
		Layout(
			g.Label(title),
			&CondWidget{
				unformatted,
				func() g.Widget {
					return g.Label(description)
				},
				func() g.Widget {
					return g.Markdown(description)
				},
			},
			g.Button("OK").OnClick(func() {
				g.CloseCurrentPopup()
			}),
		)
}

func loop() {
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

			g.Dummy(0, 110),

			// 2. Hero Card
			g.Style().
				SetColor(g.StyleColorChildBg, bgCardCol).
				SetStyleFloat(g.StyleVarChildRounding, 8).
				SetStyle(g.StyleVarWindowPadding, 16, 12).
				To(
					g.Child().Size(w, 82).Layout(
						g.Style().SetFontSize(11).SetColor(g.StyleColorText, accentCyan).To(
							g.Label("CLOUDCORD DESKTOP"),
						),
						g.Dummy(0, 2),
						g.Style().SetFontSize(17).SetColor(g.StyleColorText, color.White).To(
							g.Label("Your Discord, upgraded."),
						),
						g.Dummy(0, 2),
						g.Style().SetFontSize(13).SetColor(g.StyleColorText, textMuted).To(
							g.Label("BotCord  |  Fake Profile  |  Cloud Sync  |  Plugins  |  Themes"),
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
					g.Child().Size(w, 72).Layout(
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
					),
				),

			g.Dummy(0, 12),

			// 4. Subtitle
			g.Style().SetFontSize(13).SetColor(g.StyleColorText, textMuted).To(
				g.Label("Update keeps all plugins, settings, themes, fonts and CloudCord data."),
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
								OnClick(func() {
									patchSuccessTitle = "CloudCord Desktop updated"
									if IsDevInstall {
										handlePatch()
									} else {
										err := InstallLatestBuilds()
										if err == nil {
											handlePatch()
										}
									}
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
							g.Button("Delete").
								OnClick(handleUnpatch).
								Size(btnWidth, 42),
						),
				),
			),

			InfoModal("#patched", patchSuccessTitle, "If Discord is still open, fully close it first.\nThen start it and verify CloudCord installed successfully in Discord Settings!"),
			InfoModal("#unpatched", "CloudCord Desktop removed", "CloudCord has been uninstalled. Restart Discord to return to stock."),
			InfoModal("#modal"+strconv.Itoa(modalId), modalTitle, modalMessage),
		)
}

func HandleScuffedInstall() {
	ShowModal("Broken Discord Install", "You have a broken Discord install in ProgramData.\nPlease reinstall Discord before proceeding!")
}

