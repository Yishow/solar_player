package schedule

import (
	"testing"
	"time"
)

// 期望值由 Python 版 solar/schedule.py 以相同輸入計算（ground truth）。
func TestSunriseSunsetKnownDate(t *testing.T) {
	cases := []struct {
		y, m, d      int
		wantSunriseS int // 當地時間秒數（從 00:00:00 起）
		wantSunsetS  int
	}{
		{2026, 6, 21, 5*3600 + 7*60 + 47, 18*3600 + 47*60 + 34},
		{2026, 8, 28, 5*3600 + 37*60 + 3, 18*3600 + 18*60 + 6},
		{2026, 12, 21, 6*3600 + 38*60 + 27, 17*3600 + 10*60 + 52},
	}
	for _, tc := range cases {
		date := time.Date(tc.y, time.Month(tc.m), tc.d, 12, 0, 0, 0, time.UTC)
		sr := Sunrise(date, 24.9576, 121.2254)
		if sr == nil {
			t.Fatalf("%d-%d-%d sunrise nil", tc.y, tc.m, tc.d)
		}
		if got := secondsOfDay(*sr); abs(got-tc.wantSunriseS) > 2 {
			t.Errorf("%d-%d-%d sunrise = %s (%ds), want ~%ds", tc.y, tc.m, tc.d, formatTOD(*sr), got, tc.wantSunriseS)
		}
		ss := Sunset(date, 24.9576, 121.2254)
		if ss == nil {
			t.Fatalf("%d-%d-%d sunset nil", tc.y, tc.m, tc.d)
		}
		if got := secondsOfDay(*ss); abs(got-tc.wantSunsetS) > 2 {
			t.Errorf("%d-%d-%d sunset = %s (%ds), want ~%ds", tc.y, tc.m, tc.d, formatTOD(*ss), got, tc.wantSunsetS)
		}
	}
}

func TestPolarReturnsNil(t *testing.T) {
	date := time.Date(2026, 6, 21, 12, 0, 0, 0, time.UTC)
	if sr := Sunrise(date, 85.0, 121.2254); sr != nil {
		t.Errorf("polar sunrise = %v, want nil", formatTOD(*sr))
	}
	if ss := Sunset(date, 85.0, 121.2254); ss != nil {
		t.Errorf("polar sunset = %v, want nil", formatTOD(*ss))
	}
}

func TestIsDaytimePadding(t *testing.T) {
	const lat, lon = 24.9576, 121.2254
	day := time.Date(2026, 8, 28, 0, 0, 0, 0, time.UTC)
	sr := Sunrise(day, lat, lon)
	ss := Sunset(day, lat, lon)
	if sr == nil || ss == nil {
		t.Fatal("nil solar event")
	}

	// 以日出/日落時間建構邊界時刻（padding 30 分）
	tod := func(base time.Time, deltaMin int) time.Time {
		return time.Date(2026, 8, 28, base.Hour(), base.Minute(), base.Second(), 0, time.UTC).
			Add(time.Duration(deltaMin) * time.Minute)
	}
	cases := []struct {
		at   time.Time
		want bool
	}{
		{tod(*sr, -31), false}, // padding 外
		{tod(*sr, -30), true},  // padding 邊界（含）
		{tod(*sr, 0), true},    // 日出
		{tod(*ss, 0), true},    // 日落
		{tod(*ss, 30), true},   // padding 邊界（含）
		{tod(*ss, 31), false},  // padding 外
	}
	for i, tc := range cases {
		if got := IsDaytime(tc.at, lat, lon, 30); got != tc.want {
			t.Errorf("case %d is_daytime(%s) = %v, want %v", i, tc.at.Format("15:04:05"), got, tc.want)
		}
	}
}

func TestIsDaytimeIndeterminateIsDaytime(t *testing.T) {
	// 極區無法計算 → 保守視為白天
	night := time.Date(2026, 6, 21, 0, 0, 0, 0, time.UTC)
	if !IsDaytime(night, 85.0, 121.2254, 30) {
		t.Error("indeterminate solar event must be treated as daytime")
	}
}

func TestSecondsUntilSunrise(t *testing.T) {
	const lat, lon = 24.9576, 121.2254

	// 22:00 → 下個日出-padding = 25645 秒（Python ground truth）
	at := time.Date(2026, 8, 28, 22, 0, 0, 0, time.UTC)
	if got := SecondsUntilSunrise(at, lat, lon, 30); abs(got-25645) > 2 {
		t.Errorf("seconds_until_sunrise(22:00) = %d, want ~25645", got)
	}
	// 正午 → 隔天日出，Python ground truth 61645
	noon := time.Date(2026, 8, 28, 12, 0, 0, 0, time.UTC)
	if got := SecondsUntilSunrise(noon, lat, lon, 30); abs(got-61645) > 2 {
		t.Errorf("seconds_until_sunrise(noon) = %d, want ~61645", got)
	}
	// 下限 60 秒
	if got := SecondsUntilSunrise(at, lat, lon, 300); got < 60 {
		t.Errorf("seconds_until_sunrise = %d, must be >= 60", got)
	}
}

func TestSecondsUntilSunrisePolarFallback(t *testing.T) {
	at := time.Date(2026, 8, 28, 22, 0, 0, 0, time.UTC)
	if got := SecondsUntilSunrise(at, 85.0, 121.2254, 30); got != 3600 {
		t.Errorf("polar fallback = %d, want 3600", got)
	}
}

// ── helpers ──

func secondsOfDay(t time.Time) int {
	return t.Hour()*3600 + t.Minute()*60 + t.Second()
}

func formatTOD(t time.Time) string {
	return t.Format("15:04:05")
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}
