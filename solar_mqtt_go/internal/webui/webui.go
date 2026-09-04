// Package webui 提供內嵌儀表板（go:embed web）的僅 loopback HTTP 伺服器
// 與跨平台開瀏覽器（對應 design「網頁 = go:embed 儀表板 + 僅 loopback HTTP server」）。
package webui

import (
	"context"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"solar_mqtt_go/internal/config"
	"solar_mqtt_go/internal/scraper"
)

//go:embed all:web
var webFS embed.FS

const (
	defaultPort  = 18868
	maxPortTries = 10
)

var defaultConfigPathFor = config.DefaultConfigPath

// Options 儀表板伺服器進階選項。
type Options struct {
	Port       int
	ConfigPath string
	GetConfig  func() *config.Config
	TestLogin  func(factoryID, baseURL, user, pass string) (int64, error)
	ScrapeNow  func(factoryID string) (map[string]any, []map[string]any, error)
}

// Server 內嵌儀表板伺服器。
type Server struct {
	srv *http.Server
	ln  net.Listener
}

// Addr 回傳實際監聽位址（127.0.0.1:port）。
func (s *Server) Addr() string { return s.ln.Addr().String() }

// Start 啟動僅 loopback 的儀表板伺服器。port 被佔用時 +1 重試最多 10 次。
func Start(port int) (*Server, error) {
	return StartWithOptions(Options{Port: port})
}

// StartWithOptions 以自訂選項啟動 loopback 伺服器。
func StartWithOptions(opts Options) (*Server, error) {
	if opts.Port <= 0 {
		opts.Port = defaultPort
	}
	opts.ConfigPath = resolveConfigPath(opts.ConfigPath)

	sub, err := fs.Sub(webFS, "web")
	if err != nil {
		return nil, err
	}
	mux := http.NewServeMux()
	registerAPIRoutes(mux, opts)
	mux.Handle("/", http.FileServer(http.FS(sub)))

	for i := 0; i < maxPortTries; i++ {
		addr := fmt.Sprintf("127.0.0.1:%d", opts.Port+i)
		ln, err := net.Listen("tcp", addr)
		if err != nil {
			continue
		}
		srv := &http.Server{
			Handler:           mux,
			ReadHeaderTimeout: 5 * time.Second,
		}
		go func() { _ = srv.Serve(ln) }()
		return &Server{srv: srv, ln: ln}, nil
	}
	return nil, errors.New("webui: 找不到可用 port（連續 " + fmt.Sprint(maxPortTries) + " 個被佔用）")
}

func resolveConfigPath(path string) string {
	if path != "" {
		return path
	}
	return defaultConfigPathFor()
}

func registerAPIRoutes(mux *http.ServeMux, opts Options) {
	mux.HandleFunc("/api/local-config", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method == http.MethodGet {
			handleGetLocalConfig(w, opts)
			return
		}
		if r.Method == http.MethodPost || r.Method == http.MethodPut {
			handleSaveLocalConfig(w, r, opts)
			return
		}
		http.Error(w, `{"error":"Method Not Allowed"}`, http.StatusMethodNotAllowed)
	})

	mux.HandleFunc("/api/test-login", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			http.Error(w, `{"error":"Method Not Allowed"}`, http.StatusMethodNotAllowed)
			return
		}
		handleTestLogin(w, r, opts)
	})

	mux.HandleFunc("/api/scrape-now", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			http.Error(w, `{"error":"Method Not Allowed"}`, http.StatusMethodNotAllowed)
			return
		}
		handleScrapeNow(w, r, opts)
	})
}

func handleGetLocalConfig(w http.ResponseWriter, opts Options) {
	path := resolveConfigPath(opts.ConfigPath)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			_ = json.NewEncoder(w).Encode(map[string]any{
				"ok":     true,
				"path":   path,
				"config": config.New().AsDict(),
			})
			return
		}
		http.Error(w, fmt.Sprintf(`{"ok":false,"error":%q}`, err.Error()), http.StatusInternalServerError)
		return
	}
	var raw map[string]any
	if err := json.Unmarshal(data, &raw); err != nil {
		http.Error(w, fmt.Sprintf(`{"ok":false,"error":%q}`, "JSON 解析失敗: "+err.Error()), http.StatusBadRequest)
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]any{
		"ok":     true,
		"path":   path,
		"config": raw,
	})
}

