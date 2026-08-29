package mosquitto

import (
	"net"
	"testing"
	"time"
)

func TestPortInUse(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	port := ln.Addr().(*net.TCPAddr).Port

	if !PortInUse("127.0.0.1", port, time.Second) {
		t.Error("PortInUse should be true for listening port")
	}
	// 找一個空的 port
	free, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	freePort := free.Addr().(*net.TCPAddr).Port
	free.Close()

	if PortInUse("127.0.0.1", freePort, time.Second) {
		t.Error("PortInUse should be false for free port")
	}
}

func TestStartSkipsEmptyPath(t *testing.T) {
	r := &Runner{}
	r.Start("  ", "", "localhost", 1883)
	if r.Running() {
		t.Error("empty path must not start anything")
	}
}

func TestStartSkipsMissingBinary(t *testing.T) {
	r := &Runner{}
	r.Start("/nonexistent/mosquitto_bin", "", "localhost", 18833)
	if r.Running() {
		t.Error("missing binary must not start")
	}
}

func TestSkipWhenPortBusy(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	port := ln.Addr().(*net.TCPAddr).Port

	r := &Runner{}
	// port 已被佔用 → 略過啟動（即使 path 存在也不啟動）
	r.Start("/bin/sleep", "", "localhost", port)
	if r.Running() {
		t.Error("busy port must skip launch")
	}
}

func TestStartDetectsImmediateExit(t *testing.T) {
	// path 存在但不是 mosquitto → 啟動後立即結束 → 必須偵測並清掉
	// 找空 port
	free, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	freePort := free.Addr().(*net.TCPAddr).Port
	free.Close()

	r := &Runner{}
	// /bin/true 立即 exit 0
	r.Start("/usr/bin/true", "", "localhost", freePort)
	if r.Running() {
		t.Error("exited process must be cleared")
	}
}

func TestStopLifecycle(t *testing.T) {
	// 直接以假 broker（sleep）驗證 Stop 的 terminate → kill 生命週期
	r := &Runner{}
	if err := r.startProc("/bin/sleep", []string{"30"}); err != nil {
		t.Skipf("cannot start sleep: %v", err)
	}
	if !r.Running() {
		t.Fatal("process should be running")
	}
	start := time.Now()
	r.Stop()
	if r.Running() {
		t.Error("Stop must clear process")
	}
	if elapsed := time.Since(start); elapsed > 10*time.Second {
		t.Errorf("Stop took %v", elapsed)
	}
	// Stop 後再 Stop → 冪等
	r.Stop()
}
