package zoneidentity

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"solar_mqtt_go/internal/scraper"
)

func zone(serial string, position int) scraper.Zone {
	return scraper.Zone{Serial: serial, Position: position, ZoneID: position}
}

func ids(zones []scraper.Zone) []int {
	out := make([]int, len(zones))
	for i, z := range zones {
		out[i] = z.ZoneID
	}
	return out
}

func TestResolveZonesPersistsAcrossRestartAndReorder(t *testing.T) {
	path := filepath.Join(t.TempDir(), stateFilename)
	first, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	resolved, err := first.ResolveZones("KN", []scraper.Zone{zone("SN-A", 1), zone("SN-B", 2), zone("SN-C", 3)})
	if err != nil {
		t.Fatal(err)
	}
	want := []int{1, 2, 3}
	if got := ids(resolved); !equalInts(got, want) {
		t.Fatalf("first ids=%v want=%v", got, want)
	}

	second, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	resolved, err = second.ResolveZones("KN", []scraper.Zone{zone("SN-C", 1), zone("SN-A", 2), zone("SN-B", 3)})
	if err != nil {
		t.Fatal(err)
	}
	want = []int{3, 1, 2}
	if got := ids(resolved); !equalInts(got, want) {
		t.Fatalf("restart/reorder ids=%v want=%v", got, want)
	}
}

func TestResolveZonesKeepsMissingSerialAndDoesNotReuseID(t *testing.T) {
	path := filepath.Join(t.TempDir(), stateFilename)
	store, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := store.ResolveZones("KN", []scraper.Zone{zone("A", 1), zone("B", 2), zone("C", 3)}); err != nil {
		t.Fatal(err)
	}
	if _, err := store.ResolveZones("KN", []scraper.Zone{zone("A", 1), zone("C", 2)}); err != nil {
		t.Fatal(err)
	}

	restarted, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	resolved, err := restarted.ResolveZones("KN", []scraper.Zone{zone("D", 1), zone("B", 2)})
	if err != nil {
		t.Fatal(err)
	}
	if got := ids(resolved); !equalInts(got, []int{4, 2}) {
		t.Fatalf("new/reappeared ids=%v want=[4 2]", got)
	}
}

func TestBootstrapKeepsLatestSnapshotAndReservesHistoricalIDs(t *testing.T) {
	path := filepath.Join(t.TempDir(), stateFilename)
	store, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := store.Bootstrap("KN", map[string]int{"SN-A": 2, "SN-B": 5}, 9); err != nil {
		t.Fatal(err)
	}
	resolved, err := store.ResolveZones("KN", []scraper.Zone{zone("SN-B", 1), zone("SN-A", 2), zone("SN-C", 3)})
	if err != nil {
		t.Fatal(err)
	}
	if got := ids(resolved); !equalInts(got, []int{5, 2, 9}) {
		t.Fatalf("bootstrap ids=%v want=[5 2 9]", got)
	}
}

