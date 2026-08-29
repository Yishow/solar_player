//go:build windows

package tray

import (
	"testing"

	"golang.org/x/sys/windows"
)

func TestAcquireSingleInstanceClosesExistingMutexHandle(t *testing.T) {
	origCreate := createMutexFn
	origClose := closeHandleFn
	t.Cleanup(func() {
		createMutexFn = origCreate
		closeHandleFn = origClose
	})

	const existingHandle = windows.Handle(42)
	createMutexFn = func(*windows.SecurityAttributes, bool, *uint16) (windows.Handle, error) {
		return existingHandle, windows.ERROR_ALREADY_EXISTS
	}
	var closed windows.Handle
	closeHandleFn = func(handle windows.Handle) error {
		closed = handle
		return nil
	}

	release, ok, err := AcquireSingleInstance("")
	if err != nil {
		t.Fatalf("AcquireSingleInstance error = %v", err)
	}
	if release != nil || ok {
		t.Fatalf("existing mutex result = release=%v ok=%v, want nil/false", release != nil, ok)
	}
	if closed != existingHandle {
		t.Fatalf("closed handle = %v, want %v", closed, existingHandle)
	}
}
