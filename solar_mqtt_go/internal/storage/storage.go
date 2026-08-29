package storage

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	// modernc.org/sqlite：純 Go SQLite 驅動（免 cgo）
	_ "modernc.org/sqlite"

	"solar_mqtt_go/internal/scraper"
)

// ErrUnavailable is returned when the local ledger is disabled or closed.
var ErrUnavailable = errors.New("storage unavailable")

// Warnf 警告輸出（可測試替換）。
var Warnf = func(format string, args ...any) {
	fmt.Printf("警告："+format+"\n", args...)
}

// SCHEMA 保留 Python solar/storage.py 的資料表，另加 Go control ledger。
const SCHEMA = `
CREATE TABLE IF NOT EXISTS summary (
    ts              TEXT NOT NULL,
    factory_id      TEXT NOT NULL,
    total_power_kw  REAL,
    today_mwh       REAL,
    month_mwh       REAL,
    PRIMARY KEY (ts, factory_id)
);
CREATE INDEX IF NOT EXISTS idx_summary_factory_ts ON summary(factory_id, ts);

CREATE TABLE IF NOT EXISTS zone (
    ts            TEXT NOT NULL,
    factory_id    TEXT NOT NULL,
    zone_id       INTEGER NOT NULL,
    serial        TEXT,
    name          TEXT,
    power_kw      REAL,
    today_kwh     REAL,
    month_mwh     REAL,
    total_mwh     REAL,
    capacity_kwp  REAL,
    today_hours   REAL,
    PRIMARY KEY (ts, factory_id, zone_id)
);
CREATE INDEX IF NOT EXISTS idx_zone_factory_ts ON zone(factory_id, ts);

CREATE TABLE IF NOT EXISTS alert (
    ts          TEXT NOT NULL,
    factory_id  TEXT NOT NULL,
    level       TEXT NOT NULL,
    message     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS processed_command (
    site              TEXT NOT NULL,
    request_id        TEXT NOT NULL,
    command           TEXT NOT NULL,
    status            TEXT NOT NULL,
    code              TEXT NOT NULL,
    summary           TEXT NOT NULL,
    changed_keys      TEXT NOT NULL,
    occurred_at       TEXT NOT NULL,
    config_revision   INTEGER NOT NULL,
    restart_scheduled INTEGER NOT NULL,
    completed_at      TEXT NOT NULL,
    PRIMARY KEY (site, request_id)
);
CREATE INDEX IF NOT EXISTS idx_processed_command_completed_at ON processed_command(completed_at);
`

// SummaryRow history 查詢列。
type SummaryRow struct {
	Ts           string
	FactoryID    string
	TotalPowerKw *float64
	TodayMwh     *float64
	MonthMwh     *float64
}

// AlertRow history 查詢列。
type AlertRow struct {
	Ts        string
	FactoryID string
	Level     string
	Message   string
}

// CommandRecord 是 control command 的非敏感完成紀錄；不得保存原始 payload。
type CommandRecord struct {
	Site             string
	RequestID        string
	Command          string
	Status           string
	Code             string
	Summary          string
	ChangedKeys      []string
	OccurredAt       string
	ConfigRevision   int64
	RestartScheduled bool
	CompletedAt      time.Time
}

// Storage SQLite 本地備援。單一連線序列化寫入，支援並發 worker。
type Storage struct {
	path    string
	enabled bool
	db      *sql.DB
	mu      sync.Mutex
}

// Open 開啟（或建立）資料庫。開啟失敗時印警告並降級為停用（對應 Python 行為）。
func Open(path string, enabled bool) *Storage {
	s := &Storage{path: path, enabled: enabled}
	if !enabled {
		return s
	}
	if dir := filepath.Dir(path); dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			Warnf("SQLite 初始化失敗（%s）：%v，停用本地備援", path, err)
			s.enabled = false
			return s
		}
	}
	db, err := sql.Open("sqlite", path)
	if err != nil {
		Warnf("SQLite 初始化失敗（%s）：%v，停用本地備援", path, err)
		s.enabled = false
		return s
	}
	// 單一連線：序列化所有寫入，避免 SQLite 鎖競爭（對應 Python threading.Lock）
	db.SetMaxOpenConns(1)
	s.db = db
	if _, err := db.Exec(SCHEMA); err != nil {
		Warnf("SQLite 初始化失敗（%s）：%v，停用本地備援", path, err)
		db.Close()
		s.db = nil
		s.enabled = false
	}
	return s
}

// Path 回傳資料庫路徑。
func (s *Storage) Path() string { return s.path }

// Enabled 回傳是否啟用。
func (s *Storage) Enabled() bool {
	if s == nil {
		return false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.enabled && s.db != nil
}

// Close 關閉連線。
func (s *Storage) Close() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.db != nil {
		s.db.Close()
		s.db = nil
	}
}

// nowTS 對應 Python datetime.now().isoformat(timespec="seconds")。
func nowTS() string {
	return time.Now().Format("2006-01-02T15:04:05")
}

func nullable(v *float64) any {
	if v == nil {
		return nil
	}
	return *v
}

