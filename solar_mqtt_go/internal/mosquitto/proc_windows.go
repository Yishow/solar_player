//go:build windows

package mosquitto

import (
	"os"
	"syscall"
)

const (
	createNoWindow      = 0x08000000
	createNewProcessGrp = 0x00000200
)

var (
	sysSignalZero = os.Signal(syscall.Signal(0))
	sigTerm       = os.Signal(syscall.SIGTERM)
)

func sysProcAttr() *syscall.SysProcAttr {
	return &syscall.SysProcAttr{
		HideWindow:    true,
		CreationFlags: createNoWindow | createNewProcessGrp,
	}
}