func TestExistingSidecarWinsOverBootstrap(t *testing.T) {
	path := filepath.Join(t.TempDir(), stateFilename)
	store, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := store.ResolveZones("KN", []scraper.Zone{zone("SN-A", 1)}); err != nil {
		t.Fatal(err)
	}

	// Reopen to prove authority comes from persisted sidecar, not merely the
	// current process's in-memory authoritative flag.
	store, err = Open(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := store.Bootstrap("KN", map[string]int{"SN-A": 7, "SN-B": 8}, 9); err != nil {
		t.Fatal(err)
	}
	resolved, err := store.ResolveZones("KN", []scraper.Zone{zone("SN-A", 1), zone("SN-B", 2)})
	if err != nil {
		t.Fatal(err)
	}
	if got := ids(resolved); !equalInts(got, []int{1, 2}) {
		t.Fatalf("sidecar authority ids=%v want=[1 2]", got)
	}
}

func TestResolveZonesWriteFailureDoesNotReturnUnpersistedAlias(t *testing.T) {
	dir := t.TempDir()
	store, err := Open(filepath.Join(dir, stateFilename))
	if err != nil {
		t.Fatal(err)
	}
	parentFile := filepath.Join(dir, "not-a-directory")
	if err := os.WriteFile(parentFile, []byte("x"), 0o600); err != nil {
		t.Fatal(err)
	}
	// Open succeeded with a valid empty registry. Force only the persistence
	// destination to fail so this exercises allocation rollback, not load error.
	store.path = filepath.Join(parentFile, stateFilename)
	if resolved, err := store.ResolveZones("KN", []scraper.Zone{zone("SN-A", 1)}); err == nil || resolved != nil {
		t.Fatalf("write failure resolved=%v err=%v, want nil/error", resolved, err)
	}
	store.path = filepath.Join(dir, stateFilename)
	resolved, err := store.ResolveZones("KN", []scraper.Zone{zone("SN-A", 1)})
	if err != nil {
		t.Fatal(err)
	}
	if resolved[0].ZoneID != 1 {
		t.Fatalf("failed allocation leaked into memory: zone_id=%d want=1", resolved[0].ZoneID)
	}
}

func TestOpenRejectsCorruptUnsupportedAndCollidingState(t *testing.T) {
	cases := map[string]string{
		"corrupt":     `{`,
		"unsupported": `{"version":2,"factories":{}}`,
		"collision": `{"version":1,"factories":{"KN":{"next_zone_id":3,"bindings":[` +
			`{"identity_key":"serial:A","zone_id":1},{"identity_key":"serial:B","zone_id":1}]}}}`,
		"duplicate-key": `{"version":1,"factories":{"KN":{"next_zone_id":3,"bindings":[` +
			`{"identity_key":"serial:A","zone_id":1},{"identity_key":"serial:A","zone_id":2}]}}}`,
	}
	for name, content := range cases {
		t.Run(name, func(t *testing.T) {
			path := filepath.Join(t.TempDir(), stateFilename)
			if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
				t.Fatal(err)
			}
			if _, err := Open(path); err == nil {
				t.Fatal("expected invalid state to fail")
			}
		})
	}
}

func TestSeriallessZoneWarnsAndRemainsPositionFallback(t *testing.T) {
	path := filepath.Join(t.TempDir(), stateFilename)
	store, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	var warnings []string
	orig := Warnf
	Warnf = func(format string, args ...any) { warnings = append(warnings, strings.TrimSpace(format)) }
	t.Cleanup(func() { Warnf = orig })

	resolved, err := store.ResolveZones("KN", []scraper.Zone{zone("", 3)})
	if err != nil {
		t.Fatal(err)
	}
	if len(resolved) != 1 || resolved[0].ZoneID <= 0 {
		t.Fatalf("serialless result=%v", resolved)
	}
	if len(warnings) != 1 {
		t.Fatalf("warnings=%v want one warning", warnings)
	}
}

func TestResolveZonesRejectsDuplicateIdentityInSameFetch(t *testing.T) {
	path := filepath.Join(t.TempDir(), stateFilename)
	store, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	if resolved, err := store.ResolveZones("KN", []scraper.Zone{
		zone("SN-A", 1), zone(" SN-A ", 2),
	}); err == nil || resolved != nil {
		t.Fatalf("duplicate live identity resolved=%v err=%v, want nil/error", resolved, err)
	}

	resolved, err := store.ResolveZones("KN", []scraper.Zone{zone("SN-B", 1)})
	if err != nil {
		t.Fatal(err)
	}
	if resolved[0].ZoneID != 1 {
		t.Fatalf("duplicate rejection leaked allocation: zone_id=%d want=1", resolved[0].ZoneID)
	}
}

func TestPersistedStateUsesPrivatePermissions(t *testing.T) {
	path := filepath.Join(t.TempDir(), stateFilename)
	store, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := store.ResolveZones("KN", []scraper.Zone{zone("SN-A", 1)}); err != nil {
		t.Fatal(err)
	}
	info, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	if got := info.Mode().Perm(); got != 0o600 {
		t.Fatalf("state mode=%o want=600", got)
	}
}

func TestSeriallessZoneRejectsInvalidPosition(t *testing.T) {
	store, err := Open(filepath.Join(t.TempDir(), stateFilename))
	if err != nil {
		t.Fatal(err)
	}
	if resolved, err := store.ResolveZones("KN", []scraper.Zone{zone("", 0)}); err == nil || resolved != nil {
		t.Fatalf("invalid serialless position resolved=%v err=%v, want nil/error", resolved, err)
	}
}

func equalInts(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
