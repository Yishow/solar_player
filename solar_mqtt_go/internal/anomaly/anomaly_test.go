package anomaly

import (
	"strings"
	"testing"
	"time"

	"solar_mqtt_go/internal/scraper"
)

var base = time.Date(2026, 8, 28, 10, 0, 0, 0, time.UTC)

func step(n int) time.Time { return base.Add(time.Duration(n) * time.Minute) }

type alertCall struct {
	factory, level, message string
}

type recorder struct {
	calls []alertCall
}

func (r *recorder) fn(factory, level, message string) {
	r.calls = append(r.calls, alertCall{factory, level, message})
}

func fp(v float64) *float64 { return &v }

func summaryWith(power *float64) *scraper.Summary {
	return &scraper.Summary{TotalPowerKw: power}
}

func TestZeroWindowStates(t *testing.T) {
	w := &Window{}
	threshold := 5 * time.Minute

	if ev := w.Update(true, step(0), threshold); ev != "start" {
		t.Errorf("first zero event = %s, want start", ev)
	}
	if ev := w.Update(true, step(2), threshold); ev != "none" {
		t.Errorf("zero before threshold = %s, want none", ev)
	}
	if ev := w.Update(true, step(5), threshold); ev != "fire" {
		t.Errorf("at threshold = %s, want fire", ev)
	}
	if ev := w.Update(true, step(10), threshold); ev != "none" {
		t.Errorf("still zero after fire = %s, want none", ev)
	}
	if ev := w.Update(false, step(11), threshold); ev != "recover" {
		t.Errorf("recovery after fire = %s, want recover", ev)
	}
	// 恢復後 window 已重置
	if ev := w.Update(false, step(12), threshold); ev != "none" {
		t.Errorf("non-zero after reset = %s, want none", ev)
	}
	// 未 fire 就恢復 → none
	w2 := &Window{}
	w2.Update(true, step(0), threshold)
	if ev := w2.Update(false, step(1), threshold); ev != "none" {
		t.Errorf("recover without fire = %s, want none", ev)
	}
}

func TestZeroPredicatePythonParity(t *testing.T) {
	// Python _is_zero：零、負數、None、非數字均為 zero；只有正數非 zero
	cases := []struct {
		v    *float64
		want bool
	}{
		{nil, true},
		{fp(0), true},
		{fp(-1.5), true},
		{fp(0.0001), false},
		{fp(5), false},
	}
	for i, tc := range cases {
		if got := IsZero(tc.v); got != tc.want {
			t.Errorf("case %d IsZero(%v) = %v, want %v", i, tc.v, got, tc.want)
		}
	}
}

func TestFireOnceAndRecoverInfo(t *testing.T) {
	r := &recorder{}
	d := New(5, r.fn)

	zero := summaryWith(fp(0))
	zones := []scraper.Zone{{ZoneID: 1, Name: "屋頂A", PowerKw: fp(0)}}

	d.Check("KN", zero, zones, true, step(0)) // start
	d.Check("KN", zero, zones, true, step(3)) // none
	if len(r.calls) != 0 {
		t.Fatalf("early alerts: %v", r.calls)
	}
	d.Check("KN", zero, zones, true, step(5)) // fire（全廠 + zone1）
	if len(r.calls) != 2 {
		t.Fatalf("fire alerts = %d, want 2", len(r.calls))
	}
	for _, c := range r.calls {
		if c.level != "WARN" {
			t.Errorf("level = %s, want WARN", c.level)
		}
		if !strings.Contains(c.message, "白天連續零功率超過 5 分鐘") {
			t.Errorf("message = %s", c.message)
		}
	}
	if r.calls[0].message != "全廠 白天連續零功率超過 5 分鐘" {
		t.Errorf("factory msg = %s", r.calls[0].message)
	}
	if r.calls[1].message != "Zone1 屋頂A 白天連續零功率超過 5 分鐘" {
		t.Errorf("zone msg = %s", r.calls[1].message)
	}

	// 持續為零 → 不重複
	d.Check("KN", zero, zones, true, step(8))
	d.Check("KN", zero, zones, true, step(20))
	if len(r.calls) != 2 {
		t.Fatalf("alerts after persistence = %d, want 2 (fire once)", len(r.calls))
	}

	// 恢復 → INFO，帶當前值
	r.calls = nil
	rec := summaryWith(fp(12.34))
	zonesRec := []scraper.Zone{{ZoneID: 1, Name: "屋頂A", PowerKw: fp(3.2)}}
	d.Check("KN", rec, zonesRec, true, step(25))
	if len(r.calls) != 2 {
		t.Fatalf("recover alerts = %d, want 2", len(r.calls))
	}
	for _, c := range r.calls {
		if c.level != "INFO" {
			t.Errorf("recover level = %s", c.level)
		}
		if !strings.Contains(c.message, "已恢復發電") {
			t.Errorf("recover message = %s", c.message)
		}
	}
	if r.calls[0].message != "全廠 已恢復發電（12.3 kW）" {
		t.Errorf("factory recover msg = %s", r.calls[0].message)
	}
	if r.calls[1].message != "Zone1 屋頂A 已恢復發電（3.2 kW）" {
		t.Errorf("zone recover msg = %s", r.calls[1].message)
	}
}

func TestNightReset(t *testing.T) {
	r := &recorder{}
	d := New(5, r.fn)

	zero := summaryWith(fp(0))
	zones := []scraper.Zone{{ZoneID: 1, Name: "Z", PowerKw: fp(0)}}

	d.Check("KN", zero, zones, true, step(0)) // start
	// 夜間 → 清窗
	d.Check("KN", zero, zones, false, step(1))
	// 白天重新開始 → start，不立即 fire
	d.Check("KN", zero, zones, true, step(2))
	if len(r.calls) != 0 {
		t.Fatalf("alerts after night reset: %v", r.calls)
	}
	// 重新累積 5 分鐘才 fire
	d.Check("KN", zero, zones, true, step(7))
	if len(r.calls) != 2 {
		t.Errorf("fire after reset = %d alerts, want 2", len(r.calls))
	}
}

func TestNightPauseDisabledTreatsNightAsDaytime(t *testing.T) {
	// anomaly 不自行查天文/時鐘：呼叫端在 night_pause=false 時傳 daytime=true，
	// 因此「天文夜間」的零功率讀值仍會累積 window 並 fire。
	r := &recorder{}
	d := New(5, r.fn)

	zero := summaryWith(fp(0))
	night1 := time.Date(2026, 8, 28, 23, 0, 0, 0, time.UTC)
	night2 := time.Date(2026, 8, 28, 23, 5, 0, 0, time.UTC)

	d.Check("KN", zero, nil, true, night1)
	d.Check("KN", zero, nil, true, night2)
	if len(r.calls) != 1 {
		t.Fatalf("alerts = %d, want 1 (night treated as daytime)", len(r.calls))
	}
	if r.calls[0].level != "WARN" {
		t.Errorf("level = %s", r.calls[0].level)
	}
}

func TestZeroNilSummaryValues(t *testing.T) {
	// None（nil）視為 zero：nil summary 欄位也應累積並 fire
	r := &recorder{}
	d := New(5, r.fn)
	none := summaryWith(nil)
	d.Check("KN", none, nil, true, step(0))
	d.Check("KN", none, nil, true, step(5))
	if len(r.calls) != 1 || r.calls[0].level != "WARN" {
		t.Fatalf("nil-value alerts = %+v", r.calls)
	}
}
