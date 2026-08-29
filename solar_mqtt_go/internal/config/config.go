package config

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Warnf 警告輸出（可測試替換）。預設印到 stdout，對應 Python print("警告：...")。
var Warnf = func(format string, args ...any) {
	fmt.Printf("警告："+format+"\n", args...)
}

// DefaultConfigPath 回傳 executable 目錄旁的 solar_config.json 路徑。
// 與 CWD 無關（對應 Python 版「與程式同目錄」的 CONFIG_PATH 行為）。
func DefaultConfigPath() string {
	exe, err := os.Executable()
	if err != nil {
		return "solar_config.json"
	}
	return filepath.Join(filepath.Dir(exe), "solar_config.json")
}

// GLOBAL_SCHEMA 支援的全域欄位（對應 Python GLOBAL_SCHEMA）。
var globalSchema = map[string]string{
	"mqtt_host":        "string",
	"mqtt_port":        "int",
	"mqtt_prefix":      "string",
	"interval":         "int",
	"mosquitto_path":   "string",
	"mosquitto_config": "string",
	// HA Discovery
	"ha_discovery":        "bool",
	"ha_discovery_prefix": "string",
	// SQLite
	"sqlite_path":    "string",
	"sqlite_enabled": "bool",
	// Night pause
	"night_pause":       "bool",
	"night_lat":         "float",
	"night_lon":         "float",
	"night_padding_min": "int",
	// 異常告警
	"anomaly_daytime_zero_minutes": "int",
	// 心跳
	"heartbeat_interval": "int",
	// Retain
	"mqtt_retain_summary":   "bool",
	"mqtt_retain_zone":      "bool",
	"mqtt_retain_status":    "bool",
	"mqtt_retain_config":    "bool",
	"mqtt_retain_alert":     "bool",
	"mqtt_retain_heartbeat": "bool",
}

// FACTORY_SCHEMA 支援的廠別欄位。
var factorySchema = map[string]string{
	"factory_id": "string",
	"base_url":   "string",
	"login_user": "string",
	"login_pass": "string",
}

var factorySchemaKeys = []string{"factory_id", "base_url", "login_user", "login_pass"}

// unknownSecretGlobalKeys is intentionally an exact allowlist of legacy
// broker/control/TLS credential names. Site login fields remain factory data.
var unknownSecretGlobalKeys = map[string]struct{}{
	"broker_password":           {},
	"broker_username":           {},
	"control_password":          {},
	"control_username":          {},
	"mqtt_control_password":     {},
	"mqtt_control_username":     {},
	"mqtt_password":             {},
	"mqtt_username":             {},
	"mqtt_tls_ca":               {},
	"mqtt_tls_ca_file":          {},
	"mqtt_tls_cert":             {},
	"mqtt_tls_cert_file":        {},
	"mqtt_tls_client_cert":      {},
	"mqtt_tls_client_cert_file": {},
	"mqtt_tls_client_key":       {},
	"mqtt_tls_client_key_file":  {},
	"mqtt_tls_key":              {},
	"mqtt_tls_key_file":         {},
	"mqtt_tls_passphrase":       {},
	"mqtt_tls_private_key":      {},
	"tls_ca":                    {},
	"tls_ca_file":               {},
	"tls_cert":                  {},
	"tls_cert_file":             {},
	"tls_client_cert":           {},
	"tls_client_cert_file":      {},
	"tls_client_key":            {},
	"tls_client_key_file":       {},
	"tls_key":                   {},
	"tls_key_file":              {},
	"tls_passphrase":            {},
	"tls_private_key":           {},
}

// defaultGlobal 與 Python DEFAULT_GLOBAL 逐項一致。
func defaultGlobal() map[string]any {
	return map[string]any{
		"mqtt_host":                    "localhost",
		"mqtt_port":                    1883,
		"mqtt_prefix":                  "solar",
		"interval":                     60,
		"mosquitto_path":               "",
		"mosquitto_config":             "",
		"ha_discovery":                 false,
		"ha_discovery_prefix":          "homeassistant",
		"sqlite_path":                  "solar.db",
		"sqlite_enabled":               true,
		"night_pause":                  false,
		"night_lat":                    24.9576, // 中壢
		"night_lon":                    121.2254,
		"night_padding_min":            30,
		"anomaly_daytime_zero_minutes": 5,
		"heartbeat_interval":           30,
		"mqtt_retain_summary":          true,
		"mqtt_retain_zone":             true,
		"mqtt_retain_status":           true,
		"mqtt_retain_config":           true,
		"mqtt_retain_alert":            false,
		"mqtt_retain_heartbeat":        false,
	}
}

