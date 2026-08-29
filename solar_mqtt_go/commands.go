package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"solar_mqtt_go/internal/config"
	"solar_mqtt_go/internal/display"
	"solar_mqtt_go/internal/mosquitto"
	"solar_mqtt_go/internal/mqttbus"
	"solar_mqtt_go/internal/scraper"
	"solar_mqtt_go/internal/service"
	"solar_mqtt_go/internal/storage"
	"solar_mqtt_go/internal/tray"
	"solar_mqtt_go/internal/webui"
)

// configPathFor 設定檔路徑（測試可替換；優先使用當前目錄，預設為 executable 目錄旁）。
var configPathFor = func() string {
	if _, err := os.Stat("solar_config.json"); err == nil {
		if abs, err := filepath.Abs("solar_config.json"); err == nil {
			return abs
		}
		return "solar_config.json"
	}
	return config.DefaultConfigPath()
}

var webuiStartFn = func(port int) (*webui.Server, error) {
	return webui.StartWithOptions(webui.Options{
		Port:       port,
		ConfigPath: configPathFor(),
	})
}

var newMQTTBusFn = mqttbus.New
var connectMQTTBusFn = func(bus *mqttbus.Bus, options mqttbus.ConnectionOptions) bool {
	return bus.ConnectWithOptions(options)
}
var newServiceManagerFn = service.NewManager

// newConfig 載入設定。
func newConfig() *config.Config {
	cfg := config.New()
	if err := cfg.Load(configPathFor()); err != nil {
		fmt.Printf("讀取設定失敗：%v\n", err)
	}
	return cfg
}

func newFactoryScraper(cfg *config.Config, factoryID string) *scraper.Scraper {
	fac := cfg.Factory(factoryID)
	if fac == nil {
		return nil
	}
	baseURL, _ := fac["base_url"].(string)
	user, _ := fac["login_user"].(string)
	pass, _ := fac["login_pass"].(string)
	return scraper.New(factoryID, baseURL, user, pass)
}

// ── tray ──

// trayManagerController 以 FactoryServiceManager 實作 tray.ServiceController。
// 暫停 = Stop（StopAll + 斷線）；恢復 = Start（重建 manager + 連線 + 啟動全部 worker）。
type trayManagerController struct {
	cfg *config.Config
	st  *storage.Storage

	mu  sync.Mutex
	mgr *service.FactoryServiceManager
}

func (c *trayManagerController) Start() {
	c.mu.Lock()
	if c.mgr != nil {
		c.mu.Unlock()
		return
	}
	c.mu.Unlock()

	bus := newMQTTBusFn()
	options, optErr := mqttbus.ConnectionOptionsFromEnv(
		c.cfg.GetString("mqtt_host", "localhost"),
		c.cfg.GetInt("mqtt_port", 1883),
		c.cfg.GetString("mqtt_prefix", "solar"),
	)
	if optErr != nil {
		fmt.Printf("tray: MQTT 連線選項錯誤：%v\n", optErr)
		return
	}
	if !connectMQTTBusFn(bus, options) {
		fmt.Println("tray: MQTT 連線失敗，擷取未啟動（可再切換暫停／恢復重試）")
		return
	}
	mgr := newServiceManagerFn(c.cfg, bus, c.st)
	if err := mgr.StartAll(); err != nil {
		fmt.Printf("tray: 擷取啟動失敗：%v（可再切換暫停／恢復重試）\n", err)
		mgr.StopAll()
		return
	}
	c.mu.Lock()
	c.mgr = mgr
	c.mu.Unlock()
}

func (c *trayManagerController) Stop() {
	c.mu.Lock()
	mgr := c.mgr
	c.mgr = nil
	c.mu.Unlock()
	if mgr != nil {
		mgr.StopAll()
	}
}

func (c *trayManagerController) Running() bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.mgr != nil
}

// openFolder 以平台檔案管理員開啟目錄。
func openFolder(dir string) error {
	switch runtime.GOOS {
	case "windows":
		return exec.Command("explorer", dir).Start()
	case "darwin":
		return exec.Command("open", dir).Start()
	default:
		return exec.Command("xdg-open", dir).Start()
	}
}