// Record 寫入一筆摘要與各區資料（INSERT OR REPLACE；ts 為空則取現在）。
func (s *Storage) Record(factoryID string, summary *scraper.Summary, zones []scraper.Zone, ts string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.enabled || s.db == nil {
		return
	}
	if ts == "" {
		ts = nowTS()
	}

	var totalPower, today, month any
	if summary != nil {
		totalPower, today, month = nullable(summary.TotalPowerKw), nullable(summary.TodayMwh), nullable(summary.MonthMwh)
	}
	if _, err := s.db.Exec(
		"INSERT OR REPLACE INTO summary VALUES (?,?,?,?,?)",
		ts, factoryID, totalPower, today, month,
	); err != nil {
		fmt.Printf("[%s] SQLite 寫入失敗：%v\n", factoryID, err)
		return
	}

	for _, z := range zones {
		if _, err := s.db.Exec(
			"INSERT OR REPLACE INTO zone VALUES (?,?,?,?,?,?,?,?,?,?,?)",
			ts, factoryID, z.ZoneID, z.Serial, z.Name,
			nullable(z.PowerKw), nullable(z.TodayKwh), nullable(z.MonthMwh),
			nullable(z.TotalMwh), nullable(z.CapacityKwp), nullable(z.TodayHours),
		); err != nil {
			fmt.Printf("[%s] SQLite 寫入失敗：%v\n", factoryID, err)
			return
		}
	}
}

// RecordAlert 寫入一筆告警。
func (s *Storage) RecordAlert(factoryID, level, message string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.enabled || s.db == nil {
		return
	}
	if _, err := s.db.Exec(
		"INSERT INTO alert VALUES (?,?,?,?)",
		nowTS(), factoryID, level, message,
	); err != nil {
		fmt.Printf("[%s] SQLite alert 寫入失敗：%v\n", factoryID, err)
	}
}

// HistorySummary 查詢摘要（ts DESC；factoryID 為空查全部）。
func (s *Storage) HistorySummary(factoryID string, limit int) ([]SummaryRow, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.enabled || s.db == nil {
		return nil, nil
	}

	var rows *sql.Rows
	var err error
	if factoryID != "" {
		rows, err = s.db.Query(
			"SELECT ts, factory_id, total_power_kw, today_mwh, month_mwh "+
				"FROM summary WHERE factory_id=? ORDER BY ts DESC LIMIT ?",
			factoryID, limit)
	} else {
		rows, err = s.db.Query(
			"SELECT ts, factory_id, total_power_kw, today_mwh, month_mwh "+
				"FROM summary ORDER BY ts DESC LIMIT ?", limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []SummaryRow
	for rows.Next() {
		var r SummaryRow
		var tp, td, mh sql.NullFloat64
		if err := rows.Scan(&r.Ts, &r.FactoryID, &tp, &td, &mh); err != nil {
			return nil, err
		}
		if tp.Valid {
			r.TotalPowerKw = &tp.Float64
		}
		if td.Valid {
			r.TodayMwh = &td.Float64
		}
		if mh.Valid {
			r.MonthMwh = &mh.Float64
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// HistoryAlerts 查詢告警（ts DESC）。
func (s *Storage) HistoryAlerts(limit int) ([]AlertRow, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.enabled || s.db == nil {
		return nil, nil
	}

	rows, err := s.db.Query(
		"SELECT ts, factory_id, level, message FROM alert ORDER BY ts DESC LIMIT ?", limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []AlertRow
	for rows.Next() {
		var r AlertRow
		if err := rows.Scan(&r.Ts, &r.FactoryID, &r.Level, &r.Message); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// GetProcessedCommand 讀取持久化 idempotency 紀錄。
func (s *Storage) GetProcessedCommand(site, requestID string) (*CommandRecord, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.enabled || s.db == nil {
		return nil, false, ErrUnavailable
	}

	var r CommandRecord
	var changedJSON, completed string
	var restart int
	err := s.db.QueryRow(
		`SELECT site, request_id, command, status, code, summary, changed_keys,
			occurred_at, config_revision, restart_scheduled, completed_at
		 FROM processed_command WHERE site=? AND request_id=?`, site, requestID,
	).Scan(
		&r.Site, &r.RequestID, &r.Command, &r.Status, &r.Code, &r.Summary,
		&changedJSON, &r.OccurredAt, &r.ConfigRevision, &restart, &completed,
	)
	if err == sql.ErrNoRows {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	if err := json.Unmarshal([]byte(changedJSON), &r.ChangedKeys); err != nil {
		return nil, false, err
	}
	r.RestartScheduled = restart != 0
	if r.CompletedAt, err = time.Parse(time.RFC3339Nano, completed); err != nil {
		return nil, false, err
	}
	return &r, true, nil
}

// PutProcessedCommand 寫入非敏感 control command 完成紀錄。
func (s *Storage) PutProcessedCommand(r CommandRecord) error {
	changedJSON, err := json.Marshal(r.ChangedKeys)
	if err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.enabled || s.db == nil {
		return ErrUnavailable
	}
	if r.CompletedAt.IsZero() {
		r.CompletedAt = time.Now().UTC()
	}
	_, err = s.db.Exec(
		`INSERT OR REPLACE INTO processed_command
		(site, request_id, command, status, code, summary, changed_keys, occurred_at,
		 config_revision, restart_scheduled, completed_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		r.Site, r.RequestID, r.Command, r.Status, r.Code, r.Summary, string(changedJSON),
		r.OccurredAt, r.ConfigRevision, boolInt(r.RestartScheduled), r.CompletedAt.UTC().Format(time.RFC3339Nano),
	)
	return err
}

// PurgeProcessedCommands 刪除超過 retention 的 ledger，維持儲存有界。
func (s *Storage) PurgeProcessedCommands(before time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.enabled || s.db == nil {
		return ErrUnavailable
	}
	_, err := s.db.Exec("DELETE FROM processed_command WHERE completed_at < ?", before.UTC().Format(time.RFC3339Nano))
	return err
}

func boolInt(v bool) int {
	if v {
		return 1
	}
	return 0
}
