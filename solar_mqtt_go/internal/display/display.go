// Package display 提供終端輸出（中文寬度對齊、安全格式化、結果列印），
// 對應 Python solar/display.py。
package display

import (
	"fmt"
	"strings"
	"time"

	"solar_mqtt_go/internal/scraper"
)

// dash 預設佔位符（對應 Python fmt 的 dash 預設值）。
const dash = "   -  "

// Fmt 對應 Python fmt：None → dash；否則以 spec 格式化。
func Fmt(v *float64, spec string) string {
	if v == nil {
		return dash
	}
	return fmt.Sprintf("%"+spec, *v)
}

// DisplayWidth 計算終端顯示寬度（CJK/全形算 2，對應 Python display_width）。
func DisplayWidth(s string) int {
	width := 0
	for _, ch := range s {
		code := int(ch)
		if (0x1100 <= code && code <= 0x115F) ||
			(0x2E80 <= code && code <= 0x303E) ||
			(0x3041 <= code && code <= 0x33FF) ||
			(0x3400 <= code && code <= 0x4DBF) ||
			(0x4E00 <= code && code <= 0x9FFF) ||
			(0xA000 <= code && code <= 0xA4CF) ||
			(0xAC00 <= code && code <= 0xD7A3) ||
			(0xF900 <= code && code <= 0xFAFF) ||
			(0xFE30 <= code && code <= 0xFE4F) ||
			(0xFF00 <= code && code <= 0xFF60) ||
			(0xFFE0 <= code && code <= 0xFFE6) {
			width += 2
		} else {
			width++
		}
	}
	return width
}

// PadDisplay 對應 Python pad_display：截斷（不切半個寬字元）後補滿至 width。
func PadDisplay(s string, width int) string {
	w := 0
	var out strings.Builder
	for _, ch := range s {
		cw := 1
		if DisplayWidth(string(ch)) == 2 {
			cw = 2
		}
		if w+cw > width {
			break
		}
		out.WriteRune(ch)
		w += cw
	}
	if pad := width - w; pad > 0 {
		out.WriteString(strings.Repeat(" ", pad))
	}
	return out.String()
}

// PrintResult 對應 Python print_result：印出單輪擷取結果與 topic 對照。
func PrintResult(factory string, summary *scraper.Summary, zones []scraper.Zone, mqttOK bool, prefix, mqttHost string, mqttPort int) {
	ts := time.Now().Format("2006-01-02 15:04:05")
	line := strings.Repeat("=", 60)
	dashes := strings.Repeat("-", 60)
	fmt.Println()
	fmt.Println(line)
	fmt.Printf("  %s %s\n", factory, ts)
	fmt.Println(dashes)
	fmt.Printf("  總功率: %s kW  |  今日: %s MWh  |  本月: %s MWh\n",
		Fmt(summary.TotalPowerKw, ".1f"), Fmt(summary.TodayMwh, ".2f"), Fmt(summary.MonthMwh, ".2f"))
	fmt.Printf("  累積: %s MWh\n", Fmt(summary.TotalMwh, ".3f"))
	fmt.Println(dashes)
	for _, z := range zones {
		fmt.Printf("  Zone%-2d %s  %s kW  |  今日: %s kWh  |  本月: %s MWh\n",
			z.ZoneID, PadDisplay(z.Name, 16),
			Fmt(z.PowerKw, "7.1f"), Fmt(z.TodayKwh, "7.1f"), Fmt(z.MonthMwh, ".2f"))
	}
	fmt.Println(dashes)
	status := "FAIL"
	if mqttOK {
		status = "OK"
	}
	fmt.Printf("  MQTT: %s   prefix=%s/%s\n", status, prefix, factory)
	fmt.Println(dashes)
	fmt.Printf("    → %s/%s/summary          (JSON) total_power_kw, today_mwh, month_mwh, total_mwh\n", prefix, factory)
	fmt.Printf("    → %s/%s/total_power_kw   %s kW\n", prefix, factory, Fmt(summary.TotalPowerKw, ".1f"))
	fmt.Printf("    → %s/%s/today_mwh        %s MWh\n", prefix, factory, Fmt(summary.TodayMwh, ".2f"))
	fmt.Printf("    → %s/%s/month_mwh        %s MWh\n", prefix, factory, Fmt(summary.MonthMwh, ".2f"))
	fmt.Printf("    → %s/%s/total_mwh        %s MWh\n", prefix, factory, Fmt(summary.TotalMwh, ".3f"))
	fmt.Printf("    → %s/%s/status           (JSON) running / stopped / paused\n", prefix, factory)
	fmt.Printf("    → %s/%s/heartbeat        (JSON) 每 N 秒\n", prefix, factory)
	fmt.Printf("    → %s/%s/alert            (JSON) 異常通知\n", prefix, factory)
	fmt.Printf("    ← %s/%s/cmd/get-config   (JSON) 查詢設定\n", prefix, factory)
	fmt.Printf("    ← %s/%s/cmd/set          (JSON) 修改設定（restart=true 不支援）\n", prefix, factory)
	fmt.Printf("    → %s/%s/state/config     (JSON) retained 設定摘要\n", prefix, factory)
	fmt.Printf("    → %s/%s/state/control-result (JSON) 控制結果（非 retained）\n", prefix, factory)
	for _, z := range zones {
		fmt.Printf("    → %s/%s/zone/%d                (JSON) 整包欄位\n", prefix, factory, z.ZoneID)
		fmt.Printf("    → %s/%s/zone/%d/power_kw       %s kW  (%s)\n", prefix, factory, z.ZoneID, Fmt(z.PowerKw, ".1f"), z.Name)
		fmt.Printf("    → %s/%s/zone/%d/today_kwh      %s kWh\n", prefix, factory, z.ZoneID, Fmt(z.TodayKwh, ".1f"))
		fmt.Printf("    → %s/%s/zone/%d/month_mwh      %s MWh\n", prefix, factory, z.ZoneID, Fmt(z.MonthMwh, ".2f"))
		fmt.Printf("    → %s/%s/zone/%d/total_mwh      %s MWh\n", prefix, factory, z.ZoneID, Fmt(z.TotalMwh, ".2f"))
		fmt.Printf("    → %s/%s/zone/%d/capacity_kwp   %s kWp\n", prefix, factory, z.ZoneID, Fmt(z.CapacityKwp, ".1f"))
		fmt.Printf("    → %s/%s/zone/%d/today_hours    %s h\n", prefix, factory, z.ZoneID, Fmt(z.TodayHours, ".2f"))
	}
	fmt.Println(dashes)
	fmt.Printf("  快速訂閱全部：  mosquitto_sub -h %s -p %d -v -t '%s/%s/#'\n", mqttHost, mqttPort, prefix, factory)
	fmt.Println(line)
}
