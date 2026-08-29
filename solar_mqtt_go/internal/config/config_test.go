package config

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// suppressWarnings 關閉測試期間的警告輸出，回傳還原函式。
func suppressWarnings(t *testing.T) {
	t.Helper()
	orig := Warnf
	Warnf = func(string, ...any) {}
	t.Cleanup(func() { Warnf = orig })
}

func writeTempConfig(t *testing.T, content string) string {
	t.Helper()
	dir := t.TempDir()
	p := filepath.Join(dir, "solar_config.json")
	if err := os.WriteFile(p, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	return p
}

func TestConfigLoadDefaults(t *testing.T) {
	suppressWarnings(t)
	c := New()
	// 檔案不存在 → 全預設
	if err := c.Load(filepath.Join(t.TempDir(), "missing.json")); err != nil {
		t.Fatalf("missing file should not error: %v", err)
	}
	checks := []struct {
		key  string
		want any
	}{
		{"mqtt_host", "localhost"},
		{"mqtt_port", 1883},
		{"mqtt_prefix", "solar"},
		{"interval", 60},
		{"mosquitto_path", ""},
		{"mosquitto_config", ""},
		{"ha_discovery", false},
		{"ha_discovery_prefix", "homeassistant"},
		{"sqlite_path", "solar.db"},
		{"sqlite_enabled", true},
		{"night_pause", false},
		{"night_lat", 24.9576},
		{"night_lon", 121.2254},
		{"night_padding_min", 30},
		{"anomaly_daytime_zero_minutes", 5},
		{"heartbeat_interval", 30},
		{"mqtt_retain_summary", true},
		{"mqtt_retain_zone", true},
		{"mqtt_retain_status", true},
		{"mqtt_retain_config", true},
		{"mqtt_retain_alert", false},
		{"mqtt_retain_heartbeat", false},
	}
	for _, ck := range checks {
		if got := c.Get(ck.key); got != ck.want {
			t.Errorf("default %s = %v, want %v", ck.key, got, ck.want)
		}
	}
	if ids := c.FactoryIDs(); len(ids) != 1 || ids[0] != "KN" {
		t.Fatalf("default factories = %v, want [KN]", ids)
	}
	fac := c.Factory("KN")
	if fac == nil {
		t.Fatal("default factory KN missing")
	}
	if fac["base_url"] != "http://192.168.80.5" || fac["login_user"] != "toyota" || fac["login_pass"] != "toyota" {
		t.Errorf("default factory fields wrong: %v", fac)
	}
}

func TestSecretFactoryTypeMismatchDoesNotLogValue(t *testing.T) {
	canary := "CANARY-LOGIN-PASS-DO-NOT-LOG"
	var warnings []string
	orig := Warnf
	Warnf = func(format string, args ...any) {
		warnings = append(warnings, fmt.Sprintf(format, args...))
	}
	t.Cleanup(func() { Warnf = orig })

	c := New()
	path := writeTempConfig(t, `{"factories":[{"factory_id":"KN","login_pass":["CANARY-LOGIN-PASS-DO-NOT-LOG"]}]}`)
	if err := c.Load(path); err != nil {
		t.Fatal(err)
	}
	c.ApplySet("KN", map[string]any{"login_pass": []any{canary}})

	output := strings.Join(warnings, "\n")
	if strings.Contains(output, canary) {
		t.Fatalf("secret canary leaked in warning: %s", output)
	}
	if !strings.Contains(output, "login_pass") || !strings.Contains(output, "型別不符") {
		t.Fatalf("warning lost field/type diagnostics: %s", output)
	}
}

func TestLoadScrubsUnknownBrokerAndTLSSecretsButPreservesCompatibilityKeys(t *testing.T) {
	canary := "LEGACY-MQTT-CANARY-DO-NOT-PERSIST"
	path := writeTempConfig(t, `{"mqtt_username":"LEGACY-MQTT-CANARY-DO-NOT-PERSIST","mqtt_password":"LEGACY-MQTT-CANARY-DO-NOT-PERSIST","mqtt_tls_key":"LEGACY-MQTT-CANARY-DO-NOT-PERSIST","compatibility_note":"keep-me","factories":[{"factory_id":"KN","login_pass":"site-login-secret"}]}`)
	c := New()
	if err := c.Load(path); err != nil {
		t.Fatal(err)
	}
	if c.Get("mqtt_username") != nil || c.Get("mqtt_password") != nil || c.Get("mqtt_tls_key") != nil {
		t.Fatal("unknown broker/TLS secrets survived in memory")
	}
	if got := c.Get("compatibility_note"); got != "keep-me" {
		t.Fatalf("compatibility key = %v, want keep-me", got)
	}
	if got := c.Factory("KN")["login_pass"]; got != "site-login-secret" {
		t.Fatalf("site login_pass = %v, want preserved site credential", got)
	}

	dict, err := json.Marshal(c.AsDict())
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(dict), canary) {
		t.Fatalf("legacy secret survived AsDict: %s", dict)
	}
	if !strings.Contains(string(dict), "compatibility_note") || !strings.Contains(string(dict), "site-login-secret") {
		t.Fatalf("compatibility/site config missing from AsDict: %s", dict)
	}

	saved := filepath.Join(t.TempDir(), "saved.json")
	if err := c.Save(saved); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(saved)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(data), canary) {
		t.Fatalf("legacy secret survived Save: %s", data)
	}
}

