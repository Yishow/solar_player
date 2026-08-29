package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"

	_ "modernc.org/sqlite"
	"solar_mqtt_go/internal/config"
	"solar_mqtt_go/internal/mqttbus"
	"solar_mqtt_go/internal/storage"
	"solar_mqtt_go/internal/webui"
)

// ── 測試環境：temp CWD + 指定設定檔 + fake EZ-Solar + fake broker probe ──

var fakeURL string

func startFakeSolar(t *testing.T) {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("/default.aspx", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			_, _ = w.Write([]byte(`<html><body><h1>OK</h1></body></html>`))
			return
		}
		_, _ = w.Write([]byte(`<html><form><input name="deftxt1"/><input name="deftxt2"/><input type="submit" name="defbtn1"/></form></html>`))
	})
	mux.HandleFunc("/api/s_json.ashx", func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		if r.PostForm.Get("id") == "00_00" {
			_, _ = w.Write([]byte(`[{"x0":"3.2","x1":"1.1","x2":"5.5"}]`))
			return
		}
		_, _ = w.Write([]byte(`[{"x0":"區A","x4":"2","x5":"10","x6":"1","x7":"50","x8":"S1","x12":"40"}]`))
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	fakeURL = srv.URL
}

// fakeBrokerProbe：只收連線計數，不做 MQTT 交談（用於證明 zero MQTT side effects）。
func startBrokerProbe(t *testing.T) (net.Listener, *atomic.Int32) {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { ln.Close() })
	var conns atomic.Int32
	go func() {
		for {
			c, err := ln.Accept()
			if err != nil {
				return
			}
			conns.Add(1)
			c.Close()
		}
	}()
	return ln, &conns
}

func closedPort(t *testing.T) int {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	port := ln.Addr().(*net.TCPAddr).Port
	ln.Close()
	return port
}

func withEnv(t *testing.T, brokerPort int) string {
	t.Helper()
	dir := t.TempDir()
	cfgPath := filepath.Join(dir, "solar_config.json")

	cfg := map[string]any{
		"mqtt_host":             "127.0.0.1",
		"mqtt_port":             brokerPort,
		"sqlite_path":           "solar.db",
		"sqlite_enabled":        true,
		"mosquitto_path":        "",
		"interval":              60,
		"mqtt_retain_heartbeat": false,
		"factories": []map[string]any{
			{"factory_id": "KN", "base_url": fakeURL, "login_user": "u", "login_pass": "p"},
		},
	}
	data, _ := json.Marshal(cfg)
	if err := os.WriteFile(cfgPath, data, 0o644); err != nil {
		t.Fatal(err)
	}

	old := configPathFor
	configPathFor = func() string { return cfgPath }
	t.Cleanup(func() { configPathFor = old })

	oldWd, _ := os.Getwd()
	if err := os.Chdir(dir); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chdir(oldWd) })

	return dir
}