// defaultFactory 回傳預設單廠（KN）。
func defaultFactory() map[string]any {
	return map[string]any{
		"factory_id": "KN",
		"base_url":   "http://192.168.80.5",
		"login_user": "toyota",
		"login_pass": "toyota",
	}
}

// defaultFactories 回傳預設雙廠（KN 觀音廠、CL 中壢廠）。
func defaultFactories() []map[string]any {
	return []map[string]any{
		{
			"factory_id": "KN",
			"base_url":   "http://192.168.80.5",
			"login_user": "toyota",
			"login_pass": "toyota",
		},
		{
			"factory_id": "CL",
			"base_url":   "http://192.168.17.182",
			"login_user": "toyota",
			"login_pass": "toyota",
		},
	}
}

// ── Python 對等的型別強制 ──

// truthy 以 Python bool(value) 語意判斷非字串值的真偽。
func truthy(v any) bool {
	switch x := v.(type) {
	case nil:
		return false
	case bool:
		return x
	case float64:
		return x != 0
	case float32:
		return x != 0
	case int:
		return x != 0
	case int8:
		return x != 0
	case int16:
		return x != 0
	case int32:
		return x != 0
	case int64:
		return x != 0
	case uint:
		return x != 0
	case uint8:
		return x != 0
	case uint16:
		return x != 0
	case uint32:
		return x != 0
	case uint64:
		return x != 0
	case json.Number:
		f, err := strconv.ParseFloat(string(x), 64)
		return err == nil && f != 0
	case string:
		return x != ""
	case []any:
		return len(x) > 0
	case map[string]any:
		return len(x) > 0
	default:
		return true
	}
}

// coerceBool 對應 Python `if t is bool` 分支：
// 字串 → lower 後屬於 {1,true,yes,on} 為 true，其餘字串為 false（永不失敗、不警告）；
// 非字串 → Python truthiness。
func coerceBool(v any) bool {
	if s, ok := v.(string); ok {
		switch strings.ToLower(s) {
		case "1", "true", "yes", "on":
			return true
		}
		return false
	}
	return truthy(v)
}

// coerceInt 對應 Python int(value)：字串去空白後以 base 10 解析（"3.7" 失敗）、
// float 截斷、bool → 0/1；失敗回 ok=false（呼叫端警告並沿用原值）。
func coerceInt(v any) (int, bool) {
	switch x := v.(type) {
	case string:
		n, err := strconv.ParseInt(strings.TrimSpace(x), 10, 64)
		if err != nil {
			return 0, false
		}
		return int(n), true
	case float64:
		if math.IsNaN(x) || math.IsInf(x, 0) {
			return 0, false
		}
		return int(x), true
	case float32:
		if math.IsNaN(float64(x)) || math.IsInf(float64(x), 0) {
			return 0, false
		}
		return int(x), true
	case int:
		return x, true
	case int8:
		return int(x), true
	case int16:
		return int(x), true
	case int32:
		return int(x), true
	case int64:
		return int(x), int64(int(x)) == x
	case uint:
		return int(x), uint(int(x)) == x
	case uint8:
		return int(x), true
	case uint16:
		return int(x), true
	case uint32:
		return int(x), uint32(int(x)) == x
	case uint64:
		return int(x), uint64(int(x)) == x
	case bool:
		if x {
			return 1, true
		}
		return 0, true
	case nil:
		return 0, false
	case json.Number:
		n, err := strconv.ParseInt(strings.TrimSpace(string(x)), 10, 64)
		if err != nil {
			return 0, false
		}
		return int(n), int64(int(n)) == n
	default:
		return 0, false
	}
}

// coerceFloat 對應 Python float(value)：字串（含 nan/inf）、bool → 0/1、數值原樣；
// 失敗回 ok=false。
func coerceFloat(v any) (float64, bool) {
	switch x := v.(type) {
	case string:
		f, err := strconv.ParseFloat(strings.TrimSpace(x), 64)
		if err != nil {
			return 0, false
		}
		return f, true
	case float64:
		return x, true
	case int:
		return float64(x), true
	case bool:
		if x {
			return 1, true
		}
		return 0, true
	case nil:
		return 0, false
	default:
		return 0, false
	}
}