// cmdTray 系統列常駐模式（Windows 無參數預設；其他平台 tray 子命令）。
func cmdTray() int {
	exe, err := os.Executable()
	if err != nil {
		fmt.Printf("無法取得執行檔路徑：%v\n", err)
		return 1
	}
	exeDir := filepath.Dir(exe)

	// 單一實例保護
	release, ok, err := tray.AcquireSingleInstance(exeDir)
	if err != nil {
		fmt.Printf("tray: 單一實例檢查失敗：%v\n", err)
		return 1
	}
	if !ok {
		fmt.Println("EZ-Solar tray 已在執行中")
		return 0
	}
	defer release()

	// log 重導向（僅 tray 模式）
	if restore, err := tray.RedirectLogging(exeDir); err != nil {
		fmt.Printf("tray: log 檔開啟失敗：%v（輸出僅保留在終端）\n", err)
	} else {
		defer restore()
	}

	cfg := newConfig()
	st := storage.Open(cfg.GetString("sqlite_path", "solar.db"), cfg.GetBool("sqlite_enabled", true))
	defer st.Close()

	// embedded 儀表板（僅 127.0.0.1）
	port := int(cfg.GetFloat("web_port", 18868))
	if port <= 0 {
		port = 18868
	}
	web, err := webuiStartFn(port)
	if err != nil {
		fmt.Printf("tray: 儀表板伺服器啟動失敗：%v\n", err)
		return 1
	}
	dashboardURL := "http://" + web.Addr() + "/"
	fmt.Printf("儀表板：%s\n", dashboardURL)

	ctrl := &trayManagerController{cfg: cfg, st: st}
	ctrl.Start()

	fmt.Println("EZ-Solar 已縮入系統列（右鍵操作）")
	tray.Run(tray.Deps{
		Controller: ctrl,
		WebURL:     dashboardURL,
		ExeDir:     exeDir,
		OpenURL:    webui.OpenBrowser,
		OpenFolder: openFolder,
		WebStop: func() {
			if web != nil {
				web.Stop()
			}
		},
	})

	// systray 迴圈結束（離開）後確保服務停止
	ctrl.Stop()
	fmt.Println("服務已停止")
	return 0
}

// ── run ──

func cmdRun() int {
	cfg := newConfig()
	brokerOptions, err := mqttbus.ConnectionOptionsFromEnv(
		cfg.GetString("mqtt_host", "localhost"),
		cfg.GetInt("mqtt_port", 1883),
		cfg.GetString("mqtt_prefix", "solar"),
	)
	if err != nil {
		fmt.Printf("MQTT transport configuration invalid: %s\n", err)
		return 1
	}
	if err := brokerOptions.Validate(); err != nil {
		fmt.Printf("MQTT transport configuration rejected: %s\n", err)
		return 1
	}

	mosq := &mosquitto.Runner{}
	mosq.Start(
		cfg.GetString("mosquitto_path", ""),
		cfg.GetString("mosquitto_config", ""),
		cfg.GetString("mqtt_host", "localhost"),
		cfg.GetInt("mqtt_port", 1883),
	)

	bus := newMQTTBusFn()
	if !connectMQTTBusFn(bus, brokerOptions) {
		fmt.Println("MQTT 連線失敗，終止")
		mosq.Stop()
		return 1
	}
	time.Sleep(1 * time.Second)

	st := storage.Open(cfg.GetString("sqlite_path", "solar.db"), cfg.GetBool("sqlite_enabled", true))

	// embedded 儀表板（僅 127.0.0.1）
	port := int(cfg.GetFloat("web_port", 18868))
	if port <= 0 {
		port = 18868
	}
	web, err := webuiStartFn(port)
	if err != nil {
		fmt.Printf("警告：儀表板伺服器啟動失敗：%v\n", err)
	} else {
		defer web.Stop()
	}

	mgr := newServiceManagerFn(cfg, bus, st)
	installSignals(mgr)

	fmt.Println(strings.Repeat("=", 60))
	fmt.Println("  EZ-Solar 服務啟動")
	fmt.Printf("  Broker : %s:%d\n", cfg.GetString("mqtt_host", "localhost"), cfg.GetInt("mqtt_port", 1883))
	fmt.Printf("  Prefix : %s\n", cfg.GetString("mqtt_prefix", "solar"))
	fmt.Printf("  廠別   : %s\n", strings.Join(cfg.FactoryIDs(), ", "))
	if web != nil {
		fmt.Printf("  儀表板 : http://%s/\n", web.Addr())
	}
	sqliteLine := "停用"
	if st.Enabled() {
		sqliteLine = "啟用 " + cfg.GetString("sqlite_path", "")
	}
	fmt.Printf("  SQLite : %s\n", sqliteLine)
	haLine, nightLine := "停用", "停用"
	if cfg.GetBool("ha_discovery", false) {
		haLine = "啟用"
	}
	if cfg.GetBool("night_pause", false) {
		nightLine = "啟用"
	}
	fmt.Printf("  HA MQTT: %s\n", haLine)
	fmt.Printf("  夜間暫停: %s\n", nightLine)
	fmt.Println("  Ctrl+C 停止")
	fmt.Println(strings.Repeat("=", 60))

	if err := mgr.StartAll(); err != nil {
		fmt.Printf("警告：服務啟動失敗：%v\n", err)
		mgr.StopAll()
		bus.Disconnect()
		st.Close()
		mosq.Stop()
		return 1
	}
	mgr.Wait()

	mgr.StopAll()
	bus.Disconnect()
	st.Close()
	mosq.Stop()
	fmt.Println("服務已停止")
	return 0
}

