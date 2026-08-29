// Package mosquitto 以 subprocess 啟動 / 停止本機 mosquitto broker
// （對應 Python solar/mosquitto.py）。隱藏視窗僅在 Windows 生效。
package mosquitto

import (
	"fmt"
	"net"
	"os"
	"os/exec"
	"sync"
	"time"
)

// PortInUse 以 TCP connect probe 判斷 port 是否已被監聽（對應 Python port_in_use）。
func PortInUse(host string, port int, timeout time.Duration) bool {
	conn, err := net.DialTimeout("tcp", net.JoinHostPort(host, fmt.Sprint(port)), timeout)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}

// Runner 管理本機 mosquitto subprocess。
type Runner struct {
	mu       sync.Mutex
	cmd      *exec.Cmd
	exited   bool // 由 reaper 寫入（mu 保護）
	exitCode int
}

// Running 回傳是否有存活的 subprocess。
func (r *Runner) Running() bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.cmd != nil && r.cmd.Process != nil && r.aliveLocked()
}

// aliveLocked 檢查 process 存活。需持有 mu。
// 只讀 reaper 寫入的 r.exited 旗標與 Signal(0)，不碰 cmd.ProcessState（避免與 Wait() 競爭）。
func (r *Runner) aliveLocked() bool {
	if r.cmd == nil || r.cmd.Process == nil {
		return false
	}
	if r.exited {
		return false
	}
	return r.cmd.Process.Signal(sysSignalZero) == nil
}

// Start 對應 Python MosquittoRunner.start：port 空閒才啟動，最多等 4 秒。
func (r *Runner) Start(path, conf, host string, port int) {
	if len(path) == 0 {
		return
	}
	r.mu.Lock()
	alreadyRunning := r.cmd != nil && r.aliveLocked()
	r.mu.Unlock()
	if alreadyRunning {
		return
	}
	if st, err := os.Stat(path); err != nil || st.IsDir() {
		fmt.Printf("警告：找不到 mosquitto 執行檔 %s，略過自動啟動\n", path)
		return
	}

	probeHost := host
	if host == "localhost" || host == "0.0.0.0" {
		probeHost = "127.0.0.1"
	}
	if PortInUse(probeHost, port, time.Second) {
		fmt.Printf("MQTT port %d 已被佔用，沿用現有 broker（略過自動啟動）\n", port)
		return
	}

	args := []string{}
	if c := trimSpace(conf); c != "" {
		if _, err := os.Stat(c); err != nil {
			fmt.Printf("警告：找不到 mosquitto_config %s，改用預設設定\n", c)
		} else {
			args = append(args, "-c", c)
		}
	}

	fmt.Printf("啟動 mosquitto: %s %v\n", path, args)
	if err := r.startProc(path, args); err != nil {
		fmt.Printf("啟動 mosquitto 失敗：%v\n", err)
		return
	}

	for i := 0; i < 20; i++ {
		r.mu.Lock()
		exited := !r.aliveLocked()
		code := r.exitCode
		r.mu.Unlock()
		if exited {
			r.mu.Lock()
			r.cmd = nil
			r.mu.Unlock()
			fmt.Printf("mosquitto 意外結束，exit code=%d\n", code)
			return
		}
		if PortInUse(probeHost, port, 200*time.Millisecond) {
			fmt.Printf("mosquitto 已監聽 %s:%d\n", host, port)
			return
		}
		time.Sleep(200 * time.Millisecond)
	}
	fmt.Printf("警告：mosquitto 啟動後 4 秒內仍未監聽 %s:%d\n", host, port)
}

// startProc 啟動 subprocess（stdout/stderr/stdin 皆丟棄；Windows 隱藏視窗）。
func (r *Runner) startProc(path string, args []string) error {
	cmd := exec.Command(path, args...)
	cmd.Stdout = nil
	cmd.Stderr = nil
	cmd.Stdin = nil
	cmd.SysProcAttr = sysProcAttr()
	if err := cmd.Start(); err != nil {
		return err
	}
	r.mu.Lock()
	r.cmd = cmd
	r.exited = false
	r.exitCode = -1
	r.mu.Unlock()
	// reaper：唯一觸碰 ProcessState 的地方；結果寫回 Runner 欄位（mu 保護）
	go func() {
		_ = cmd.Wait()
		r.mu.Lock()
		if r.cmd == cmd {
			r.exited = true
			if cmd.ProcessState != nil {
				r.exitCode = cmd.ProcessState.ExitCode()
			}
		}
		r.mu.Unlock()
	}()
	return nil
}

// Stop 對應 Python MosquittoRunner.stop：terminate → 5 秒寬限 → kill。
func (r *Runner) Stop() {
	r.mu.Lock()
	cmd := r.cmd
	r.mu.Unlock()
	if cmd == nil {
		return
	}
	if !r.Running() {
		r.mu.Lock()
		r.cmd = nil
		r.mu.Unlock()
		return
	}
	fmt.Println("停止 mosquitto...")
	if cmd.Process != nil {
		_ = cmd.Process.Signal(sigTerm)
	}
	deadline := time.Now().Add(5 * time.Second)
	for r.Running() && time.Now().Before(deadline) {
		time.Sleep(50 * time.Millisecond)
	}
	if r.Running() && cmd.Process != nil {
		_ = cmd.Process.Kill()
		deadline2 := time.Now().Add(2 * time.Second)
		for r.Running() && time.Now().Before(deadline2) {
			time.Sleep(50 * time.Millisecond)
		}
	}
	r.mu.Lock()
	r.cmd = nil
	r.mu.Unlock()
}

func trimSpace(s string) string {
	start := 0
	end := len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t') {
		end--
	}
	return s[start:end]
}
