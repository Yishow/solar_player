//go:build windows

package tray

import (
	"golang.org/x/sys/windows"
)

const mutexName = `Global\EZSolarScraperTraySingleton`

var (
	createMutexFn = windows.CreateMutex
	closeHandleFn = windows.CloseHandle
)

// AcquireSingleInstance 確保只有一個 tray 實例（Windows 命名 mutex）。
// 取得失敗（已有實例）回傳 ok=false；呼叫端負責在離開時呼叫 release（進程結束自動釋放）。
func AcquireSingleInstance(exeDir string) (release func(), ok bool, err error) {
	name, err := windows.UTF16PtrFromString(mutexName)
	if err != nil {
		return nil, false, err
	}
	handle, err := createMutexFn(nil, false, name)
	if err == windows.ERROR_ALREADY_EXISTS {
		if handle != 0 {
			_ = closeHandleFn(handle)
		}
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	return func() { _ = windows.ReleaseMutex(handle); _ = closeHandleFn(handle) }, true, nil
}
