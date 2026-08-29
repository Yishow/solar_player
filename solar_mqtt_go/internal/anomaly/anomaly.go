// Package anomaly 實作白天零功率異常偵測（對應 Python solar/anomaly.py）。
//
// 規則：
//   - 白天時段（由呼叫端依 night_pause 設定傳入 is_daytime），若總功率為 0 或
//     缺值持續超過 daytime_zero_minutes，視為異常（WARN，僅首次）。
//   - 單區功率為 0 同步觸發；恢復（非零）時發 INFO，帶當前值。
//   - 夜間（is_daytime=false）重置該廠所有 window。
package anomaly

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"solar_mqtt_go/internal/scraper"
)

// IsZero 對應 Python _is_zero：nil、<=0 均視為 zero。
func IsZero(v *float64) bool {
	if v == nil {
		return true
	}
	return *v <= 0.0
}

// Window 零功率累積視窗（對應 Python _ZeroWindow）。
type Window struct {
	start *time.Time
	fired bool
}

// Update 更新視窗狀態，回傳事件："start"、"fire"、"recover"、"none"。
func (w *Window) Update(isZero bool, now time.Time, threshold time.Duration) string {
	if isZero {
		if w.start == nil {
			t := now
			w.start = &t
			w.fired = false
			return "start"
		}
		if !w.fired && now.Sub(*w.start) >= threshold {
			w.fired = true
			return "fire"
		}
		return "none"
	}
	// 非零 → 恢復
	if w.start != nil {
		event := "none"
		if w.fired {
			event = "recover"
		}
		w.start = nil
		w.fired = false
		return event
	}
	return "none"
}

// AlertFn 告警回呼（factory_id, level, message）。
type AlertFn func(factoryID, level, message string)

type zoneKey struct {
	factory string
	zoneID  int
}

// Detector 異常偵測器（對應 Python AnomalyDetector）。
type Detector struct {
	DaytimeZeroMinutes int
	onAlert            AlertFn

	mu             sync.Mutex
	factoryWindows map[string]*Window
	zoneWindows    map[zoneKey]*Window
}

// New 建立 detector。
func New(daytimeZeroMinutes int, onAlert AlertFn) *Detector {
	return &Detector{
		DaytimeZeroMinutes: daytimeZeroMinutes,
		onAlert:            onAlert,
		factoryWindows:     map[string]*Window{},
		zoneWindows:        map[zoneKey]*Window{},
	}
}

// SetDaytimeZeroMinutes 熱更新門檻（/set 變更）。
func (d *Detector) SetDaytimeZeroMinutes(minutes int) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.DaytimeZeroMinutes = minutes
}

// Check 檢查一輪讀值。isDaytime=false 時重置該廠所有 window。
func (d *Detector) Check(factoryID string, summary *scraper.Summary, zones []scraper.Zone, isDaytime bool, now time.Time) {
	d.mu.Lock()
	threshold := time.Duration(d.DaytimeZeroMinutes) * time.Minute
	d.mu.Unlock()

	if !isDaytime {
		// 夜間 reset（對應 Python pop）
		d.mu.Lock()
		delete(d.factoryWindows, factoryID)
		for k := range d.zoneWindows {
			if k.factory == factoryID {
				delete(d.zoneWindows, k)
			}
		}
		d.mu.Unlock()
		return
	}

	var total *float64
	if summary != nil {
		total = summary.TotalPowerKw
	}

	d.mu.Lock()
	fw := d.factoryWindows[factoryID]
	if fw == nil {
		fw = &Window{}
		d.factoryWindows[factoryID] = fw
	}
	d.mu.Unlock()
	ev := fw.Update(IsZero(total), now, threshold)
	d.emit(factoryID, "全廠", ev, total, threshold)

	for _, z := range zones {
		key := zoneKey{factoryID, z.ZoneID}
		d.mu.Lock()
		zw := d.zoneWindows[key]
		if zw == nil {
			zw = &Window{}
			d.zoneWindows[key] = zw
		}
		d.mu.Unlock()
		ev := zw.Update(IsZero(z.PowerKw), now, threshold)
		target := strings.TrimSpace(fmt.Sprintf("Zone%d %s", z.ZoneID, z.Name))
		d.emit(factoryID, target, ev, z.PowerKw, threshold)
	}
}

// emit 對應 Python _emit：fire → WARN、recover → INFO（帶當前值）。
func (d *Detector) emit(factoryID, target string, event string, value *float64, threshold time.Duration) {
	if event == "none" || event == "start" || d.onAlert == nil {
		return
	}
	switch event {
	case "fire":
		msg := fmt.Sprintf("%s 白天連續零功率超過 %.0f 分鐘", target, threshold.Minutes())
		d.onAlert(factoryID, "WARN", msg)
	case "recover":
		v := "有值"
		if value != nil {
			v = fmt.Sprintf("%.1f kW", *value)
		}
		msg := fmt.Sprintf("%s 已恢復發電（%s）", target, v)
		d.onAlert(factoryID, "INFO", msg)
	}
}
