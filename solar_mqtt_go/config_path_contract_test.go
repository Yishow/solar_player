package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"solar_mqtt_go/internal/config"
)

func writeConfigFixture(t *testing.T, path string, values map[string]any) []byte {
	t.Helper()
	data, err := json.Marshal(values)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatal(err)
	}
	return data
}

func TestNewConfigUsesExecutableDefaultWhenCWDContainsDecoy(t *testing.T) {
	workingDir := t.TempDir()
	decoyPath := filepath.Join(workingDir, "solar_config.json")
	decoy := writeConfigFixture(t, decoyPath, map[string]any{
		"mqtt_host": "cwd-decoy",
		"mqtt_port": 1885,
		"factories": []map[string]any{{"factory_id": "DECOY"}},
	})
	originalWD, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(workingDir); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := os.Chdir(originalWD); err != nil {
			t.Errorf("restore working directory: %v", err)
		}
	})

	if got := configPathFor(); got != config.DefaultConfigPath() {
		t.Errorf("configPathFor() = %q, want executable config %q", got, config.DefaultConfigPath())
	}

	canonicalPath := filepath.Join(t.TempDir(), "solar_config.json")
	canonical := writeConfigFixture(t, canonicalPath, map[string]any{
		"mqtt_host": "executable-canonical",
		"mqtt_port": 1884,
		"factories": []map[string]any{{"factory_id": "CANONICAL"}},
	})
	oldConfigPathFor := configPathFor
	configPathFor = func() string { return canonicalPath }
	t.Cleanup(func() {
		configPathFor = oldConfigPathFor
		if configPathFor() != oldConfigPathFor() {
			t.Errorf("restore configPathFor: got %q, want %q", configPathFor(), oldConfigPathFor())
		}
	})

	cfg := newConfig()
	if got := cfg.ConfigPath(); got != canonicalPath {
		t.Errorf("newConfig path = %q, want executable config %q", got, canonicalPath)
	}
	if got := cfg.GetString("mqtt_host", ""); got != "executable-canonical" {
		t.Errorf("newConfig mqtt_host = %q, want executable-canonical", got)
	}
	if got := cfg.FactoryIDs(); len(got) != 1 || got[0] != "CANONICAL" {
		t.Errorf("newConfig factories = %v, want [CANONICAL]", got)
	}
	cfg.ApplySet("CANONICAL", map[string]any{"mqtt_host": "canonical-update"})
	if err := cfg.Save(configPathFor()); err != nil {
		t.Fatal(err)
	}

	decoyAfter, err := os.ReadFile(decoyPath)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(decoyAfter, decoy) {
		t.Errorf("CWD decoy was modified: before=%s after=%s", decoy, decoyAfter)
	}
	if got, err := os.ReadFile(canonicalPath); err != nil {
		t.Fatal(err)
	} else if bytes.Equal(got, canonical) || !bytes.Contains(got, []byte("canonical-update")) {
		t.Errorf("canonical config was not persisted through the injected path: before=%s after=%s", canonical, got)
	}
}
