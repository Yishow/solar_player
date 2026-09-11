package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func writeReadinessConfig(t *testing.T, content string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "solar_config.json")
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	return path
}

func TestValidateDataPlaneFileRejectsMissingAndIncompleteConfig(t *testing.T) {
	missing := filepath.Join(t.TempDir(), "missing.json")
	if err := ValidateDataPlaneFile(missing); err == nil {
		t.Fatal("missing config should be rejected")
	}

	cases := []struct {
		name    string
		content string
	}{
		{"malformed json", `{`},
		{"missing factories", `{"mqtt_host":"localhost"}`},
		{"empty factories", `{"factories":[]}`},
		{"missing password", `{"factories":[{"factory_id":"KN","base_url":"http://solar.local","login_user":"u"}]}`},
		{"blank user", `{"factories":[{"factory_id":"KN","base_url":"http://solar.local","login_user":"   ","login_pass":"p"}]}`},
		{"invalid url", `{"factories":[{"factory_id":"KN","base_url":"solar.local","login_user":"u","login_pass":"p"}]}`},
		{"duplicate id", `{"factories":[{"factory_id":"KN","base_url":"http://one.local","login_user":"u","login_pass":"p"},{"factory_id":"KN","base_url":"http://two.local","login_user":"u","login_pass":"p"}]}`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if err := ValidateDataPlaneFile(writeReadinessConfig(t, tc.content)); err == nil {
				t.Fatal("invalid config should be rejected")
			}
		})
	}
}

func TestValidateDataPlaneFileAcceptsExplicitAndLegacyFactories(t *testing.T) {
	valid := []string{
		`{"factories":[{"factory_id":"KN","base_url":"http://solar.local","login_user":"u","login_pass":"p"}]}`,
		`{"factory_id":"KN","base_url":"https://solar.local:8443","login_user":"u","login_pass":"p"}`,
	}
	for _, content := range valid {
		if err := ValidateDataPlaneFile(writeReadinessConfig(t, content)); err != nil {
			t.Fatalf("valid config rejected: %v", err)
		}
	}
}

func TestValidateDataPlaneFileDoesNotEchoPassword(t *testing.T) {
	const canary = "CANARY-SECRET-DO-NOT-ECHO"
	path := writeReadinessConfig(t, `{"factories":[{"factory_id":"KN","base_url":"not-a-url","login_user":"u","login_pass":"`+canary+`"}]}`)
	err := ValidateDataPlaneFile(path)
	if err == nil {
		t.Fatal("invalid base_url should be rejected")
	}
	if strings.Contains(err.Error(), canary) {
		t.Fatalf("password leaked in validation error: %v", err)
	}
}