// coerceString 對應 Python str(value)：僅接受字串；其他型別失敗（Python str() 幾乎不失敗，
// 但設定欄位語意上僅字串有意義，對應「型別不符」警告路徑）。
func coerceString(v any) (string, bool) {
	s, ok := v.(string)
	return s, ok
}

// coerce 依欄位型別強制；ok=false 代表 Python 路徑中 coerced is None（警告並沿用原值）。
func coerce(kind string, v any) (any, bool) {
	switch kind {
	case "bool":
		return coerceBool(v), true
	case "int":
		n, ok := coerceInt(v)
		return n, ok
	case "float":
		f, ok := coerceFloat(v)
		return f, ok
	case "string":
		s, ok := coerceString(v)
		return s, ok
	}
	return nil, false
}

// Config 中央設定容器（對應 Python CONFIG 單例，改為顯式傳遞 + RWMutex）。
type Config struct {
	mu          sync.RWMutex
	saveMu      sync.Mutex
	remoteSetMu sync.Mutex
	globals     map[string]any
	factories   []map[string]any
	sourcePath  string
}

// StagedSave holds the Config save mutex while a temporary file waits for
// commit or discard. This lets a caller make another durable decision before
// replacing the live config file.
type StagedSave struct {
	path          string
	tmp           string
	config        []byte
	factoryID     string
	requestID     string
	saveMu        *sync.Mutex
	removePending func(string) error
	closed        bool
}

// CommitError reports whether the live config was replaced before an error.
// Applied distinguishes a cleanup failure (the new config is live) from a
// rename/write failure (the old config remains live).
type CommitError struct {
	Applied bool
	Err     error
}

func (e *CommitError) Error() string { return e.Err.Error() }
func (e *CommitError) Unwrap() error { return e.Err }

type pendingSave struct {
	RequestID string          `json:"request_id"`
	FactoryID string          `json:"factory_id"`
	Config    json.RawMessage `json:"config"`
}

// New 建立全預設的 Config。
func New() *Config {
	return &Config{
		globals:   defaultGlobal(),
		factories: []map[string]any{defaultFactory()},
	}
}

// ── 存取 ──

// Get 取得全域欄位原值（鎖外使用前先拷貝者自行負責）。
func (c *Config) Get(key string) any {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.globals[key]
}

// GetString 取得字串欄位，缺失時回傳 def。
func (c *Config) GetString(key, def string) string {
	if v, ok := c.Get(key).(string); ok {
		return v
	}
	return def
}

// GetInt 取得整數欄位，缺失或型別不符時回傳 def。
func (c *Config) GetInt(key string, def int) int {
	if v, ok := c.Get(key).(int); ok {
		return v
	}
	return def
}

// GetFloat 取得浮點欄位，缺失或型別不符時回傳 def。
func (c *Config) GetFloat(key string, def float64) float64 {
	if v, ok := c.Get(key).(float64); ok {
		return v
	}
	return def
}

// GetBool 取得布林欄位，缺失或型別不符時回傳 def。
func (c *Config) GetBool(key string, def bool) bool {
	if v, ok := c.Get(key).(bool); ok {
		return v
	}
	return def
}

// Factory 回傳指定廠別的內部 map（唯讀語意；呼叫端不得長期持有）。
func (c *Config) Factory(factoryID string) map[string]any {
	c.mu.RLock()
	defer c.mu.RUnlock()
	for _, f := range c.factories {
		if fid(f) == factoryID {
			return f
		}
	}
	return nil
}

func fid(f map[string]any) string {
	s, _ := f["factory_id"].(string)
	return s
}

// FactoryIDs 回傳所有廠別 ID。
func (c *Config) FactoryIDs() []string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	ids := make([]string, 0, len(c.factories))
	for _, f := range c.factories {
		ids = append(ids, fid(f))
	}
	return ids
}

