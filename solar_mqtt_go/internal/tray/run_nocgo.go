//go:build !windows && !cgo

package tray

import "fmt"

// Available is false when systray support was excluded from the build.
func Available() bool { return false }

// Run 此平台無 cgo 時不支援 systray（macOS 需 Cocoa），印出訊息後立即返回。
// 正式 tray 建置：Windows 為純 Go；macOS/Linux 開發時以 cgo 建置。
func Run(deps Deps) {
	_ = deps
	fmt.Println("tray：此平台建置未啟用 cgo，不支援系統列模式")
}
