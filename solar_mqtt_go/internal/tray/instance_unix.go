//go:build !windows

package tray

import (
	"os"
	"path/filepath"
	"syscall"
)

// AcquireSingleInstance 確保只有一個 tray 實例（lock 檔 + flock）。
func AcquireSingleInstance(exeDir string) (release func(), ok bool, err error) {
	lockPath := filepath.Join(exeDir, "tray.lock")
	f, err := os.OpenFile(lockPath, os.O_CREATE|os.O_RDWR, 0o644)
	if err != nil {
		return nil, false, err
	}
	if err := syscall.Flock(int(f.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); err != nil {
		f.Close()
		return nil, false, nil
	}
	return func() {
		_ = syscall.Flock(int(f.Fd()), syscall.LOCK_UN)
		_ = f.Close()
	}, true, nil
}