// AsDict 回傳 {**globals, "factories": [...]} 的深拷貝。
func (c *Config) AsDict() map[string]any {
	c.mu.RLock()
	defer c.mu.RUnlock()
	out := make(map[string]any, len(c.globals)+1)
	for k, v := range c.globals {
		if isUnknownSecretGlobalKey(k) {
			continue
		}
		out[k] = deepCopyValue(v)
	}
	facs := make([]any, 0, len(c.factories))
	for _, f := range c.factories {
		facs = append(facs, deepCopyValue(f))
	}
	out["factories"] = facs
	return out
}

// ConfigPath returns the path most recently loaded, or the executable-local
// default when this Config has not loaded a file yet.
func (c *Config) ConfigPath() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if c.sourcePath != "" {
		return c.sourcePath
	}
	return DefaultConfigPath()
}

func deepCopyValue(v any) any {
	switch x := v.(type) {
	case map[string]any:
		m := make(map[string]any, len(x))
		for k, vv := range x {
			m[k] = deepCopyValue(vv)
		}
		return m
	case []any:
		s := make([]any, len(x))
		for i, vv := range x {
			s[i] = deepCopyValue(vv)
		}
		return s
	default:
		return v
	}
}

// ── 載入 ──

// Load 讀取 JSON 設定（檔案不存在時靜默保持現值；對應 Python 行為）。
func (c *Config) Load(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	var raw map[string]any
	if err := json.Unmarshal(data, &raw); err != nil {
		Warnf("讀取設定失敗：%v", err)
		return nil
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	c.sourcePath = path
	for key := range c.globals {
		if isUnknownSecretGlobalKey(key) {
			delete(c.globals, key)
		}
	}

	// 舊版單廠格式 → 記憶體內遷移為 factories 陣列（不改寫檔案）
	if _, has := raw["factories"]; !has {
		legacy := map[string]any{}
		found := false
		for _, k := range factorySchemaKeys {
			if v, ok := raw[k]; ok {
				legacy[k] = v
				delete(raw, k) // 對應 Python raw.pop(k)：遷移後不留在全域
				found = true
			}
		}
		if found {
			raw["factories"] = []any{legacy}
			fmt.Println("偵測到舊版單廠格式，已自動遷移為 factories 陣列")
		}
	}

	// 全域欄位
	for k, v := range raw {
		if k == "factories" {
			continue
		}
		if isUnknownSecretGlobalKey(k) {
			continue
		}
		kind, known := globalSchema[k]
		if known {
			coerced, ok := coerce(kind, v)
			if ok {
				c.globals[k] = coerced
			} else {
				if isSecretLikeField(k) {
					Warnf("config %s 型別不符（type=%T），沿用預設", k, v)
				} else {
					Warnf("config %s=%v 型別不符，沿用預設", k, v)
				}
			}
		} else {
			c.globals[k] = v // 未知 key 先收著
		}
	}

	// 各廠欄位
	factoriesRaw, _ := raw["factories"].([]any)
	if len(factoriesRaw) == 0 {
		Warnf("factories 為空或格式錯誤，沿用預設單廠")
		return nil
	}

	cleaned := make([]map[string]any, 0, len(factoriesRaw))
	for idx, item := range factoriesRaw {
		fac, ok := item.(map[string]any)
		if !ok {
			Warnf("factories[%d] 非物件，略過", idx)
			continue
		}
		merged := defaultFactory()
		for k, v := range fac {
			kind, known := factorySchema[k]
			if known {
				coerced, ok := coerce(kind, v)
				if ok {
					merged[k] = coerced
				} else {
					if isSecretLikeField(k) {
						Warnf("factories[%d].%s 型別不符（type=%T）", idx, k, v)
					} else {
						Warnf("factories[%d].%s=%v 型別不符", idx, k, v)
					}
				}
			} else {
				merged[k] = v
			}
		}
		cleaned = append(cleaned, merged)
	}

	if len(cleaned) > 0 {
		c.factories = cleaned
	}
	ids := make([]string, 0, len(c.factories))
	for _, f := range c.factories {
		ids = append(ids, fid(f))
	}
	fmt.Printf("載入設定：%d 廠 [%s]\n", len(c.factories), strings.Join(ids, ", "))
	return nil
}

// LoadDefault 以 DefaultConfigPath() 載入。
func (c *Config) LoadDefault() error {
	return c.Load(DefaultConfigPath())
}

// ── 儲存（原子） ──

// Save 以 tmp + rename 原子寫出（對應 Python os.replace）。
func (c *Config) Save(path string) error {
	c.saveMu.Lock()
	defer c.saveMu.Unlock()

	data, err := marshalIndent(c.AsDict())
	if err != nil {
		Warnf("寫入設定失敗：%v", err)
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		Warnf("寫入設定失敗：%v", err)
		if removeErr := os.Remove(tmp); removeErr != nil && !os.IsNotExist(removeErr) {
			Warnf("暫存設定清理失敗（%s）：%v", tmp, removeErr)
		}
		return err
	}
	if err := os.Rename(tmp, path); err != nil {
		Warnf("寫入設定失敗：%v", err)
		if removeErr := os.Remove(tmp); removeErr != nil && !os.IsNotExist(removeErr) {
			Warnf("暫存設定清理失敗（%s）：%v", tmp, removeErr)
		}
		return err
	}
	return nil
}

// Stage writes an atomic-save temporary file without replacing the live file.
// The returned StagedSave must be committed or discarded by the caller.
func (c *Config) Stage(path string) (*StagedSave, error) {
	return c.stage(path, "", "")
}

// StageRemoteSet stages a remote-set snapshot with recovery metadata.
func (c *Config) StageRemoteSet(path, factoryID, requestID string) (*StagedSave, error) {
	return c.stage(path, factoryID, requestID)
}

func (c *Config) stage(path, factoryID, requestID string) (*StagedSave, error) {
	c.saveMu.Lock()
	data, err := marshalIndent(c.AsDict())
	if err != nil {
		c.saveMu.Unlock()
		Warnf("寫入設定失敗：%v", err)
		return nil, err
	}
	pending := pendingSave{RequestID: requestID, FactoryID: factoryID, Config: data}
	pendingData, err := json.Marshal(pending)
	if err != nil {
		c.saveMu.Unlock()
		Warnf("寫入設定失敗：%v", err)
		return nil, err
	}
	tmp, err := writePrivateTemp(filepath.Dir(path), filepath.Base(path)+".pending-", pendingData)
	if err != nil {
		c.saveMu.Unlock()
		Warnf("寫入設定失敗：%v", err)
		return nil, err
	}
	return &StagedSave{path: path, tmp: tmp, config: data, factoryID: factoryID, requestID: requestID, saveMu: &c.saveMu, removePending: os.Remove}, nil
}

// StageDefault stages a save beside the executable's default config path.
func (c *Config) StageDefault() (*StagedSave, error) {
	return c.Stage(DefaultConfigPath())
}

// Commit atomically replaces the live config file and releases the save lock.
func (s *StagedSave) Commit() error {
	if s.closed {
		return nil
	}
	s.closed = true
	defer s.saveMu.Unlock()
	commitPath, err := writePrivateTemp(filepath.Dir(s.path), filepath.Base(s.path)+".commit-", s.config)
	if err != nil {
		return &CommitError{Err: err}
	}
	if err := os.Rename(commitPath, s.path); err != nil {
		if removeErr := os.Remove(commitPath); removeErr != nil {
			Warnf("暫存設定清理失敗（factory=%s）：%v", s.factoryID, removeErr)
		}
		return &CommitError{Err: err}
	}
	removePending := s.removePending
	if removePending == nil {
		removePending = os.Remove
	}
	if err := removePending(s.tmp); err != nil {
		Warnf("暫存設定清理失敗（factory=%s）：%v", s.factoryID, err)
		return &CommitError{Applied: true, Err: err}
	}
	return nil
}

// Discard removes the staged file and releases the save lock.
func (s *StagedSave) Discard() error {
	if s.closed {
		return nil
	}
	s.closed = true
	defer s.saveMu.Unlock()
	return os.Remove(s.tmp)
}

// FactoryID identifies the factory associated with a staged remote set.
func (s *StagedSave) FactoryID() string { return s.factoryID }

func writePrivateTemp(dir, prefix string, data []byte) (string, error) {
	f, err := os.CreateTemp(dir, prefix)
	if err != nil {
		return "", err
	}
	path := f.Name()
	cleanup := func() {
		if err := f.Close(); err != nil {
			Warnf("暫存設定關閉失敗（%s）：%v", path, err)
		}
		if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
			Warnf("暫存設定清理失敗（%s）：%v", path, err)
		}
	}
	if err := f.Chmod(0o600); err != nil {
		cleanup()
		return "", err
	}
	if _, err := f.Write(data); err != nil {
		cleanup()
		return "", err
	}
	if err := f.Close(); err != nil {
		if removeErr := os.Remove(path); removeErr != nil && !os.IsNotExist(removeErr) {
			Warnf("暫存設定清理失敗（%s）：%v", path, removeErr)
		}
		return "", err
	}
	return path, nil
}

