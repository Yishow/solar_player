package zoneidentity_test

import (
	"os"
	"path/filepath"
	"testing"

	"solar_mqtt_go/internal/config"
	"solar_mqtt_go/internal/scraper"
	"solar_mqtt_go/internal/storage"
	"solar_mqtt_go/internal/zoneidentity"
)

func zoneIdentityTestConfig(t *testing.T) (*config.Config, string) {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "solar_config.json")
	if err := os.WriteFile(path, []byte(`{"factories":[{"factory_id":"KN","base_url":"http://example.invalid","login_user":"u","login_pass":"p"}]}`), 0o600); err != nil {
		t.Fatal(err)
	}
	cfg := config.New()
	if err := cfg.Load(path); err != nil {
		t.Fatal(err)
	}
	return cfg, path
}

func TestPrepareZoneIdentityResolverPersistsBesideConfigWithSQLiteDisabled(t *testing.T) {
	cfg, configPath := zoneIdentityTestConfig(t)
	st := storage.Open(filepath.Join(t.TempDir(), "disabled.db"), false)
	defer st.Close()

	resolver, err := zoneidentity.Prepare(cfg, st)
	if err != nil {
		t.Fatal(err)
	}
	first, err := resolver.ResolveZones("KN", []scraper.Zone{
		{Serial: "A", Position: 1}, {Serial: "B", Position: 2},
	})
	if err != nil {
		t.Fatal(err)
	}
	statePath := zoneidentity.PathForConfig(configPath)
	if _, err := os.Stat(statePath); err != nil {
		t.Fatalf("sidecar not persisted beside config: %v", err)
	}

	restarted, err := zoneidentity.Prepare(cfg, st)
	if err != nil {
		t.Fatal(err)
	}
	second, err := restarted.ResolveZones("KN", []scraper.Zone{
		{Serial: "B", Position: 1}, {Serial: "A", Position: 2},
	})
	if err != nil {
		t.Fatal(err)
	}
	if first[0].ZoneID != second[1].ZoneID || first[1].ZoneID != second[0].ZoneID {
		t.Fatalf("restart mapping changed: first=%v second=%v", first, second)
	}
}

func TestPrepareZoneIdentityResolverExistingSidecarDoesNotDependOnHistory(t *testing.T) {
	cfg, configPath := zoneIdentityTestConfig(t)
	store, err := zoneidentity.Open(zoneidentity.PathForConfig(configPath))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := store.ResolveZones("KN", []scraper.Zone{{Serial: "A", Position: 1}}); err != nil {
		t.Fatal(err)
	}

	st := storage.Open(filepath.Join(t.TempDir(), "history.db"), true)
	defer st.Close()
	st.Record("KN", &scraper.Summary{}, []scraper.Zone{
		{ZoneID: 1, Serial: "BROKEN"}, {ZoneID: 2, Serial: "BROKEN"},
	}, "2026-09-11T10:00:00")

	resolver, err := zoneidentity.Prepare(cfg, st)
	if err != nil {
		t.Fatalf("authoritative sidecar should bypass conflicting history: %v", err)
	}
	resolved, err := resolver.ResolveZones("KN", []scraper.Zone{{Serial: "A", Position: 1}})
	if err != nil {
		t.Fatal(err)
	}
	if resolved[0].ZoneID != 1 {
		t.Fatalf("sidecar id=%d want=1", resolved[0].ZoneID)
	}
}

func TestPrepareRejectsNoncanonicalSidecarWithoutChangingBytes(t *testing.T) {
	cfg, configPath := zoneIdentityTestConfig(t)
	st := storage.Open(filepath.Join(t.TempDir(), "disabled.db"), false)
	defer st.Close()

	statePath := zoneidentity.PathForConfig(configPath)
	raw := []byte(`{"version":1,"factories":{"KN":{"next_zone_id":8,"bindings":[{"identity_key":"serial: A ","zone_id":7}]}}}`)
	if err := os.WriteFile(statePath, raw, 0o600); err != nil {
		t.Fatal(err)
	}
	store, err := zoneidentity.Prepare(cfg, st)
	if err == nil || store != nil {
		t.Fatalf("noncanonical sidecar store=%v err=%v, want nil/error", store, err)
	}
	got, err := os.ReadFile(statePath)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != string(raw) {
		t.Fatalf("sidecar bytes changed: got %q want %q", got, raw)
	}
}

func TestPrepareBootstrapsLatestHistoryAndHistoricalFloor(t *testing.T) {
	cfg, _ := zoneIdentityTestConfig(t)
	st := storage.Open(filepath.Join(t.TempDir(), "history.db"), true)
	defer st.Close()
	st.Record("KN", &scraper.Summary{}, []scraper.Zone{
		{ZoneID: 8, Serial: "RETIRED"},
	}, "2026-09-10T09:00:00")
	st.Record("KN", &scraper.Summary{}, []scraper.Zone{
		{ZoneID: 2, Serial: "A"}, {ZoneID: 5, Serial: "B"},
	}, "2026-09-11T09:00:00")

	resolver, err := zoneidentity.Prepare(cfg, st)
	if err != nil {
		t.Fatal(err)
	}
	resolved, err := resolver.ResolveZones("KN", []scraper.Zone{
		{Serial: "A", Position: 1}, {Serial: "B", Position: 2}, {Serial: "C", Position: 3},
	})
	if err != nil {
		t.Fatal(err)
	}
	if resolved[0].ZoneID != 2 || resolved[1].ZoneID != 5 || resolved[2].ZoneID < 9 {
		t.Fatalf("history bootstrap ids=%v want=[2 5 >=9]", []int{resolved[0].ZoneID, resolved[1].ZoneID, resolved[2].ZoneID})
	}
}