func TestStagedRemoteSavesUseUniquePendingFiles(t *testing.T) {
	c := New()
	path := filepath.Join(t.TempDir(), "solar_config.json")
	first, err := c.StageRemoteSet(path, "KN", "first")
	if err != nil {
		t.Fatal(err)
	}
	firstPath := first.tmp
	if err := first.Discard(); err != nil {
		t.Fatal(err)
	}
	second, err := c.StageRemoteSet(path, "CL", "second")
	if err != nil {
		t.Fatal(err)
	}
	secondPath := second.tmp
	if firstPath == secondPath {
		t.Fatalf("staged saves reused pending path %q", firstPath)
	}
	info, err := os.Stat(secondPath)
	if err != nil {
		t.Fatal(err)
	}
	if got := info.Mode().Perm(); got != 0o600 {
		t.Fatalf("pending mode = %o, want 600", got)
	}
	if err := second.Discard(); err != nil {
		t.Fatal(err)
	}
	if matches, err := filepath.Glob(path + ".pending-*"); err != nil || len(matches) != 0 {
		t.Fatalf("pending files after cleanup = %v, err=%v", matches, err)
	}
}

func TestStagedRemoteSaveSurfacesDiscardAndCommitErrors(t *testing.T) {
	t.Run("discard", func(t *testing.T) {
		c := New()
		path := filepath.Join(t.TempDir(), "solar_config.json")
		staged, err := c.StageRemoteSet(path, "KN", "discard-error")
		if err != nil {
			t.Fatal(err)
		}
		if err := os.Remove(staged.tmp); err != nil {
			t.Fatal(err)
		}
		if err := staged.Discard(); err == nil {
			t.Fatal("discard should surface missing pending file")
		}
		if err := c.Save(path); err != nil {
			t.Fatalf("save lock was not released after discard error: %v", err)
		}
	})

	t.Run("commit-rename", func(t *testing.T) {
		c := New()
		dir := t.TempDir()
		path := filepath.Join(dir, "solar_config.json")
		staged, err := c.StageRemoteSet(path, "KN", "commit-error")
		if err != nil {
			t.Fatal(err)
		}
		if err := os.Mkdir(path, 0o755); err != nil {
			t.Fatal(err)
		}
		if err := staged.Commit(); err == nil {
			t.Fatal("commit should surface rename failure")
		} else {
			var commitErr *CommitError
			if !errors.As(err, &commitErr) || commitErr.Applied {
				t.Fatalf("rename failure outcome = %+v, want not applied", commitErr)
			}
		}
		if matches, err := filepath.Glob(path + ".pending-*"); err != nil || len(matches) != 1 {
			t.Fatalf("pending recovery file after commit failure = %v, err=%v", matches, err)
		}
	})

	t.Run("commit-cleanup", func(t *testing.T) {
		c := New()
		dir := t.TempDir()
		path := filepath.Join(dir, "solar_config.json")
		staged, err := c.StageRemoteSet(path, "KN", "cleanup-error")
		if err != nil {
			t.Fatal(err)
		}
		staged.removePending = func(string) error { return errors.New("forced pending cleanup failure") }
		if err := staged.Commit(); err == nil {
			t.Fatal("commit should surface pending cleanup failure")
		} else {
			var commitErr *CommitError
			if !errors.As(err, &commitErr) || !commitErr.Applied {
				t.Fatalf("cleanup failure outcome = %+v, want applied", commitErr)
			}
		}
		if _, err := os.Stat(path); err != nil {
			t.Fatalf("live config was not committed before cleanup failure: %v", err)
		}
		if err := c.Save(path); err != nil {
			t.Fatalf("save lock was not released after cleanup failure: %v", err)
		}
	})
}

