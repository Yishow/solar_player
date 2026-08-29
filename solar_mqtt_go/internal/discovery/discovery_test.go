package discovery

import (
	"encoding/json"
	"slices"
	"testing"

	"solar_mqtt_go/internal/scraper"
)

type record struct {
	topic   string
	payload string
	retain  bool
}

type fakePub struct {
	calls []record
}

func (f *fakePub) publish(topic, payload string, retain bool) bool {
	f.calls = append(f.calls, record{topic, payload, retain})
	return true
}

func zones(ids ...int) []scraper.Zone {
	out := make([]scraper.Zone, 0, len(ids))
	for _, id := range ids {
		out = append(out, scraper.Zone{ZoneID: id, Name: "區" + string(rune('A'+id-1))})
	}
	return out
}

func TestDiscoveryEntitySet(t *testing.T) {
	f := &fakePub{}
	n := PublishFactoryDiscovery(f.publish, "homeassistant", "solar", "KN", zones(1, 2))
	if n != 15 {
		t.Fatalf("published = %d, want 15 (3 summary + 6x2 zone)", n)
	}
	wantIDs := []string{
		"ez_solar_KN_total_power", "ez_solar_KN_today_energy", "ez_solar_KN_month_energy",
		"ez_solar_KN_zone1_power", "ez_solar_KN_zone1_today", "ez_solar_KN_zone1_month",
		"ez_solar_KN_zone1_total", "ez_solar_KN_zone1_capacity", "ez_solar_KN_zone1_hours",
		"ez_solar_KN_zone2_power", "ez_solar_KN_zone2_today", "ez_solar_KN_zone2_month",
		"ez_solar_KN_zone2_total", "ez_solar_KN_zone2_capacity", "ez_solar_KN_zone2_hours",
	}
	gotTopics := make([]string, 0, len(f.calls))
	for _, c := range f.calls {
		gotTopics = append(gotTopics, c.topic)
		if !c.retain {
			t.Errorf("discovery %s not retained", c.topic)
		}
	}
	wantTopics := make([]string, 0, len(wantIDs))
	for _, id := range wantIDs {
		wantTopics = append(wantTopics, "homeassistant/sensor/"+id+"/config")
	}
	for _, wt := range wantTopics {
		if !slices.Contains(gotTopics, wt) {
			t.Errorf("missing topic %s", wt)
		}
	}
}

func TestDiscoveryPayloadShape(t *testing.T) {
	f := &fakePub{}
	PublishFactoryDiscovery(f.publish, "homeassistant", "solar", "KN", zones(1))

	// summary sensor
	byTopic := map[string]record{}
	for _, c := range f.calls {
		byTopic[c.topic] = c
	}
	rec := byTopic["homeassistant/sensor/ez_solar_KN_total_power/config"]
	if rec.payload == "" {
		t.Fatal("summary sensor missing")
	}
	var cfg map[string]any
	if err := json.Unmarshal([]byte(rec.payload), &cfg); err != nil {
		t.Fatal(err)
	}
	checks := map[string]any{
		"name":                "KN 總功率",
		"unique_id":           "ez_solar_KN_total_power",
		"object_id":           "ez_solar_KN_total_power",
		"state_topic":         "solar/KN/total_power_kw",
		"value_template":      "{{ value_json.value }}",
		"unit_of_measurement": "kW",
		"device_class":        "power",
		"state_class":         "measurement",
	}
	for k, want := range checks {
		if cfg[k] != want {
			t.Errorf("%s = %v, want %v", k, cfg[k], want)
		}
	}
	dev, ok := cfg["device"].(map[string]any)
	if !ok {
		t.Fatal("device missing")
	}
	ids, ok := dev["identifiers"].([]any)
	if !ok || len(ids) != 1 || ids[0] != "ez_solar_KN" {
		t.Errorf("device identifiers = %v", dev["identifiers"])
	}
	if dev["name"] != "EZ-Solar KN" || dev["manufacturer"] != "Joseph-Tech / 國瑞汽車" || dev["model"] != "EZ-Solar Dashboard" {
		t.Errorf("device = %v", dev)
	}

	// zone capacity sensor：無 device_class，單位 kWp
	rec = byTopic["homeassistant/sensor/ez_solar_KN_zone1_capacity/config"]
	var capCfg map[string]any
	if err := json.Unmarshal([]byte(rec.payload), &capCfg); err != nil {
		t.Fatal(err)
	}
	if _, has := capCfg["device_class"]; has {
		t.Errorf("capacity should have no device_class: %v", capCfg["device_class"])
	}
	if capCfg["unit_of_measurement"] != "kWp" || capCfg["state_class"] != "measurement" {
		t.Errorf("capacity unit/state = %v/%v", capCfg["unit_of_measurement"], capCfg["state_class"])
	}
	if capCfg["state_topic"] != "solar/KN/zone/1/capacity_kwp" {
		t.Errorf("capacity state_topic = %v", capCfg["state_topic"])
	}
	if capCfg["name"] != "KN 區A 裝置容量" {
		t.Errorf("capacity name = %v", capCfg["name"])
	}

	// zone today sensor：total_increasing
	rec = byTopic["homeassistant/sensor/ez_solar_KN_zone1_today/config"]
	var todayCfg map[string]any
	if err := json.Unmarshal([]byte(rec.payload), &todayCfg); err != nil {
		t.Fatal(err)
	}
	if todayCfg["device_class"] != "energy" || todayCfg["state_class"] != "total_increasing" || todayCfg["unit_of_measurement"] != "kWh" {
		t.Errorf("today sensor = %v", todayCfg)
	}
}

