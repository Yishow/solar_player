package service

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

	resolver, err := prepareZoneIdentityResolver(cfg, st)
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

	restarted, err := prepareZoneIdentityResolver(cfg, st)
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

	resolver, err := prepareZoneIdentityResolver(cfg, st)
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
