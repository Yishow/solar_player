// Package discovery 實作 Home Assistant MQTT Discovery（對應 Python solar/discovery.py）。
// 每廠 3 個 summary sensor、每區 6 個 sensor；發佈 retained JSON config，
// HA 自動建立/移除 entity。
package discovery

import (
	"encoding/json"
	"fmt"
	"slices"
	"strings"

	"solar_mqtt_go/internal/scraper"
)

// Publisher 發佈 callback（topic, payload, retain）。
type Publisher func(topic, payload string, retain bool) bool

// devicePayload 對應 Python _device()。
func devicePayload(factoryID string) map[string]any {
	return map[string]any{
		"identifiers":  []string{fmt.Sprintf("ez_solar_%s", factoryID)},
		"name":         fmt.Sprintf("EZ-Solar %s", factoryID),
		"manufacturer": "Joseph-Tech / 國瑞汽車",
		"model":        "EZ-Solar Dashboard",
	}
}

// sensorConfig 對應 Python _sensor_config()；key 順序與 Python dict 一致。
type sensorConfig struct {
	Name          string         `json:"name"`
	UniqueID      string         `json:"unique_id"`
	ObjectID      string         `json:"object_id"`
	StateTopic    string         `json:"state_topic"`
	ValueTemplate string         `json:"value_template"`
	Device        map[string]any `json:"device"`

	Unit      string `json:"unit_of_measurement,omitempty"`
	DeviceCls string `json:"device_class,omitempty"`
	StateCls  string `json:"state_class,omitempty"`
	Icon      string `json:"icon,omitempty"`
}

func sensorConfigNew(factoryID, objectID, name, stateTopic, unit, deviceClass, stateClass string) sensorConfig {
	return sensorConfig{
		Name:          name,
		UniqueID:      objectID,
		ObjectID:      objectID,
		StateTopic:    stateTopic,
		ValueTemplate: "{{ value_json.value }}",
		Device:        devicePayload(factoryID),
		Unit:          unit,
		DeviceCls:     deviceClass,
		StateCls:      stateClass,
	}
}

// zoneMetric 對應 Python metrics 表。
type zoneMetric struct {
	suffix    string
	zh        string
	topicKey  string
	unit      string
	deviceCls string
	stateCls  string
}

var zoneMetrics = []zoneMetric{
	{"power", "功率", "power_kw", "kW", "power", "measurement"},
	{"today", "今日發電", "today_kwh", "kWh", "energy", "total_increasing"},
	{"month", "本月發電", "month_mwh", "MWh", "energy", "total_increasing"},
	{"total", "累計發電", "total_mwh", "MWh", "energy", "total_increasing"},
	{"capacity", "裝置容量", "capacity_kwp", "kWp", "", "measurement"},
	{"hours", "今日有效時數", "today_hours", "h", "", "measurement"},
}

// marshalConfig 序列化（ensure_ascii=False 對齊：不跳脫中文與 HTML 字元）。
func marshalConfig(c sensorConfig) string {
	var sb strings.Builder
	enc := json.NewEncoder(&sb)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(c); err != nil {
		return "{}"
	}
	return strings.TrimSuffix(sb.String(), "\n")
}