func TestRecoverPendingKeepsPendingWhenLedgerLookupFails(t *testing.T) {
	c := New()
	dir := t.TempDir()
	path := filepath.Join(dir, "solar_config.json")
	pendingPath := path + ".pending-query-error"
	pending, err := json.Marshal(pendingSave{
		RequestID: "query-error",
		FactoryID: "KN",
		Config:    []byte(`{"interval":31}`),
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(pendingPath, pending, 0o600); err != nil {
		t.Fatal(err)
	}
	lookupErr := fmt.Errorf("ledger unavailable")
	if err := c.RecoverPending(path, func(string, string) (string, bool, error) {
		return "", false, lookupErr
	}); err != lookupErr {
		t.Fatalf("RecoverPending error = %v, want %v", err, lookupErr)
	}
	if _, err := os.Stat(pendingPath); err != nil {
		t.Fatalf("pending removed after lookup error: %v", err)
	}
}

func TestRecoverPendingCleansAcceptedSnapshotAlreadyLive(t *testing.T) {
	c := New()
	dir := t.TempDir()
	path := filepath.Join(dir, "solar_config.json")
	if err := c.Save(path); err != nil {
		t.Fatal(err)
	}
	oldTime := time.Now().Add(-time.Hour)
	if err := os.Chtimes(path, oldTime, oldTime); err != nil {
		t.Fatal(err)
	}
	pending, err := json.Marshal(pendingSave{
		RequestID: "already-live",
		FactoryID: "KN",
		Config:    mustJSON(t, c.AsDict()),
	})
	if err != nil {
		t.Fatal(err)
	}
	pendingPath := path + ".pending-already-live"
	if err := os.WriteFile(pendingPath, pending, 0o600); err != nil {
		t.Fatal(err)
	}
	if err := c.RecoverPending(path, func(string, string) (string, bool, error) {
		return "accepted", true, nil
	}); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(pendingPath); !os.IsNotExist(err) {
		t.Fatalf("already-live pending still exists, err=%v", err)
	}
	info, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	if !info.ModTime().Equal(oldTime) {
		t.Fatalf("live config was rewritten: mtime=%v want=%v", info.ModTime(), oldTime)
	}
}

func mustJSON(t *testing.T, value any) json.RawMessage {
	t.Helper()
	data, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	return data
}

func TestConfigPathIndependentOfCWD(t *testing.T) {
	dir := t.TempDir()
	origWd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(origWd)

	p1 := DefaultConfigPath()
	if err := os.Chdir(dir); err != nil {
		t.Fatal(err)
	}
	p2 := DefaultConfigPath()

	exe, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	exeDir := filepath.Dir(exe)
	if p1 != p2 {
		t.Errorf("DefaultConfigPath changed with CWD: %s vs %s", p1, p2)
	}
	if filepath.Base(p1) != "solar_config.json" {
		t.Errorf("DefaultConfigPath base = %s", filepath.Base(p1))
	}
	if filepath.Dir(p1) != exeDir {
		t.Errorf("DefaultConfigPath dir = %s, want exe dir %s", filepath.Dir(p1), exeDir)
	}
}

func TestConfigLegacyMigrationDoesNotSave(t *testing.T) {
	suppressWarnings(t)
	p := writeTempConfig(t, `{
		"mqtt_host": "broker.lan",
		"factory_id": "CL",
		"base_url": "http://10.0.0.5",
		"login_user": "u1",
		"login_pass": "p1"
	}`)
	c := New()
	if err := c.Load(p); err != nil {
		t.Fatal(err)
	}
	if ids := c.FactoryIDs(); len(ids) != 1 || ids[0] != "CL" {
		t.Fatalf("after migration factory ids = %v, want [CL]", ids)
	}
	fac := c.Factory("CL")
	if fac["base_url"] != "http://10.0.0.5" {
		t.Errorf("migrated base_url = %v", fac["base_url"])
	}
	// 全域欄位保留
	if c.Get("mqtt_host") != "broker.lan" {
		t.Errorf("mqtt_host = %v", c.Get("mqtt_host"))
	}
	// 檔案不可被 load 改寫（記憶體遷移）
	after, err := os.ReadFile(p)
	if err != nil {
		t.Fatal(err)
	}
	var raw map[string]any
	if err := json.Unmarshal(after, &raw); err != nil {
		t.Fatal(err)
	}
	if _, has := raw["factories"]; has {
		t.Error("load must not rewrite file: factories key appeared on disk")
	}
	if _, has := raw["factory_id"]; !has {
		t.Error("legacy factory_id key vanished from disk")
	}
}

func TestConfigCoercionPythonParity(t *testing.T) {
	// 字串布林：只有 1/true/yes/on（不分大小寫）為 true，其餘字串為 false 且不警告
	cases := []struct {
		name string
		json string
		key  string
		want any
	}{
		{"str-true-1", `{"ha_discovery": "1"}`, "ha_discovery", true},
		{"str-true-TRUE", `{"ha_discovery": "TRUE"}`, "ha_discovery", true},
		{"str-true-On", `{"ha_discovery": "On"}`, "ha_discovery", true},
		{"str-true-yes", `{"ha_discovery": "yes"}`, "ha_discovery", true},
		{"str-false-off", `{"ha_discovery": "off"}`, "ha_discovery", false},
		{"str-false-banana", `{"ha_discovery": "banana"}`, "ha_discovery", false},
		{"num-bool-0", `{"ha_discovery": 0}`, "ha_discovery", false},
		{"num-bool-2", `{"ha_discovery": 2}`, "ha_discovery", true},
		{"num-bool-float0", `{"ha_discovery": 0.0}`, "ha_discovery", false},
		{"null-bool", `{"ha_discovery": null}`, "ha_discovery", false},
		{"bool-stays", `{"mqtt_retain_summary": false}`, "mqtt_retain_summary", false},
		// int 欄位
		{"int-from-str", `{"interval": "120"}`, "interval", 120},
		{"int-truncate", `{"interval": 3.7}`, "interval", 3},
		{"int-neg-truncate", `{"interval": -3.7}`, "interval", -3},
		{"int-bool", `{"interval": true}`, "interval", 1},
		// float 欄位
		{"float-from-str", `{"night_lat": "25.5"}`, "night_lat", 25.5},
		{"float-from-bool", `{"night_lat": true}`, "night_lat", 1.0},
		{"float-from-int", `{"night_lat": 25}`, "night_lat", 25.0},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			suppressWarnings(t)
			c := New()
			p := writeTempConfig(t, tc.json)
			if err := c.Load(p); err != nil {
				t.Fatal(err)
			}
			if got := c.Get(tc.key); got != tc.want {
				t.Errorf("%s = %v (%T), want %v (%T)", tc.key, got, got, tc.want, tc.want)
			}
		})
	}

	// 型別不符 → 沿用預設並警告
	badCases := []struct {
		name  string
		json  string
		key   string
		deflt any
	}{
		{"int-bad-str", `{"interval": "abc"}`, "interval", 60},
		{"int-null", `{"interval": null}`, "interval", 60},
		{"int-list", `{"interval": [1]}`, "interval", 60},
		{"float-bad-str", `{"night_lat": "abc"}`, "night_lat", 24.9576},
		{"float-null", `{"night_lon": null}`, "night_lon", 121.2254},
	}
	for _, tc := range badCases {
		t.Run(tc.name, func(t *testing.T) {
			var warned bool
			orig := Warnf
			Warnf = func(string, ...any) { warned = true }
			defer func() { Warnf = orig }()

			c := New()
			p := writeTempConfig(t, tc.json)
			if err := c.Load(p); err != nil {
				t.Fatal(err)
			}
			if got := c.Get(tc.key); got != tc.deflt {
				t.Errorf("%s = %v, want default %v", tc.key, got, tc.deflt)
			}
			if !warned {
				t.Errorf("expected a warning for %s", tc.key)
			}
		})
	}
}

