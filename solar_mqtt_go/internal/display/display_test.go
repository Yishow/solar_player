package display

import (
	"io"
	"os"
	"strings"
	"testing"

	"solar_mqtt_go/internal/scraper"
)

func TestFmtNilDash(t *testing.T) {
	if got := Fmt(nil, ".1f"); got != "   -  " {
		t.Errorf("Fmt(nil) = %q", got)
	}
	if got := Fmt(floatPtr(12.34), ".1f"); got != "12.3" {
		t.Errorf("Fmt(12.34,.1f) = %q", got)
	}
	if got := Fmt(floatPtr(1.5), "7.1f"); got != "    1.5" {
		t.Errorf("Fmt(1.5,7.1f) = %q", got)
	}
}

func TestDisplayWidth(t *testing.T) {
	cases := []struct {
		s    string
		want int
	}{
		{"", 0},
		{"abc", 3},
		{"中", 2},
		{"中文", 4},
		{"a中b", 4},
		{"ＡＢ", 4}, // fullwidth
		{"カナ", 4}, // katakana
	}
	for _, tc := range cases {
		if got := DisplayWidth(tc.s); got != tc.want {
			t.Errorf("DisplayWidth(%q) = %d, want %d", tc.s, got, tc.want)
		}
	}
}

func TestPadDisplay(t *testing.T) {
	// 寬度內補空白
	if got := PadDisplay("ab", 5); got != "ab   " {
		t.Errorf("PadDisplay(ab,5) = %q", got)
	}
	// 中文算 2 格：中(2) + 2 空格 = 顯示寬 4
	if got := PadDisplay("中", 4); got != "中  " {
		t.Errorf("PadDisplay(中,4) = %q", got)
	}
	// 超寬截斷（不切半個字）
	got := PadDisplay("abcde", 3)
	if DisplayWidth(got) > 3 {
		t.Errorf("PadDisplay truncation too wide: %q (%d)", got, DisplayWidth(got))
	}
}

func TestPrintResultUsesCurrentControlTopics(t *testing.T) {
	value := 1.0
	summary := &scraper.Summary{
		TotalPowerKw: &value,
		TodayMwh:     &value,
		MonthMwh:     &value,
		TotalMwh:     &value,
	}

	originalStdout := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	os.Stdout = w
	PrintResult("KN", summary, nil, true, "solar", "localhost", 1883)
	_ = w.Close()
	os.Stdout = originalStdout
	output, err := io.ReadAll(r)
	_ = r.Close()
	if err != nil {
		t.Fatal(err)
	}

	text := string(output)
	for _, topic := range []string{
		"solar/KN/cmd/get-config",
		"solar/KN/cmd/set",
		"solar/KN/state/config",
		"solar/KN/state/control-result",
	} {
		if !strings.Contains(text, topic) {
			t.Errorf("output missing current control topic %q:\n%s", topic, text)
		}
	}
	for _, legacy := range []string{"solar/KN/config", "solar/KN/set"} {
		if strings.Contains(text, legacy) {
			t.Errorf("output still contains legacy topic %q:\n%s", legacy, text)
		}
	}
	if !strings.Contains(text, "restart=true 不支援") {
		t.Errorf("output must state restart is unsupported:\n%s", text)
	}
}

func floatPtr(v float64) *float64 { return &v }
