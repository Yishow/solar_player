// Package schedule 提供夜間暫停用日出日落計算（NOAA 簡化版，零依賴）。
// 演算法逐行對照 Python solar/schedule.py；準確度 ±2 分鐘。
// 時間語意：輸入輸出皆為 naive 當地時間；tz 為當地時區相對 UTC 的偏移小時數（預設 8.0）。
package schedule

import (
	"math"
	"time"
)

const secondsPerDay = 86400

// unixDaysFromCivil 儒略日換算用：從 1970-01-01 起算的天數（UTC 正午對齊）。
func unixDaysFromCivil(y int, m time.Month, d int) int {
	return int(time.Date(y, m, d, 0, 0, 0, 0, time.UTC).Unix() / secondsPerDay)
}

// solarEvent 對應 Python _solar_event。回傳當地時間的日出/日落時刻（當天日期 + 時分秒），
// 極地無事件時回 nil。
func solarEvent(date time.Time, lat, lon float64, rising bool, tzOffsetHours float64) *time.Time {
	// 儒略日：n = toordinal(d) - toordinal(2000-01-01) + 1
	n := unixDaysFromCivil(date.Year(), date.Month(), date.Day()) -
		unixDaysFromCivil(2000, 1, 1) + 1

	lonTerm := float64(n) - lon/360.0
	jStar := lonTerm
	if rising {
		jStar = lonTerm + 6.0
	}

	// 平近點角
	mAng := math.Mod(357.5291+0.98560028*jStar, 360.0)
	mRad := deg2rad(mAng)

	// 中心方程
	c := 1.9148*math.Sin(mRad) + 0.0200*math.Sin(2*mRad) + 0.0003*math.Sin(3*mRad)

	// 黃道經度
	lam := math.Mod(mAng+c+180.0+102.9372, 360.0)
	lamRad := deg2rad(lam)

	// 太陽正中天
	jTransit := 2451545.0 + lonTerm + 0.0053*math.Sin(mRad) - 0.0069*math.Sin(2*lamRad)

	// 赤緯
	sinDelta := math.Sin(lamRad) * math.Sin(deg2rad(23.44))
	delta := math.Asin(sinDelta)

	// 時角
	latRad := deg2rad(lat)
	cosH := (math.Sin(deg2rad(-0.83)) - math.Sin(latRad)*math.Sin(delta)) /
		(math.Cos(latRad) * math.Cos(delta))
	if cosH > 1 || cosH < -1 {
		return nil
	}
	h := rad2deg(math.Acos(cosH))

	var jEvent float64
	if rising {
		jEvent = jTransit - h/360.0
	} else {
		jEvent = jTransit + h/360.0
	}

	// 轉回 UTC datetime 再加時區偏移
	unixDays := jEvent - 2440587.5
	dtUTC := time.Unix(int64(unixDays*secondsPerDay), 0).UTC()
	dtLocal := dtUTC.Add(time.Duration(tzOffsetHours * float64(time.Hour)))

	// 取「時分秒」（Python .time().replace(microsecond=0)），日期掛回輸入日
	tod := time.Date(date.Year(), date.Month(), date.Day(),
		dtLocal.Hour(), dtLocal.Minute(), dtLocal.Second(), 0, date.Location())
	return &tod
}

func deg2rad(d float64) float64 { return d * math.Pi / 180.0 }
func rad2deg(r float64) float64 { return r * 180.0 / math.Pi }

// Sunrise 回傳日期 d 的日出（當地時間，tz 預設 8.0）。
func Sunrise(d time.Time, lat, lon float64) *time.Time {
	return solarEvent(d, lat, lon, true, 8.0)
}

// Sunset 回傳日期 d 的日落。
func Sunset(d time.Time, lat, lon float64) *time.Time {
	return solarEvent(d, lat, lon, false, 8.0)
}

// IsDaytime 是否在「日出-padding ~ 日落+padding」之內。
// 無法判斷（極區）→ 保守視為白天。
func IsDaytime(now time.Time, lat, lon float64, paddingMin int) bool {
	sr := Sunrise(now, lat, lon)
	ss := Sunset(now, lat, lon)
	if sr == nil || ss == nil {
		return true
	}
	srDt := sr.Add(-time.Duration(paddingMin) * time.Minute)
	ssDt := ss.Add(time.Duration(paddingMin) * time.Minute)
	nowNaive := time.Date(now.Year(), now.Month(), now.Day(),
		now.Hour(), now.Minute(), now.Second(), 0, now.Location())
	return !nowNaive.Before(srDt) && !nowNaive.After(ssDt)
}

// SecondsUntilSunrise 回傳距離下個日出-padding 的秒數（最少 60；極區備援 3600）。
func SecondsUntilSunrise(now time.Time, lat, lon float64, paddingMin int) int {
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	for offset := 0; offset <= 1; offset++ {
		d := today.AddDate(0, 0, offset)
		sr := Sunrise(d, lat, lon)
		if sr == nil {
			continue
		}
		target := sr.Add(-time.Duration(paddingMin) * time.Minute)
		delta := target.Sub(now).Seconds()
		if delta > 0 {
			s := int(delta)
			if s < 60 {
				s = 60
			}
			return s
		}
	}
	return 3600
}