func TestConfigUnknownKeyRoundTrip(t *testing.T) {
	suppressWarnings(t)
	p := writeTempConfig(t, `{
		"mqtt_host": "h1",
		"custom_note": "keep me",
		"factories": [
			{"factory_id": "KN", "custom_flag": 7}
		]
	}`)
	c := New()
	if err := c.Load(p); err != nil {
		t.Fatal(err)
	}
	if c.Get("custom_note") != "keep me" {
		t.Errorf("unknown global key lost: %v", c.Get("custom_note"))
	}
	fac := c.Factory("KN")
	if fac["custom_flag"] != float64(7) && fac["custom_flag"] != 7 {
		t.Errorf("unknown factory key lost: %v", fac["custom_flag"])
	}

	out := filepath.Join(t.TempDir(), "out.json")
	if err := c.Save(out); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(out)
	if err != nil {
		t.Fatal(err)
	}
	var raw map[string]any
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatal(err)
	}
	if raw["custom_note"] != "keep me" {
		t.Errorf("unknown global key not written back: %v", raw["custom_note"])
	}
	facs, ok := raw["factories"].([]any)
	if !ok || len(facs) != 1 {
		t.Fatalf("factories not written back: %v", raw["factories"])
	}
	f0 := facs[0].(map[string]any)
	if f0["custom_flag"] != float64(7) {
		t.Errorf("unknown factory key not written back: %v", f0["custom_flag"])
	}
	if f0["factory_id"] != "KN" {
		t.Errorf("factory_id wrong: %v", f0["factory_id"])
	}
}

