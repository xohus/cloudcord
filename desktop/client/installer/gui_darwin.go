//go:build darwin && !cli

package main

/*
#cgo LDFLAGS: -framework Cocoa
#include <stdlib.h>
int cloudcordChooseAction(const char *choices, int *selection);
char *cloudcordChooseBundle(void);
void cloudcordShowResult(const char *title, const char *message);
*/
import "C"

import (
    _ "embed"
    "errors"
    "fmt"
    "runtime"
    "strings"
    "unsafe"
)

//go:embed MAC-INSTALL.txt
var macInstallGuide string

func InstallLatestBuilds() error {
    err := installLatestBuilds()
    if err != nil {
        macMessage("Could not install runtime", err.Error())
    }
    return err
}

func macMessage(title, message string) {
    cTitle, cMessage := C.CString(title), C.CString(message)
    defer C.free(unsafe.Pointer(cTitle))
    defer C.free(unsafe.Pointer(cMessage))
    C.cloudcordShowResult(cTitle, cMessage)
}

func init() {
    // Lock during initialization so AppKit runs on the original main thread.
    runtime.LockOSThread()
}

func main() {
    InitGithubDownloader()
    for {
        candidates := FindDiscords()
        labels := make([]string, 0, len(candidates)+1)
        for _, candidate := range candidates {
            labels = append(labels, candidate.(*DiscordInstall).path)
        }
        labels = append(labels, "Choose another Discord app…")
        cChoices := C.CString(strings.Join(labels, "\n"))
        var selected C.int
        action := int(C.cloudcordChooseAction(cChoices, &selected))
        C.free(unsafe.Pointer(cChoices))
        if action < 0 { return }
        if action == 2 {
            macMessage("CloudCord — Installation Guide", macInstallGuide)
            continue
        }
        var install *DiscordInstall
        if int(selected) < len(candidates) {
            install = candidates[int(selected)].(*DiscordInstall)
        } else {
            chosen := C.cloudcordChooseBundle()
            if chosen == nil { continue }
            bundle := C.GoString(chosen)
            C.free(unsafe.Pointer(chosen))
            install = ParseDiscord(bundle, "")
        }
        if install == nil {
            macMessage("Discord not found", "Choose an installed Discord.app, not its download disk image. Install Discord first if needed.")
            continue
        }
        var err error
        if action == 0 {
            err = install.patch()
        } else if install.isPatched {
            err = install.unpatch()
        }
        if err != nil {
            if errors.Is(err, ErrAlreadyReported) { continue }
            macMessage("Could not finish", fmt.Sprintf("%v\n\nQuit Discord and try again. Make sure your account can write to the selected app. Your original Discord archive is kept as a backup during installation.", err))
        } else if action == 0 {
            macMessage("CloudCord installed", "Open Discord to use CloudCord. Run this installer again to reinstall or remove it.")
        } else {
            macMessage("CloudCord removed", "Open Discord to use the original app.")
        }
    }
}
