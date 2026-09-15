//go:build !windows

package opc

func newWindowsReaderImpl() (Reader, error) {
	return nil, errNotWindows
}