func TestConfigAtomicSave(t *testing.T) {
	suppressWarnings(t)
	c := New()
	out := filepath.Join(t.TempDir(), "solar_config.json")
	if err := c.Save(out); err != nil {
		t.Fatal(err)
	}
	// 無殘留 tmp 檔
	entries, err := os.ReadDir(filepath.Dir(out))
	if err != nil {
		t.Fatal(err)
	}
	for _, e := range entries {
		if filepath.Ext(e.Name()) == ".tmp" {
			t.Errorf("tmp file left behind: %s", e.Name())
		}
	}
	// 存檔後可重新載入且值一致
	c2 := New()
	if err := c2.Load(out); err != nil {
		t.Fatal(err)
	}
	for _, k := range []string{"mqtt_host", "mqtt_port", "mqtt_prefix", "interval", "sqlite_path"} {
		if c.Get(k) != c2.Get(k) {
			t.Errorf("round-trip %s: %v != %v", k, c.Get(k), c2.Get(k))
		}
	}
	if ids := c2.FactoryIDs(); len(ids) != 1 || ids[0] != "KN" {
		t.Errorf("round-trip factories = %v", ids)
	}
	// 儲存內容為合法 JSON 且 factories 為陣列
	data, err := os.ReadFile(out)
	if err != nil {
		t.Fatal(err)
	}
	var raw map[string]any
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("saved file is not valid JSON: %v", err)
	}
	if _, ok := raw["factories"].([]any); !ok {
		t.Error("factories must be an array in saved JSON")
	}
}