// installSignals 兩段式 Ctrl+C：第一次優雅停止、第二次強制結束（exit 130）。
func installSignals(mgr *service.FactoryServiceManager) {
	var count atomic.Int32
	ch := make(chan os.Signal, 2)
	signal.Notify(ch, os.Interrupt, syscall.SIGTERM)
	go func() {
		for range ch {
			if count.Add(1) >= 2 {
				fmt.Println("\n強制結束")
				os.Exit(130)
			}
			fmt.Println("\n停止服務...（再按一次 Ctrl+C 強制結束）")
			mgr.RequestStop()
		}
	}()
}

// ── once ──

func cmdOnce() int {
	cfg := newConfig()
	st := storage.Open(cfg.GetString("sqlite_path", "solar.db"), cfg.GetBool("sqlite_enabled", true))
	defer st.Close()

	for _, facID := range cfg.FactoryIDs() {
		sc := newFactoryScraper(cfg, facID)
		summary, zones, err := sc.Fetch()
		if err != nil {
			fmt.Printf("[%s] 失敗: %v\n", facID, err)
			continue
		}
		st.Record(facID, summary, zones, "")
		display.PrintResult(facID, summary, zones, false,
			cfg.GetString("mqtt_prefix", "solar"),
			cfg.GetString("mqtt_host", "localhost"),
			cfg.GetInt("mqtt_port", 1883))
	}
	return 0
}

// ── test-login ──

func cmdTestLogin(factoryID string) int {
	cfg := newConfig()
	ids := cfg.FactoryIDs()
	if factoryID != "" {
		if cfg.Factory(factoryID) == nil {
			fmt.Printf("找不到 factory_id=%s\n", factoryID)
			return 1
		}
		ids = []string{factoryID}
	}
	for _, id := range ids {
		s := newFactoryScraper(cfg, id)
		if err := s.Login(); err != nil {
			fmt.Printf("[%s] 登入失敗：%v\n", id, err)
			continue
		}
		fmt.Printf("[%s] 登入 OK\n", id)
	}
	return 0
}

// ── test-mqtt ──

