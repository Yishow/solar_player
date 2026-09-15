//go:build !windows

package dde

import "errors"

var errNotWindows = errors.New("DDE is only available on Windows desktop sessions")

func NewWindowsReader() (Reader, error) {
	return nil, errNotWindows
}
