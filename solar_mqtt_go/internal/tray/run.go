// Package tray 提供系統列常駐模式：systray 薄層、選單狀態機（app.go）、
// 單一實例保護與 log 重導向。
//
// 薄層說明：本檔（run.go）是唯一 import getlantern/systray 的檔案，
// 訊息迴圈與選單事件不可單元測試；可測邏輯集中在 app.go。
//go:build windows || cgo

package tray

import (
	"fmt"
	"os"
	"runtime"

	"github.com/getlantern/systray"
	"solar_mqtt_go/assets"
)

// Available reports whether this build/runtime has a usable tray surface.
// Linux headless sessions cannot initialize the native tray loop and must use
// the ordinary console run path instead.
func Available() bool {
	if runtime.GOOS == "linux" {
		return os.Getenv("DISPLAY") != "" || os.Getenv("WAYLAND_DISPLAY") != ""
	}
	return true
}

// Run 啟動 systray 訊息迴圈（阻塞至 Quit）。deps 見 app.go。
// deps.Quit 未提供時預設為 systray.Quit。
func Run(deps Deps) {
	if deps.Quit == nil {
		deps.Quit = systray.Quit
	}
	app := New(deps)
	onReady := func() {
		systray.SetIcon(assets.TrayIcon())
		systray.SetTitle("EZ-Solar")
		systray.SetTooltip("EZ-Solar 發電量擷取服務")

		mOpen := systray.AddMenuItem("開啟網頁", "以預設瀏覽器開啟儀表板")
		mPause := systray.AddMenuItemCheckbox("暫停擷取", "停止／恢復發電量擷取", false)
		mFolder := systray.AddMenuItem("開啟資料夾", "開啟程式所在資料夾")
		systray.AddSeparator()
		mQuit := systray.AddMenuItem("離開", "停止服務並結束程式")

		go func() {
			for {
				select {
				case <-mOpen.ClickedCh:
					if err := app.OnOpenWeb(); err != nil {
						fmt.Printf("tray: 開啟網頁失敗：%v\n", err)
					}
				case <-mPause.ClickedCh:
					paused := app.OnTogglePause()
					if paused {
						mPause.SetTitle("恢復擷取")
						mPause.Check()
					} else {
						mPause.SetTitle("暫停擷取")
						mPause.Uncheck()
					}
				case <-mFolder.ClickedCh:
					if err := app.OnOpenFolder(); err != nil {
						fmt.Printf("tray: 開啟資料夾失敗：%v\n", err)
					}
				case <-mQuit.ClickedCh:
					app.OnQuit()
					return
				}
			}
		}()
	}
	onExit := func() {}
	systray.Run(onReady, onExit)
}