func countSummaryRows(t *testing.T, dir string) int {
	t.Helper()
	db, err := sql.Open("sqlite", filepath.Join(dir, "solar.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	var n int
	if err := db.QueryRow("SELECT COUNT(*) FROM summary").Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

// ── CLI table tests ──

func TestCLITable(t *testing.T) {
	startFakeSolar(t)
	broker := closedPort(t)
	dir := withEnv(t, broker)
	_ = dir

	cases := []struct {
		name string
		args []string
		want int
	}{
		{"help flag", []string{"--help"}, 0},
		{"help cmd", []string{"help"}, 0},
		{"history empty", []string{"history", "-n", "5"}, 0},
		{"alerts empty", []string{"alerts"}, 0},
		{"removed install-service", []string{"install-service"}, 1},
		{"test-login ok", []string{"test-login"}, 0},
		{"test-login filter", []string{"test-login", "KN"}, 0},
		{"test-login missing", []string{"test-login", "NOPE"}, 1},
		{"dump-api", []string{"dump-api"}, 0},
		{"test-mqtt refused", []string{"test-mqtt"}, 1},
		{"run broker refused", nil, 1}, // 預設 run
		{"run explicit refused", []string{"run"}, 1},
		{"once", []string{"once"}, 0},
		{"unknown cmd", []string{"bogus"}, 1},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := runCLI(tc.args)
			if got != tc.want {
				t.Errorf("runCLI(%v) = %d, want %d", tc.args, got, tc.want)
			}
		})
	}
}

func TestOnceHasNoMqttSideEffects(t *testing.T) {
	startFakeSolar(t)
	ln, conns := startBrokerProbe(t)
	dir := withEnv(t, ln.Addr().(*net.TCPAddr).Port)

	code := runCLI([]string{"once"})
	if code != 0 {
		t.Fatalf("once exit = %d", code)
	}
	if got := conns.Load(); got != 0 {
		t.Errorf("MQTT connections captured: %d, want 0", got)
	}
	if n := countSummaryRows(t, dir); n != 1 {
		t.Errorf("summary rows = %d, want 1", n)
	}
}

func TestLegacyOnceUsesSamePath(t *testing.T) {
	startFakeSolar(t)
	ln, _ := startBrokerProbe(t)
	dir := withEnv(t, ln.Addr().(*net.TCPAddr).Port)

	if code := runCLI([]string{"once"}); code != 0 {
		t.Fatalf("once exit = %d", code)
	}
	n1 := countSummaryRows(t, dir)
	if n1 != 1 {
		t.Fatalf("after once rows = %d", n1)
	}
	// ts 為秒級主鍵：等秒數翻轉，避免 REPLACE 同一列
	time.Sleep(1100 * time.Millisecond)
	if code := runCLI([]string{"--once"}); code != 0 {
		t.Fatalf("--once exit = %d", code)
	}
	n2 := countSummaryRows(t, dir)
	if n2 != 2 {
		t.Errorf("after --once rows = %d, want 2 (same path, appended)", n2)
	}
}

func TestHistoryReadsRecordedRows(t *testing.T) {
	startFakeSolar(t)
	ln, _ := startBrokerProbe(t)
	dir := withEnv(t, ln.Addr().(*net.TCPAddr).Port)

	if code := runCLI([]string{"once"}); code != 0 {
		t.Fatal("once failed")
	}
	if n := countSummaryRows(t, dir); n != 1 {
		t.Fatalf("precondition rows = %d", n)
	}
	// history 應讀到 once 寫入的列（exit 0 即通過內容查詢路徑）
	if code := runCLI([]string{"history"}); code != 0 {
		t.Errorf("history exit = %d", code)
	}
	if code := runCLI([]string{"alerts"}); code != 0 {
		t.Errorf("alerts exit = %d", code)
	}
}

func TestTrayDispatch(t *testing.T) {
	origTray := runTrayFn
	origGOOS := defaultGOOS
	t.Cleanup(func() {
		runTrayFn = origTray
		defaultGOOS = origGOOS
	})

	trayCalled := 0
	runTrayFn = func() int { trayCalled++; return 0 }

	// tray 子命令（任何平台）
	if code := runCLI([]string{"tray"}); code != 0 || trayCalled != 1 {
		t.Errorf("tray subcommand: code=%d calls=%d", code, trayCalled)
	}

	// Windows 無參數 → tray
	defaultGOOS = func() string { return "windows" }
	if code := runCLI(nil); code != 0 || trayCalled != 2 {
		t.Errorf("windows no-args: code=%d calls=%d, want tray dispatch", code, trayCalled)
	}

	// 非 Windows 無參數 → run（不觸發 tray）
	defaultGOOS = func() string { return "linux" }
	// run 會嘗試連線 broker：設定不存在 → 用 config 預設 localhost → 快速失敗 exit 1
	if code := runCLI(nil); code != 1 {
		t.Errorf("linux no-args should fall through to run (exit 1 without broker), got %d", code)
	}
	if trayCalled != 2 {
		t.Errorf("linux no-args must not dispatch tray, calls=%d", trayCalled)
	}
}

func TestCmdTrayFailsBeforeTrayWhenWebuiStartFails(t *testing.T) {
	origStart := webuiStartFn
	t.Cleanup(func() { webuiStartFn = origStart })
	webuiStartFn = func(int) (*webui.Server, error) {
		return nil, errors.New("forced webui failure")
	}

	if got := cmdTray(); got == 0 {
		t.Fatalf("cmdTray exit = %d, want non-zero when webui start fails", got)
	}
}

func TestTrayControllerDoesNotPublishRunningManagerAfterRecoveryFailure(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "solar_config.json")
	cfg := config.New()
	if err := cfg.Save(configPath); err != nil {
		t.Fatal(err)
	}
	if err := cfg.Load(configPath); err != nil {
		t.Fatal(err)
	}
	cfg.ApplySet("KN", map[string]any{"interval": 31})
	pending, err := json.Marshal(map[string]any{
		"request_id": "tray-retry", "factory_id": "KN", "config": cfg.AsDict(),
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(configPath+".pending-tray", pending, 0o600); err != nil {
		t.Fatal(err)
	}
	if err := cfg.Load(configPath); err != nil {
		t.Fatal(err)
	}
	st := storage.Open(filepath.Join(dir, "commands.db"), false)
	defer st.Close()

	origBus := newMQTTBusFn
	origConnect := connectMQTTBusFn
	t.Cleanup(func() {
		newMQTTBusFn = origBus
		connectMQTTBusFn = origConnect
	})
	newMQTTBusFn = mqttbus.New
	connectMQTTBusFn = func(*mqttbus.Bus, mqttbus.ConnectionOptions) bool { return true }
	controller := &trayManagerController{cfg: cfg, st: st}
	controller.Start()
	if controller.Running() {
		t.Fatal("tray controller reported running after recovery failure")
	}

	st.Close()
	st = storage.Open(filepath.Join(dir, "commands.db"), true)
	defer st.Close()
	controller.st = st
	if err := st.PutProcessedCommand(storage.CommandRecord{
		Site: "KN", RequestID: "tray-retry", Command: "set", Status: "accepted",
		Code: "OK", Summary: "accepted", CompletedAt: time.Now().UTC(),
	}); err != nil {
		t.Fatal(err)
	}
	controller.Start()
	if !controller.Running() {
		t.Fatal("tray controller did not retry after recovery failure")
	}
	controller.Stop()
}
