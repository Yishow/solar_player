package storage

import (
	"path/filepath"
	"testing"

	"solar_mqtt_go/internal/scraper"
)

func TestLatestZoneIdentitySnapshotUsesLatestTimestampAndHistoricalFloor(t *testing.T) {
	st := Open(filepath.Join(t.TempDir(), "solar.db"), true)
	defer st.Close()

	st.Record("KN", &scraper.Summary{}, []scraper.Zone{
		{ZoneID: 7, Serial: "RETIRED"},
	}, "2026-09-10T09:00:00")
	st.Record("KN", &scraper.Summary{}, []scraper.Zone{
		{ZoneID: 1, Serial: "SN-A"},
		{ZoneID: 2, Serial: "SN-B"},
	}, "2026-09-11T09:00:00")

	bindings, nextFloor, err := st.LatestZoneIdentitySnapshot("KN")
	if err != nil {
		t.Fatal(err)
	}
	if len(bindings) != 2 || bindings["SN-A"] != 1 || bindings["SN-B"] != 2 {
		t.Fatalf("bindings=%v want SN-A=1 SN-B=2", bindings)
	}
	if nextFloor != 8 {
		t.Fatalf("nextFloor=%d want=8", nextFloor)
	}
}

func TestLatestZoneIdentitySnapshotRejectsDuplicateSerial(t *testing.T) {
	st := Open(filepath.Join(t.TempDir(), "solar.db"), true)
	defer st.Close()
	st.Record("KN", &scraper.Summary{}, []scraper.Zone{
		{ZoneID: 1, Serial: "SN-A"},
		{ZoneID: 2, Serial: "SN-A"},
	}, "2026-09-11T09:00:00")
	if _, _, err := st.LatestZoneIdentitySnapshot("KN"); err == nil {
		t.Fatal("duplicate serial should reject bootstrap snapshot")
	}
}

func TestLatestZoneIdentitySnapshotDisabledStorageIsOptional(t *testing.T) {
	st := Open(filepath.Join(t.TempDir(), "disabled.db"), false)
	defer st.Close()
	bindings, nextFloor, err := st.LatestZoneIdentitySnapshot("KN")
	if err != nil {
		t.Fatal(err)
	}
	if len(bindings) != 0 || nextFloor != 1 {
		t.Fatalf("bindings=%v nextFloor=%d want empty/1", bindings, nextFloor)
	}
}