// RecoverPending resolves staged remote-set snapshots before control handlers
// are registered. Accepted ledger records are committed; missing or rejected
// records are discarded. Any lookup, commit, or cleanup error blocks startup.
func (c *Config) RecoverPending(path string, lookup func(factoryID, requestID string) (status string, found bool, err error)) error {
	c.saveMu.Lock()
	defer c.saveMu.Unlock()

	dir := filepath.Dir(path)
	prefix := filepath.Base(path) + ".pending-"
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	type recoveryEntry struct {
		path    string
		name    string
		pending pendingSave
		modTime time.Time
		status  string
		found   bool
	}
	var pendingEntries []recoveryEntry
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasPrefix(entry.Name(), prefix) {
			continue
		}
		pendingPath := filepath.Join(dir, entry.Name())
		data, err := os.ReadFile(pendingPath)
		if err != nil {
			return err
		}
		var pending pendingSave
		if err := json.Unmarshal(data, &pending); err != nil || pending.RequestID == "" || pending.FactoryID == "" || len(pending.Config) == 0 {
			if err == nil {
				err = fmt.Errorf("pending metadata is incomplete")
			}
			return fmt.Errorf("read pending config %s: %w", entry.Name(), err)
		}
		info, err := entry.Info()
		if err != nil {
			return err
		}
		status, found, err := lookup(pending.FactoryID, pending.RequestID)
		if err != nil {
			return err
		}
		if found && status != "accepted" && status != "rejected" {
			return fmt.Errorf("pending config %s has unsupported ledger status %q", entry.Name(), status)
		}
		pendingEntries = append(pendingEntries, recoveryEntry{
			path: pendingPath, name: entry.Name(), pending: pending,
			modTime: info.ModTime(), status: status, found: found,
		})
	}
	sort.Slice(pendingEntries, func(i, j int) bool {
		if pendingEntries[i].modTime.Equal(pendingEntries[j].modTime) {
			return pendingEntries[i].name < pendingEntries[j].name
		}
		return pendingEntries[i].modTime.Before(pendingEntries[j].modTime)
	})
	changed := false
	for _, item := range pendingEntries {
		if !item.found || item.status != "accepted" {
			if err := os.Remove(item.path); err != nil {
				return err
			}
			continue
		}
		live, readErr := os.ReadFile(path)
		if readErr == nil && jsonValuesEqual(live, item.pending.Config) {
			if err := os.Remove(item.path); err != nil {
				return err
			}
			continue
		}
		if readErr != nil && !os.IsNotExist(readErr) {
			return readErr
		}
		commitPath, err := writePrivateTemp(dir, filepath.Base(path)+".commit-", item.pending.Config)
		if err != nil {
			return err
		}
		if err := os.Rename(commitPath, path); err != nil {
			if removeErr := os.Remove(commitPath); removeErr != nil {
				Warnf("暫存設定清理失敗（factory=%s）：%v", item.pending.FactoryID, removeErr)
			}
			return err
		}
		if err := os.Remove(item.path); err != nil {
			return err
		}
		changed = true
	}
	if changed {
		return c.Load(path)
	}
	return nil
}