func TestDiscoveryZoneNameFallback(t *testing.T) {
	f := &fakePub{}
	zs := []scraper.Zone{{ZoneID: 7, Name: ""}}
	PublishFactoryDiscovery(f.publish, "ha", "solar", "KN", zs)
	var cfg map[string]any
	if err := json.Unmarshal([]byte(f.calls[3].payload), &cfg); err != nil {
		t.Fatal(err)
	}
	if cfg["name"] != "KN Zone7 功率" {
		t.Errorf("fallback name = %v", cfg["name"])
	}
}

func TestDiscoveryRepublishesOnZoneReorder(t *testing.T) {
	f := &fakePub{}
	tr := NewTracker("homeassistant", "solar", "KN")

	tr.MaybePublish(f.publish, "solar", zones(1, 2))
	n1 := len(f.calls)
	if n1 != 15 {
		t.Fatalf("first publish = %d", n1)
	}
	// 相同清單 → 不重發
	tr.MaybePublish(f.publish, "solar", zones(1, 2))
	if len(f.calls) != n1 {
		t.Errorf("same list republished: %d -> %d", n1, len(f.calls))
	}
	// reorder → 重發
	tr.MaybePublish(f.publish, "solar", zones(2, 1))
	if len(f.calls) == n1 {
		t.Error("reorder did not republish")
	}
	n2 := len(f.calls)
	// 新增 → 重發
	tr.MaybePublish(f.publish, "solar", zones(2, 1, 3))
	if len(f.calls) == n2 {
		t.Error("addition did not republish")
	}
	n3 := len(f.calls)
	// 刪除 → 重發
	tr.MaybePublish(f.publish, "solar", zones(2))
	if len(f.calls) == n3 {
		t.Error("removal did not republish")
	}
}

func TestDiscoveryPrefixWaitsForSuccessfulRound(t *testing.T) {
	f := &fakePub{}
	tr := NewTracker("homeassistant", "solar", "KN")
	tr.MaybePublish(f.publish, "solar", zones(1))

	// prefix 變更：只標記 pending，不立即發佈
	tr.MarkPrefixChanged()
	if len(f.calls) != 9 {
		t.Fatalf("prefix change published immediately: %d", len(f.calls))
	}
	// 下一個成功 round 才重發
	tr.MaybePublish(f.publish, "newsolar", zones(1))
	if len(f.calls) != 18 {
		t.Fatalf("pending republish = %d, want 18", len(f.calls))
	}
	var cfg map[string]any
	if err := json.Unmarshal([]byte(f.calls[9].payload), &cfg); err != nil {
		t.Fatal(err)
	}
	if cfg["state_topic"] != "newsolar/KN/total_power_kw" {
		t.Errorf("republished state_topic = %v", cfg["state_topic"])
	}
}

func TestRemoveDiscovery(t *testing.T) {
	f := &fakePub{}
	RemoveFactoryDiscovery(f.publish, "homeassistant", "KN", []int{1, 2})
	if len(f.calls) != 15 {
		t.Fatalf("remove payloads = %d, want 15", len(f.calls))
	}
	for _, c := range f.calls {
		if c.payload != "" {
			t.Errorf("remove payload not empty: %s", c.payload)
		}
		if !c.retain {
			t.Error("remove must be retained")
		}
	}
	if f.calls[0].topic != "homeassistant/sensor/ez_solar_KN_total_power/config" {
		t.Errorf("first remove topic = %s", f.calls[0].topic)
	}
}
