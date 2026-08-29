package config

import "testing"

func TestApplySetGlobalAndFactory(t *testing.T) {
	suppressWarnings(t)
	c := New()
	g, f := c.ApplySet("KN", map[string]any{
		"interval":   90,
		"mqtt_host":  "broker2",
		"base_url":   "http://10.1.1.5",
		"login_pass": "newpass",
	})
	if !contains(g, "interval") || !contains(g, "mqtt_host") {
		t.Errorf("global changed = %v, want interval+mqtt_host", g)
	}
	if !contains(f, "base_url") || !contains(f, "login_pass") {
		t.Errorf("factory changed = %v, want base_url+login_pass", f)
	}
	if c.GetInt("interval", 0) != 90 {
		t.Errorf("interval = %v", c.Get("interval"))
	}
	if c.Factory("KN")["base_url"] != "http://10.1.1.5" {
		t.Errorf("base_url = %v", c.Factory("KN")["base_url"])
	}
	// 相同值再套用 → 不回報變更
	g2, f2 := c.ApplySet("KN", map[string]any{
		"interval": 90,
		"base_url": "http://10.1.1.5",
	})
	if len(g2) != 0 || len(f2) != 0 {
		t.Errorf("no-op apply returned changes: g=%v f=%v", g2, f2)
	}
}

func TestApplySetBooleanCoercionPythonParity(t *testing.T) {
	cases := []struct {
		name     string
		payload  map[string]any
		key      string
		want     any
		expected bool // 是否應回報變更
	}{
		{"str-on-enables", map[string]any{"ha_discovery": "on"}, "ha_discovery", true, true},
		{"str-off-disables-no-warn", map[string]any{"ha_discovery": "off"}, "ha_discovery", false, false},
		{"num-1-enables", map[string]any{"mqtt_retain_alert": 1}, "mqtt_retain_alert", true, true},
		{"num-0-noop", map[string]any{"mqtt_retain_alert": 0}, "mqtt_retain_alert", false, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			suppressWarnings(t)
			c := New()
			g, _ := c.ApplySet("KN", tc.payload)
			if got := c.Get(tc.key); got != tc.want {
				t.Errorf("%s = %v, want %v", tc.key, got, tc.want)
			}
			reported := contains(g, tc.key)
			if reported != tc.expected {
				t.Errorf("change reported = %v, want %v", reported, tc.expected)
			}
		})
	}
}

func TestApplySetUnknownIgnored(t *testing.T) {
	suppressWarnings(t)
	c := New()
	g, f := c.ApplySet("KN", map[string]any{
		"mystery_key": 42,
		"another_one": "x",
		"restart":     true, // 控制鍵：跳過，不回報
	})
	if len(g) != 0 || len(f) != 0 {
		t.Errorf("unknown keys leaked: g=%v f=%v", g, f)
	}
	if c.Get("mystery_key") != nil {
		t.Error("unknown key polluted globals")
	}
}

func TestApplySetMissingFactory(t *testing.T) {
	suppressWarnings(t)
	c := New()
	before := c.GetInt("interval", 0)
	g, f := c.ApplySet("NOPE", map[string]any{"interval": 999, "base_url": "x"})
	if len(g) != 0 || len(f) != 0 {
		t.Errorf("missing factory returned changes: g=%v f=%v", g, f)
	}
	if c.GetInt("interval", 0) != before {
		t.Error("globals were modified for missing factory")
	}
	if c.Factory("NOPE") != nil {
		t.Error("missing factory was created")
	}
}

func TestApplySetTypeMismatch(t *testing.T) {
	var warned bool
	orig := Warnf
	Warnf = func(string, ...any) { warned = true }
	defer func() { Warnf = orig }()

	c := New()
	g, f := c.ApplySet("KN", map[string]any{
		"interval": "abc",
		"base_url": 123,
	})
	if contains(g, "interval") || contains(f, "base_url") {
		t.Errorf("type mismatch applied: g=%v f=%v", g, f)
	}
	if c.GetInt("interval", 0) != 60 {
		t.Errorf("interval changed to %v", c.Get("interval"))
	}
	if c.Factory("KN")["base_url"] != "http://192.168.80.5" {
		t.Errorf("base_url changed to %v", c.Factory("KN")["base_url"])
	}
	if !warned {
		t.Error("expected warnings for type mismatch")
	}
}

func contains(list []string, s string) bool {
	for _, v := range list {
		if v == s {
			return true
		}
	}
	return false
}
