//go:build windows

package main

import (
	"os"
	"os/signal"
	"sync"
	"syscall"
)

func waitInterrupt(stop chan struct{}) {
	signals := make(chan os.Signal, 1)
	signal.Notify(signals, syscall.SIGINT, syscall.SIGTERM)

	var once sync.Once
	<-signals
	once.Do(func() {
		close(stop)
	})
}
