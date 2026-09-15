//go:build !windows

package winsvc

import "errors"

type RunFunc func(stop <-chan struct{})

func RunAsService(_ RunFunc) error { return errors.New("only available on Windows") }
func IsService() bool              { return false }
func Install(_ string) error       { return errors.New("only available on Windows") }
func Uninstall() error             { return errors.New("only available on Windows") }