func jsonValuesEqual(left, right []byte) bool {
	var leftValue, rightValue any
	if json.Unmarshal(left, &leftValue) != nil || json.Unmarshal(right, &rightValue) != nil {
		return false
	}
	return reflect.DeepEqual(leftValue, rightValue)
}

// SaveDefault 以 DefaultConfigPath() 儲存。
func (c *Config) SaveDefault() error {
	return c.Save(DefaultConfigPath())
}

// marshalIndent 與 Python json.dump(indent=2, ensure_ascii=False) 對齊：
// 縮排 2、不跳脫非 ASCII、不跳脫 HTML 字元。
func marshalIndent(v any) ([]byte, error) {
	var sb strings.Builder
	enc := json.NewEncoder(&sb)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	if err := enc.Encode(v); err != nil {
		return nil, err
	}
	return []byte(sb.String()), nil
}

// ── /set 指令套用 ──

// ApplySet 套用 /set 指令，回傳 (全域變更欄位, 該廠變更欄位)。
// payload 全域欄位寫進 globals；廠別欄位寫進對應 factory；未知欄位忽略；
// restart 為控制鍵，由此跳過（由呼叫端處理重啟）。
func (c *Config) ApplySet(factoryID string, payload map[string]any) (globalChanged, factoryChanged []string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	var target map[string]any
	found := false
	for _, f := range c.factories {
		if fid(f) == factoryID {
			target = f
			found = true
			break
		}
	}
	if !found {
		Warnf("/set 收到的 factory_id=%s 不在 factories 中", factoryID)
		return nil, nil
	}
	t := target

	for key, raw := range payload {
		if key == "restart" {
			continue
		}
		if kind, known := factorySchema[key]; known {
			coerced, ok := coerce(kind, raw)
			if !ok {
				if isSecretLikeField(key) {
					Warnf("/set %s.%s 型別不符（type=%T）", factoryID, key, raw)
				} else {
					Warnf("/set %s.%s=%v 型別不符", factoryID, key, raw)
				}
				continue
			}
			if !valuesEqual(t[key], coerced) {
				t[key] = coerced
				factoryChanged = append(factoryChanged, key)
			}
			continue
		}
		if kind, known := globalSchema[key]; known {
			coerced, ok := coerce(kind, raw)
			if !ok {
				Warnf("/set %s=%v 型別不符", key, raw)
				continue
			}
			if !valuesEqual(c.globals[key], coerced) {
				c.globals[key] = coerced
				globalChanged = append(globalChanged, key)
			}
			continue
		}
		// 未知欄位靜默忽略（避免污染）
	}
	return globalChanged, factoryChanged
}