// PublishFactoryDiscovery 發佈該廠所有 discovery config，回傳發佈數量。
func PublishFactoryDiscovery(publish Publisher, haPrefix, prefix, factoryID string, zones []scraper.Zone) int {
	base := prefix + "/" + factoryID

	type entry struct {
		objectID string
		cfg      sensorConfig
	}
	var entries []entry

	// Summary
	entries = append(entries,
		entry{
			fmt.Sprintf("ez_solar_%s_total_power", factoryID),
			sensorConfigNew(factoryID,
				fmt.Sprintf("ez_solar_%s_total_power", factoryID),
				fmt.Sprintf("%s 總功率", factoryID),
				base+"/total_power_kw", "kW", "power", "measurement"),
		},
		entry{
			fmt.Sprintf("ez_solar_%s_today_energy", factoryID),
			sensorConfigNew(factoryID,
				fmt.Sprintf("ez_solar_%s_today_energy", factoryID),
				fmt.Sprintf("%s 今日發電", factoryID),
				base+"/today_mwh", "MWh", "energy", "total_increasing"),
		},
		entry{
			fmt.Sprintf("ez_solar_%s_month_energy", factoryID),
			sensorConfigNew(factoryID,
				fmt.Sprintf("ez_solar_%s_month_energy", factoryID),
				fmt.Sprintf("%s 本月發電", factoryID),
				base+"/month_mwh", "MWh", "energy", "total_increasing"),
		},
	)

	// Per-zone
	for _, z := range zones {
		zid := z.ZoneID
		zname := z.Name
		if zname == "" {
			zname = fmt.Sprintf("Zone%d", zid)
		}
		ztopic := fmt.Sprintf("%s/zone/%d", base, zid)
		objPrefix := fmt.Sprintf("ez_solar_%s_zone%d", factoryID, zid)

		for _, m := range zoneMetrics {
			entries = append(entries, entry{
				fmt.Sprintf("%s_%s", objPrefix, m.suffix),
				sensorConfigNew(factoryID,
					fmt.Sprintf("%s_%s", objPrefix, m.suffix),
					fmt.Sprintf("%s %s %s", factoryID, zname, m.zh),
					ztopic+"/"+m.topicKey, m.unit, m.deviceCls, m.stateCls),
			})
		}
	}

	for _, e := range entries {
		topic := fmt.Sprintf("%s/sensor/%s/config", haPrefix, e.objectID)
		publish(topic, marshalConfig(e.cfg), true)
	}

	fmt.Printf("[%s] HA Discovery 已發佈 %d 個 entity\n", factoryID, len(entries))
	return len(entries)
}

// RemoveFactoryDiscovery 清除該廠所有 discovery（空 retained payload → HA 移除 entity）。
func RemoveFactoryDiscovery(publish Publisher, haPrefix, factoryID string, zoneIDs []int) {
	ids := []string{
		fmt.Sprintf("ez_solar_%s_total_power", factoryID),
		fmt.Sprintf("ez_solar_%s_today_energy", factoryID),
		fmt.Sprintf("ez_solar_%s_month_energy", factoryID),
	}
	for _, zid := range zoneIDs {
		for _, suffix := range []string{"power", "today", "month", "total", "capacity", "hours"} {
			ids = append(ids, fmt.Sprintf("ez_solar_%s_zone%d_%s", factoryID, zid, suffix))
		}
	}
	for _, id := range ids {
		publish(fmt.Sprintf("%s/sensor/%s/config", haPrefix, id), "", true)
	}
}

// ── Tracker：service 層使用的重發邏輯（對應 Python _ha_discovery_done / _last_zone_ids） ──

// Tracker 追蹤 discovery 已發佈狀態。
type Tracker struct {
	haPrefix  string
	prefix    string
	factoryID string

	lastZoneIDs []int
	done        bool
	pending     bool // prefix 變更後待重發
}

// NewTracker 建立 tracker。
func NewTracker(haPrefix, prefix, factoryID string) *Tracker {
	return &Tracker{haPrefix: haPrefix, prefix: prefix, factoryID: factoryID}
}

// MarkPrefixChanged 標記 prefix 已變更：不立即發佈，待下一個成功 round 重發。
func (t *Tracker) MarkPrefixChanged() {
	t.pending = true
}

// Pending 回傳是否有待重發的 discovery。
func (t *Tracker) Pending() bool {
	return t.pending
}

// MaybePublish 於每個成功 round 呼叫。首次、zone 清單變動（新增/刪除/reorder）、
// 或 prefix 變更後的下一輪才會發佈。
func (t *Tracker) MaybePublish(publish Publisher, prefix string, zones []scraper.Zone) {
	if prefix != t.prefix {
		t.prefix = prefix
		t.pending = true
	}
	ids := make([]int, 0, len(zones))
	for _, z := range zones {
		ids = append(ids, z.ZoneID)
	}
	if t.done && !t.pending && slices.Equal(ids, t.lastZoneIDs) {
		return
	}
	PublishFactoryDiscovery(publish, t.haPrefix, t.prefix, t.factoryID, zones)
	t.done = true
	t.pending = false
	t.lastZoneIDs = ids
}
