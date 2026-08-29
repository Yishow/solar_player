// Package assets 內嵌 tray 圖示（PNG-in-ICO）。
package assets

import _ "embed"

//go:embed tray.ico
var trayIcon []byte

// TrayIcon 回傳 tray 圖示的 ICO 位元組。
func TrayIcon() []byte { return trayIcon }