func cmdTestMqtt() int {
	cfg := newConfig()
	brokerOptions, err := mqttbus.ConnectionOptionsFromEnv(
		cfg.GetString("mqtt_host", "localhost"),
		cfg.GetInt("mqtt_port", 1883),
		cfg.GetString("mqtt_prefix", "solar"),
	)
	if err != nil {
		fmt.Printf("MQTT transport configuration invalid: %s\n", err)
		return 1
	}
	if err := brokerOptions.Validate(); err != nil {
		fmt.Printf("MQTT transport configuration rejected: %s\n", err)
		return 1
	}
	bus := mqttbus.New()
	if !bus.ConnectWithOptions(brokerOptions) {
		return 1
	}
	time.Sleep(1 * time.Second)
	topic := fmt.Sprintf("%s/_test", cfg.GetString("mqtt_prefix", "solar"))
	bus.PublishJSON(topic, map[string]any{"ts": float64(time.Now().UnixNano()) / 1e9}, false)
	fmt.Printf("已發一筆測試訊息到 %s\n", topic)
	time.Sleep(1 * time.Second)
	bus.Disconnect()
	return 0
}

// ── dump-api ──

func cmdDumpAPI(factoryID string) int {
	cfg := newConfig()
	ids := cfg.FactoryIDs()
	if factoryID != "" {
		if cfg.Factory(factoryID) == nil {
			fmt.Printf("找不到 factory_id=%s\n", factoryID)
			return 1
		}
		ids = []string{factoryID}
	}
	for _, id := range ids {
		s := newFactoryScraper(cfg, id)
		summary, zones, err := s.Fetch()
		if err != nil {
			fmt.Printf("[%s] 失敗: %v\n", id, err)
			continue
		}
		fmt.Printf("=== [%s] summary ===\n", id)
		printJSONIndent(summary)
		fmt.Printf("=== [%s] zones (%d) ===\n", id, len(zones))
		printJSONIndent(zones)
	}
	return 0
}

// printJSONIndent 對應 Python json.dumps(..., indent=2, ensure_ascii=False)。
func printJSONIndent(v any) {
	var sb strings.Builder
	enc := json.NewEncoder(&sb)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	if err := enc.Encode(v); err != nil {
		fmt.Println(err)
		return
	}
	fmt.Print(strings.TrimSuffix(sb.String(), "\n"))
	fmt.Println()
}

// ── history / alerts ──

func cmdHistory(factoryID string, limit int) int {
	cfg := newConfig()
	st := storage.Open(cfg.GetString("sqlite_path", "solar.db"), cfg.GetBool("sqlite_enabled", true))
	defer st.Close()

	rows, err := st.HistorySummary(factoryID, limit)
	if err != nil {
		fmt.Printf("查詢失敗：%v\n", err)
		return 1
	}
	if len(rows) == 0 {
		fmt.Println("（無資料）")
		return 0
	}
	fmt.Printf("%-20s %-4s %8s %10s %10s\n", "時間", "廠", "kW", "今日MWh", "本月MWh")
	fmt.Println(strings.Repeat("-", 60))
	for _, r := range rows {
		total, today, month := "   -  ", "   -  ", "   -  "
		if r.TotalPowerKw != nil {
			total = fmt.Sprintf("%v", *r.TotalPowerKw)
		}
		if r.TodayMwh != nil {
			today = fmt.Sprintf("%v", *r.TodayMwh)
		}
		if r.MonthMwh != nil {
			month = fmt.Sprintf("%v", *r.MonthMwh)
		}
		fmt.Printf("%-20s %-4s %8s %10s %10s\n", r.Ts, r.FactoryID, total, today, month)
	}
	return 0
}

func cmdAlerts(limit int) int {
	cfg := newConfig()
	st := storage.Open(cfg.GetString("sqlite_path", "solar.db"), cfg.GetBool("sqlite_enabled", true))
	defer st.Close()

	rows, err := st.HistoryAlerts(limit)
	if err != nil {
		fmt.Printf("查詢失敗：%v\n", err)
		return 1
	}
	if len(rows) == 0 {
		fmt.Println("（無 alert）")
		return 0
	}
	for _, r := range rows {
		fmt.Printf("%s  [%s] %s: %s\n", r.Ts, r.FactoryID, r.Level, r.Message)
	}
	return 0
}
