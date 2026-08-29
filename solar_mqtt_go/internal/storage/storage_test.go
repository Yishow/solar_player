package storage

import (
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"solar_mqtt_go/internal/scraper"
)

func suppressWarn(t *testing.T) {
	t.Helper()
	orig := Warnf
	Warnf = func(string, ...any) {}
	t.Cleanup(func() { Warnf = orig })
}

func fptr(v float64) *float64 { return &v }

func testSummary(total, today, month *float64) *scraper.Summary {
	return &scraper.Summary{TotalPowerKw: total, TodayMwh: today, MonthMwh: month}
}

func testZones() []scraper.Zone {
	return []scraper.Zone{
		{ZoneID: 1, Serial: "S1", Name: "區A", Position: 1, PowerKw: fptr(10.5), TodayKwh: fptr(20), MonthMwh: fptr(1.1), TotalMwh: fptr(99.9), CapacityKwp: fptr(50), TodayHours: fptr(0.4)},
		{ZoneID: 2, Serial: "S2", Name: "區B", Position: 2, PowerKw: nil, TodayKwh: nil, MonthMwh: nil, TotalMwh: nil, CapacityKwp: nil, TodayHours: nil},
	}
}

// TestSchemaCompat：schema 與 Python 版逐欄一致（含欄位順序、PK、索引），
// 且能開啟並寫入一個以 Python DDL 建立的既有資料庫。
func TestSchemaCompat(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "py_made.db")

	// 用 Python 版完全相同的 DDL 建立資料庫
	pyDB, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatal(err)
	}
	_, err = pyDB.Exec(pythonSchemaDDL)
	if err != nil {
		t.Fatalf("python DDL failed: %v", err)
	}
	if _, err := pyDB.Exec(
		`INSERT INTO summary VALUES ('2026-08-28T10:00:00','KN',1.5,2.5,3.5)`); err != nil {
		t.Fatal(err)
	}
	pyDB.Close()

	s := Open(dbPath, true)
	defer s.Close()
	if !s.Enabled() {
		t.Fatal("storage should be enabled for valid path")
	}
	// 開啟後不報 schema 錯誤，且可 append
	s.Record("KN", testSummary(fptr(2), fptr(3), fptr(4)), testZones(), "2026-08-28T11:00:00")
	rows, err := s.HistorySummary("", 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 2 {
		t.Fatalf("rows = %d, want 2 (python row + go row)", len(rows))
	}

	// 驗證欄位順序與 Python 一致
	raw, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatal(err)
	}
	defer raw.Close()
	checkColumns(t, raw, "summary", []string{"ts", "factory_id", "total_power_kw", "today_mwh", "month_mwh"})
	checkColumns(t, raw, "zone", []string{"ts", "factory_id", "zone_id", "serial", "name", "power_kw", "today_kwh", "month_mwh", "total_mwh", "capacity_kwp", "today_hours"})
	checkColumns(t, raw, "alert", []string{"ts", "factory_id", "level", "message"})
	checkPK(t, raw, "summary", []string{"ts", "factory_id"})
	checkPK(t, raw, "zone", []string{"ts", "factory_id", "zone_id"})
	checkIndex(t, raw, "idx_summary_factory_ts")
	checkIndex(t, raw, "idx_zone_factory_ts")
}

func checkColumns(t *testing.T, db *sql.DB, table string, want []string) {
	t.Helper()
	rows, err := db.Query("PRAGMA table_info(" + table + ")")
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var got []string
	for rows.Next() {
		var cid int
		var name, ctype string
		var notNull, pk int
		var dflt sql.NullString
		if err := rows.Scan(&cid, &name, &ctype, &notNull, &dflt, &pk); err != nil {
			t.Fatal(err)
		}
		got = append(got, name)
	}
	if len(got) != len(want) {
		t.Fatalf("%s columns = %v, want %v", table, got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("%s column %d = %s, want %s", table, i, got[i], want[i])
		}
	}
}

func checkPK(t *testing.T, db *sql.DB, table string, want []string) {
	t.Helper()
	rows, err := db.Query("PRAGMA table_info(" + table + ")")
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var got []string
	for rows.Next() {
		var cid, notNull, pk int
		var name, ctype string
		var dflt sql.NullString
		if err := rows.Scan(&cid, &name, &ctype, &notNull, &dflt, &pk); err != nil {
			t.Fatal(err)
		}
		if pk > 0 {
			got = append(got, name)
		}
	}
	// PK 順序依 pk 值排序；sqlite 回傳順序即欄位順序，此處 PK 均為前綴連續欄位
	if len(got) != len(want) {
		t.Fatalf("%s pk = %v, want %v", table, got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("%s pk %d = %s, want %s", table, i, got[i], want[i])
		}
	}
}

func checkIndex(t *testing.T, db *sql.DB, name string) {
	t.Helper()
	var n int
	if err := db.QueryRow(
		"SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name=?", name).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Errorf("index %s missing", name)
	}
}

