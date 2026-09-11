package main

import (
	"os"
	"path/filepath"
	"testing"
)

func withMissingCollectorConfig(t *testing.T) {
	t.Helper()
	old := configPathFor
	missing := filepath.Join(t.TempDir(), "missing-solar-config.json")
	configPathFor = func() string { return missing }
	t.Cleanup(func() { configPathFor = old })
}

func TestDataPlaneCommandsFailClosedWhenConfigMissing(t *testing.T) {
	withMissingCollectorConfig(t)

	for _, args := range [][]string{
		nil,
		{"run"},
		{"once"},
		{"--once"},
		{"test-login"},
		{"dump-api"},
	} {
		if got := runCLI(args); got != 1 {
			t.Errorf("runCLI(%v) = %d, want 1", args, got)
		}
	}
}

func TestDataPlaneGateRejectsIncompleteFileWithoutUsingMergedDefaults(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "solar_config.json")
	if err := os.WriteFile(path, []byte(`{"factories":[{"factory_id":"KN","base_url":"http://solar.local","login_user":"u"}]}`), 0o600); err != nil {
		t.Fatal(err)
	}
	old := configPathFor
	configPathFor = func() string { return path }
	t.Cleanup(func() { configPathFor = old })

	called := false
	if got := runDataPlaneCommand("test", func() int { called = true; return 0 }); got != 1 {
		t.Fatalf("gate exit = %d, want 1", got)
	}
	if called {
		t.Fatal("data-plane command ran despite incomplete persisted factory config")
	}
}
