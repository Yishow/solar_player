//go:build !windows

package mosquitto

import (
	"os"
	"syscall"
)

var (
	sysSignalZero = os.Signal(syscall.Signal(0))
	sigTerm       = os.Signal(syscall.SIGTERM)
)

func sysProcAttr() *syscall.SysProcAttr { return nil }