func TestConfigSaveReportsWriteAndRenameErrors(t *testing.T) {
	suppressWarnings(t)
	c := New()
	missingParent := filepath.Join(t.TempDir(), "missing", "solar_config.json")
	if err := c.Save(missingParent); err == nil {
		t.Fatal("save into a missing parent must report the write error")
	}
	targetDir := t.TempDir()
	if err := c.Save(targetDir); err == nil {
		t.Fatal("save over a directory must report the rename error")
	}
}

func TestApplyRemoteSetUsesNarrowAllowlistAndIsAtomic(t *testing.T) {
	suppressWarnings(t)
	c := New()

	changed, err := c.ApplyRemoteSet("KN", map[string]any{
		"interval":    30,
		"night_pause": true,
	})
	if err != nil {
		t.Fatalf("valid remote set failed: %v", err)
	}
	if got, want := changed, []string{"interval", "night_pause"}; len(got) != len(want) || got[0] != want[0] || got[1] != want[1] {
		t.Errorf("changed keys = %v, want %v", got, want)
	}
	if c.GetInt("interval", 0) != 30 || !c.GetBool("night_pause", false) {
		t.Errorf("valid remote set not applied: interval=%v night_pause=%v", c.Get("interval"), c.Get("night_pause"))
	}

	if _, err := c.ApplyRemoteSet("KN", map[string]any{
		"interval":   45,
		"login_pass": "secret",
	}); err == nil || err.Error() != "FORBIDDEN_FIELD" {
		t.Fatalf("credential change error = %v, want FORBIDDEN_FIELD", err)
	}
	if c.GetInt("interval", 0) != 30 {
		t.Error("atomic rejection applied interval before forbidden field")
	}

	if _, err := c.ApplyRemoteSet("KN", map[string]any{
		"interval":   45,
		"future_key": true,
	}); err == nil || err.Error() != "UNKNOWN_FIELD" {
		t.Fatalf("unknown change error = %v, want UNKNOWN_FIELD", err)
	}
	if c.GetInt("interval", 0) != 30 {
		t.Error("atomic rejection applied interval before unknown field")
	}

	t.Run("fractional interval uses Python int truncation", func(t *testing.T) {
		if _, err := c.ApplyRemoteSet("KN", map[string]any{"interval": 3.5}); err != nil {
			t.Fatalf("error = %v, want truncated value", err)
		}
		if got := c.GetInt("interval", 0); got != 3 {
			t.Fatalf("interval = %d, want 3", got)
		}
	})
	for _, tc := range []struct {
		name  string
		value any
	}{
		{"zero interval", 0},
		{"negative interval", -1},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := c.ApplyRemoteSet("KN", map[string]any{"interval": tc.value}); err == nil || err.Error() != "INVALID_VALUE" {
				t.Fatalf("error = %v, want INVALID_VALUE", err)
			}
		})
	}
}

func TestApplyRemoteSetUsesPythonCoercionTruthTable(t *testing.T) {
	cases := []struct {
		name      string
		key       string
		value     any
		want      any
		wantError string
	}{
		{name: "numeric string", key: "interval", value: "90", want: 90},
		{name: "numeric string with whitespace", key: "interval", value: " 90 ", want: 90},
		{name: "boolean yes", key: "night_pause", value: "yes", want: true},
		{name: "boolean off", key: "night_pause", value: "off", want: false},
		{name: "boolean banana", key: "night_pause", value: "banana", want: false},
		{name: "numeric zero boolean", key: "night_pause", value: float64(0), want: false},
		{name: "numeric nonzero boolean", key: "night_pause", value: float64(2), want: true},
		{name: "word is not an integer", key: "interval", value: "yes", wantError: "INVALID_VALUE"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			c := New()
			_, err := c.ApplyRemoteSet("KN", map[string]any{tc.key: tc.value})
			if tc.wantError != "" {
				if err == nil || err.Error() != tc.wantError {
					t.Fatalf("error = %v, want %s", err, tc.wantError)
				}
				return
			}
			if err != nil {
				t.Fatalf("remote set failed: %v", err)
			}
			if got := c.Get(tc.key); got != tc.want {
				t.Fatalf("%s = %#v, want %#v", tc.key, got, tc.want)
			}
		})
	}
}