// pythonSchemaDDL 與 Python solar/storage.py SCHEMA 完全相同。
const pythonSchemaDDL = `
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
`

func TestRecordInsertOrReplace(t *testing.T) {
	suppressWarn(t)
	s := Open(filepath.Join(t.TempDir(), "t.db"), true)
	defer s.Close()

	s.Record("KN", testSummary(fptr(1), fptr(2), fptr(3)), testZones(), "2026-08-28T10:00:00")
	// 同 key 再寫 → REPLACE
	s.Record("KN", testSummary(fptr(9), nil, fptr(3)), testZones(), "2026-08-28T10:00:00")

	rows, err := s.HistorySummary("KN", 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 {
		t.Fatalf("summary rows = %d, want 1 (replace)", len(rows))
	}
	if rows[0].TotalPowerKw == nil || *rows[0].TotalPowerKw != 9 {
		t.Errorf("replaced total_power_kw = %v", rows[0].TotalPowerKw)
	}
	if rows[0].TodayMwh != nil {
		t.Error("replaced today_mwh should be NULL")
	}

	// zone 同樣 replace（同 ts/factory/zone_id）
	var count int
	raw, _ := sql.Open("sqlite", s.Path())
	defer raw.Close()
	if err := raw.QueryRow("SELECT COUNT(*) FROM zone").Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 2 {
		t.Errorf("zone rows = %d, want 2 (replace not insert)", count)
	}
	// NULL 欄位寫入
	var powerNull sql.NullFloat64
	if err := raw.QueryRow(
		"SELECT power_kw FROM zone WHERE zone_id=2").Scan(&powerNull); err != nil {
		t.Fatal(err)
	}
	if powerNull.Valid {
		t.Errorf("zone2 power_kw should be NULL, got %v", powerNull.Float64)
	}
}

func TestRecordAlert(t *testing.T) {
	suppressWarn(t)
	s := Open(filepath.Join(t.TempDir(), "t.db"), true)
	defer s.Close()

	s.RecordAlert("KN", "WARN", "白天零功率")
	s.RecordAlert("CL", "INFO", "恢復發電")

	alerts, err := s.HistoryAlerts(10)
	if err != nil {
		t.Fatal(err)
	}
	if len(alerts) != 2 {
		t.Fatalf("alerts = %d", len(alerts))
	}
	// 同秒寫入的排序未定義（與 Python 一致僅 ORDER BY ts DESC），驗證兩筆內容都在
	seen := map[string]AlertRow{}
	for _, a := range alerts {
		seen[a.FactoryID] = a
	}
	if a, ok := seen["KN"]; !ok || a.Level != "WARN" || a.Message != "白天零功率" {
		t.Errorf("KN alert = %+v", a)
	}
	if a, ok := seen["CL"]; !ok || a.Level != "INFO" {
		t.Errorf("CL alert = %+v", a)
	}
}

func TestHistoryQuery(t *testing.T) {
	suppressWarn(t)
	s := Open(filepath.Join(t.TempDir(), "t.db"), true)
	defer s.Close()

	type rec struct {
		fid string
		ts  string
	}
	recs := []rec{
		{"KN", "2026-08-28T10:00:00"},
		{"CL", "2026-08-28T10:01:00"},
		{"KN", "2026-08-28T10:02:00"},
		{"KN", "2026-08-28T10:03:00"},
	}
	for _, r := range recs {
		s.Record(r.fid, testSummary(fptr(1), nil, nil), nil, r.ts)
	}
	// limit + DESC
	rows, _ := s.HistorySummary("", 2)
	if len(rows) != 2 {
		t.Fatalf("limit rows = %d", len(rows))
	}
	if rows[0].Ts != "2026-08-28T10:03:00" {
		t.Errorf("latest ts = %s", rows[0].Ts)
	}
	if rows[1].Ts != "2026-08-28T10:02:00" {
		t.Errorf("second ts = %s", rows[1].Ts)
	}
	// factory 過濾
	kn, _ := s.HistorySummary("KN", 10)
	if len(kn) != 3 {
		t.Errorf("KN rows = %d, want 3", len(kn))
	}
}

func TestRelativePathUsesProcessCWD(t *testing.T) {
	suppressWarn(t)
	dir := t.TempDir()
	oldWd, _ := os.Getwd()
	if err := os.Chdir(dir); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chdir(oldWd) })

	s := Open("relative_solar.db", true)
	defer s.Close()
	if !s.Enabled() {
		t.Fatal("relative path should open under CWD")
	}
	if _, err := os.Stat(filepath.Join(dir, "relative_solar.db")); err != nil {
		t.Fatalf("db not created relative to CWD: %v", err)
	}
}

