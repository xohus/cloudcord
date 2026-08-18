//go:build windows

package main

import "syscall"

func hideConsole() {
	getConsoleWindow := syscall.NewLazyDLL("kernel32.dll").NewProc("GetConsoleWindow")
	showWindow := syscall.NewLazyDLL("user32.dll").NewProc("ShowWindow")
	hwnd, _, _ := getConsoleWindow.Call()
	if hwnd != 0 {
		showWindow.Call(hwnd, 0)
	}
}