// ApplyRemoteSet validates and atomically applies the intentionally narrow
// MQTT control allowlist. It never logs raw values or accepts factory/secret
// configuration fields.
func (c *Config) ApplyRemoteSet(factoryID string, changes map[string]any) ([]string, error) {
	if changes == nil {
		return nil, remoteSetError("INVALID_CHANGES")
	}

	type preparedChange struct {
		key   string
		value any
	}
	keys := make([]string, 0, len(changes))
	for key := range changes {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	prepared := make([]preparedChange, 0, len(keys))
	for _, key := range keys {
		kind, allowed := remoteSetSchema[key]
		if !allowed {
			return nil, remoteSetError(remoteSetCodeForKey(key))
		}
		value, ok := coerceRemote(kind, changes[key])
		if !ok || !remoteValueInRange(key, value) {
			return nil, remoteSetError("INVALID_VALUE")
		}
		prepared = append(prepared, preparedChange{key: key, value: value})
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	var target map[string]any
	for _, factory := range c.factories {
		if fid(factory) == factoryID {
			target = factory
			break
		}
	}
	if target == nil {
		return nil, remoteSetError("UNKNOWN_SITE")
	}

	changed := make([]string, 0, len(prepared))
	for _, change := range prepared {
		if !valuesEqual(c.globals[change.key], change.value) {
			changed = append(changed, change.key)
		}
	}
	for _, change := range prepared {
		c.globals[change.key] = change.value
	}
	return changed, nil
}

// RemoteSetTransaction serializes a remote configuration mutation through
// persistence and any subsequent rollback. Keep it open until the command's
// accepted/rejected result has been persisted.
type RemoteSetTransaction struct {
	cfg     *Config
	before  map[string]any
	changed []string
	closed  bool
}

// BeginRemoteSetTransaction applies a remote set while holding the shared
// transaction lock. The caller must Close the returned transaction after all
// persistence and rollback work is complete.
func (c *Config) BeginRemoteSetTransaction(factoryID string, changes map[string]any) (*RemoteSetTransaction, error) {
	c.remoteSetMu.Lock()
	before := make(map[string]any, len(changes))
	for key := range changes {
		before[key] = c.Get(key)
	}
	changed, err := c.ApplyRemoteSet(factoryID, changes)
	if err != nil {
		c.remoteSetMu.Unlock()
		return nil, err
	}
	return &RemoteSetTransaction{cfg: c, before: before, changed: changed}, nil
}

// Changed returns the global keys changed by the transaction.
func (tx *RemoteSetTransaction) Changed() []string {
	return append([]string(nil), tx.changed...)
}

// Rollback restores the pre-transaction values. The transaction remains open
// so its rollback persistence can still be serialized with other factories.
func (tx *RemoteSetTransaction) Rollback() {
	tx.cfg.RestoreRemoteSet(tx.before)
}

// Close releases the shared transaction lock.
func (tx *RemoteSetTransaction) Close() {
	if tx.closed {
		return
	}
	tx.closed = true
	tx.cfg.remoteSetMu.Unlock()
}

// RestoreRemoteSet restores global values captured before a failed persisted
// remote set. It is limited to the same allowlist as ApplyRemoteSet.
func (c *Config) RestoreRemoteSet(values map[string]any) {
	c.mu.Lock()
	defer c.mu.Unlock()
	for key, value := range values {
		if _, allowed := remoteSetSchema[key]; allowed {
			c.globals[key] = value
		}
	}
}

// remoteSetSchema is deliberately separate from globalSchema: local config
// support must not silently expand the remotely mutable surface.
var remoteSetSchema = map[string]string{
	"interval":                     "int",
	"night_pause":                  "bool",
	"night_padding_min":            "int",
	"anomaly_daytime_zero_minutes": "int",
	"heartbeat_interval":           "int",
	"mqtt_retain_summary":          "bool",
	"mqtt_retain_zone":             "bool",
	"mqtt_retain_status":           "bool",
	"mqtt_retain_alert":            "bool",
	"mqtt_retain_heartbeat":        "bool",
}

type remoteSetError string

func (e remoteSetError) Error() string { return string(e) }

func isSecretLikeField(key string) bool {
	lower := strings.ToLower(key)
	for _, marker := range []string{"pass", "password", "token", "cookie", "secret", "credential", "login"} {
		if strings.Contains(lower, marker) {
			return true
		}
	}
	return false
}

func isUnknownSecretGlobalKey(key string) bool {
	normalized := strings.ToLower(strings.ReplaceAll(key, "-", "_"))
	_, ok := unknownSecretGlobalKeys[normalized]
	return ok
}

func remoteSetCodeForKey(key string) string {
	lower := strings.ToLower(key)
	for _, marker := range []string{"pass", "password", "token", "cookie", "secret", "credential", "login", "base_url", "mqtt_host", "mqtt_port", "mqtt_prefix", "mosquitto", "path"} {
		if strings.Contains(lower, marker) {
			return "FORBIDDEN_FIELD"
		}
	}
	return "UNKNOWN_FIELD"
}

func coerceRemote(kind string, value any) (any, bool) {
	switch kind {
	case "bool":
		return coerceBool(value), true
	case "int":
		switch v := value.(type) {
		case float64:
			if math.IsNaN(v) || math.IsInf(v, 0) {
				return nil, false
			}
		case float32:
			if math.IsNaN(float64(v)) || math.IsInf(float64(v), 0) {
				return nil, false
			}
		}
		return coerceInt(value)
	}
	return nil, false
}

func remoteValueInRange(key string, value any) bool {
	n, ok := value.(int)
	if !ok {
		return true
	}
	switch key {
	case "interval", "heartbeat_interval":
		return n >= 1 && n <= 86400
	case "night_padding_min", "anomaly_daytime_zero_minutes":
		return n >= 0 && n <= 1440
	default:
		return true
	}
}

// valuesEqual 比較設定值（限 schema 產生的型別組合）。
func valuesEqual(a, b any) bool {
	switch av := a.(type) {
	case nil:
		return b == nil
	case bool:
		bv, ok := b.(bool)
		return ok && av == bv
	case int:
		switch bv := b.(type) {
		case int:
			return av == bv
		case float64:
			return float64(av) == bv
		}
		return false
	case float64:
		switch bv := b.(type) {
		case float64:
			return av == bv
		case int:
			return av == float64(bv)
		}
		return false
	case string:
		bv, ok := b.(string)
		return ok && av == bv
	default:
		return fmt.Sprint(a) == fmt.Sprint(b)
	}
}