func TestOpenFailureDisables(t *testing.T) {
	var warned bool
	orig := Warnf
	Warnf = func(string, ...any) { warned = true }
	t.Cleanup(func() { Warnf = orig })

	dir := t.TempDir()
	// 以「目錄」作為 db 路徑 → 開啟必敗
	badPath := filepath.Join(dir, "not_a_file")
	if err := os.Mkdir(badPath, 0o755); err != nil {
		t.Fatal(err)
	}
	s := Open(badPath, true)
	defer s.Close()
	if s.Enabled() {
		t.Fatal("storage should disable itself after open failure")
	}
	if !warned {
		t.Error("expected warning on open failure")
	}
	// 停用後寫入不得 panic
	s.Record("KN", testSummary(nil, nil, nil), nil, "")
	s.RecordAlert("KN", "WARN", "x")
}

func TestDisabledStorageNoFile(t *testing.T) {
	suppressWarn(t)
	dir := t.TempDir()
	s := Open(filepath.Join(dir, "off.db"), false)
	defer s.Close()
	if s.Enabled() {
		t.Fatal("enabled=false must stay disabled")
	}
	s.Record("KN", testSummary(fptr(1), nil, nil), nil, "")
	s.RecordAlert("KN", "WARN", "x")
	if _, err := os.Stat(filepath.Join(dir, "off.db")); !os.IsNotExist(err) {
		t.Error("disabled storage created a file")
	}
}

func TestClosedLedgerOperationsReturnStableUnavailable(t *testing.T) {
	s := Open(filepath.Join(t.TempDir(), "closed.db"), true)
	s.Close()
	s.Close()
	if s.Enabled() {
		t.Fatal("closed storage must report disabled")
	}
	if _, found, err := s.GetProcessedCommand("KN", "closed"); !errors.Is(err, ErrUnavailable) || found {
		t.Fatalf("closed lookup = found=%v err=%v, want unavailable", found, err)
	}
	if err := s.PutProcessedCommand(CommandRecord{Site: "KN", RequestID: "closed"}); !errors.Is(err, ErrUnavailable) {
		t.Fatalf("closed put = %v, want unavailable", err)
	}
	if err := s.PurgeProcessedCommands(time.Now()); !errors.Is(err, ErrUnavailable) {
		t.Fatalf("closed purge = %v, want unavailable", err)
	}
}

func TestConcurrentRecordSafe(t *testing.T) {
	suppressWarn(t)
	s := Open(filepath.Join(t.TempDir(), "t.db"), true)
	defer s.Close()

	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func(n int) {
			defer wg.Done()
			for j := 0; j < 10; j++ {
				s.Record("KN", testSummary(fptr(float64(n)), nil, nil), testZones(), "")
				s.RecordAlert("KN", "WARN", "w")
			}
		}(i)
	}
	wg.Wait()
	rows, err := s.HistorySummary("", 1000)
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) == 0 {
		t.Error("no rows written concurrently")
	}
}

func TestProcessedCommandLedgerRoundTripAndPurge(t *testing.T) {
	suppressWarn(t)
	s := Open(filepath.Join(t.TempDir(), "commands.db"), true)
	defer s.Close()

	old := time.Now().UTC().Add(-2 * time.Hour)
	recent := time.Now().UTC()
	for _, record := range []CommandRecord{
		{
			Site:             "KN",
			RequestID:        "old",
			Command:          "set",
			Status:           "accepted",
			Code:             "OK",
			Summary:          "command accepted",
			ChangedKeys:      []string{"interval"},
			OccurredAt:       old.Format(time.RFC3339Nano),
			ConfigRevision:   4,
			RestartScheduled: true,
			CompletedAt:      old,
		},
		{
			Site:           "KN",
			RequestID:      "recent",
			Command:        "set",
			Status:         "rejected",
			Code:           "UNKNOWN_FIELD",
			Summary:        "command rejected",
			ChangedKeys:    nil,
			OccurredAt:     recent.Format(time.RFC3339Nano),
			ConfigRevision: 4,
			CompletedAt:    recent,
		},
	} {
		if err := s.PutProcessedCommand(record); err != nil {
			t.Fatalf("put %s: %v", record.RequestID, err)
		}
	}

	got, found, err := s.GetProcessedCommand("KN", "old")
	if err != nil || !found {
		t.Fatalf("get old: found=%v err=%v", found, err)
	}
	if got.Command != "set" || got.Status != "accepted" || got.Code != "OK" || got.ConfigRevision != 4 || !got.RestartScheduled || len(got.ChangedKeys) != 1 || got.ChangedKeys[0] != "interval" {
		t.Errorf("ledger round trip = %+v", got)
	}

	if err := s.PurgeProcessedCommands(old.Add(time.Hour)); err != nil {
		t.Fatalf("purge: %v", err)
	}
	if _, found, err := s.GetProcessedCommand("KN", "old"); err != nil || found {
		t.Errorf("old record after purge: found=%v err=%v", found, err)
	}
	if _, found, err := s.GetProcessedCommand("KN", "recent"); err != nil || !found {
		t.Errorf("recent record after purge: found=%v err=%v", found, err)
	}
}