func handleSaveLocalConfig(w http.ResponseWriter, r *http.Request, opts Options) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 5<<20))
	if err != nil {
		http.Error(w, `{"ok":false,"error":"讀取請求資料失敗"}`, http.StatusBadRequest)
		return
	}
	var payload struct {
		Config map[string]any `json:"config"`
	}
	if err := json.Unmarshal(body, &payload); err == nil && len(payload.Config) > 0 {
		// Wrapped in {"config": {...}}
	} else {
		if err := json.Unmarshal(body, &payload.Config); err != nil {
			http.Error(w, fmt.Sprintf(`{"ok":false,"error":%q}`, "無效的 JSON 格式: "+err.Error()), http.StatusBadRequest)
			return
		}
	}

	path := resolveConfigPath(opts.ConfigPath)
	formatted, err := json.MarshalIndent(payload.Config, "", "    ")
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"ok":false,"error":%q}`, "JSON 格式化失敗: "+err.Error()), http.StatusBadRequest)
		return
	}

	tmpFile := path + ".tmp"
	if err := os.WriteFile(tmpFile, append(formatted, '\n'), 0o644); err != nil {
		http.Error(w, fmt.Sprintf(`{"ok":false,"error":%q}`, "寫入暫存檔失敗: "+err.Error()), http.StatusInternalServerError)
		return
	}
	if err := os.Rename(tmpFile, path); err != nil {
		_ = os.Remove(tmpFile)
		http.Error(w, fmt.Sprintf(`{"ok":false,"error":%q}`, "更新設定檔失敗: "+err.Error()), http.StatusInternalServerError)
		return
	}

	if opts.GetConfig != nil {
		if cfg := opts.GetConfig(); cfg != nil {
			_ = cfg.Load(path)
		}
	}

	_ = json.NewEncoder(w).Encode(map[string]any{
		"ok":      true,
		"message": "設定已成功儲存至 " + filepath.Base(path),
		"path":    path,
	})
}

type testLoginRequest struct {
	FactoryID string `json:"factory_id"`
	BaseURL   string `json:"base_url"`
	LoginUser string `json:"login_user"`
	LoginPass string `json:"login_pass"`
}

func handleTestLogin(w http.ResponseWriter, r *http.Request, opts Options) {
	var req testLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"ok":false,"error":"無效的請求資料"}`, http.StatusBadRequest)
		return
	}
	req.FactoryID = strings.TrimSpace(req.FactoryID)
	req.BaseURL = strings.TrimSpace(req.BaseURL)
	if req.FactoryID == "" {
		req.FactoryID = "TEST"
	}
	if req.BaseURL == "" {
		http.Error(w, `{"ok":false,"error":"請提供有效的 base_url"}`, http.StatusBadRequest)
		return
	}

	if opts.TestLogin != nil {
		latencyMs, err := opts.TestLogin(req.FactoryID, req.BaseURL, req.LoginUser, req.LoginPass)
		if err != nil {
			_ = json.NewEncoder(w).Encode(map[string]any{"ok": false, "error": err.Error(), "latency_ms": latencyMs})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "latency_ms": latencyMs})
		return
	}

	start := time.Now()
	sc := scraper.New(req.FactoryID, req.BaseURL, req.LoginUser, req.LoginPass)
	err := sc.Login()
	latencyMs := time.Since(start).Milliseconds()
	if err != nil {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"ok":         false,
			"error":      err.Error(),
			"latency_ms": latencyMs,
		})
		return
	}

	_ = json.NewEncoder(w).Encode(map[string]any{
		"ok":         true,
		"latency_ms": latencyMs,
		"message":    fmt.Sprintf("登入成功 (耗時 %dms)", latencyMs),
	})
}

type scrapeNowRequest struct {
	FactoryID string `json:"factory_id"`
}

func handleScrapeNow(w http.ResponseWriter, r *http.Request, opts Options) {
	var req scrapeNowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"ok":false,"error":"無效的請求資料"}`, http.StatusBadRequest)
		return
	}
	req.FactoryID = strings.TrimSpace(req.FactoryID)
	if req.FactoryID == "" {
		http.Error(w, `{"ok":false,"error":"請指定 factory_id"}`, http.StatusBadRequest)
		return
	}

	if opts.ScrapeNow != nil {
		summary, zones, err := opts.ScrapeNow(req.FactoryID)
		if err != nil {
			_ = json.NewEncoder(w).Encode(map[string]any{"ok": false, "error": err.Error()})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "summary": summary, "zones": zones})
		return
	}

	path := resolveConfigPath(opts.ConfigPath)
	cfg := config.New()
	_ = cfg.Load(path)
	fac := cfg.Factory(req.FactoryID)
	if fac == nil {
		http.Error(w, fmt.Sprintf(`{"ok":false,"error":%q}`, "找不到廠區 "+req.FactoryID), http.StatusNotFound)
		return
	}
	baseURL, _ := fac["base_url"].(string)
	user, _ := fac["login_user"].(string)
	pass, _ := fac["login_pass"].(string)

	sc := scraper.New(req.FactoryID, baseURL, user, pass)
	summary, zones, err := sc.Fetch()
	if err != nil {
		_ = json.NewEncoder(w).Encode(map[string]any{"ok": false, "error": err.Error()})
		return
	}

	_ = json.NewEncoder(w).Encode(map[string]any{
		"ok":      true,
		"summary": summary,
		"zones":   zones,
	})
}

// Stop 停止伺服器（graceful，最多等 2 秒）。
func (s *Server) Stop() {
	if s == nil || s.srv == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_ = s.srv.Shutdown(ctx)
}

// OpenBrowserCommand 產生對應平台的開瀏覽器命令字串（測試用純函式）。
func OpenBrowserCommand(url string) string {
	switch runtime.GOOS {
	case "windows":
		return fmt.Sprintf("rundll32 url.dll,FileProtocolHandler %s", url)
	case "darwin":
		return fmt.Sprintf("open %s", url)
	default:
		return fmt.Sprintf("xdg-open %s", url)
	}
}

// OpenBrowserWithURL 以注入的執行函式開啟 URL（測試可替換；正式用 execCommand）。
func OpenBrowserWithURL(url string, run func(cmd string) error) error {
	return run(OpenBrowserCommand(url))
}

// OpenBrowser 以系統命令開啟 URL。
func OpenBrowser(url string) error {
	return OpenBrowserWithURL(url, func(cmd string) error {
		switch runtime.GOOS {
		case "windows":
			return exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
		case "darwin":
			return exec.Command("open", url).Start()
		default:
			return exec.Command("xdg-open", url).Start()
		}
	})
}
