package main

import (
	"os"
	"strings"
	"testing"
)

func TestBuildScriptKeepsCrossBuildAndWindowsContracts(t *testing.T) {
	script, err := os.ReadFile("build.sh")
	if err != nil {
		t.Fatal(err)
	}
	source := string(script)
	for _, want := range []string{
		"CGO_ENABLED=0 GOOS=windows GOARCH=amd64",
		"solar_mqtt_go_windows_amd64_tray.exe",
		"-H windowsgui",
		"solar_mqtt_go_windows_amd64_console.exe",
	} {
		if !strings.Contains(source, want) {
			t.Errorf("build.sh missing %q", want)
		}
	}
	for _, forbidden := range []string{"GOOS=linux", "GOOS=darwin", "EZ-Solar.app", "macos/Info.plist"} {
		if strings.Contains(source, forbidden) {
			t.Errorf("build.sh must not contain obsolete non-Windows output %q", forbidden)
		}
	}
}

func TestBuildScriptClearsDistAndEmitsOnlyWindowsArtifacts(t *testing.T) {
	script, err := os.ReadFile("build.sh")
	if err != nil {
		t.Fatal(err)
	}
	source := string(script)
	for _, want := range []string{
		`rm -rf "$OUT"`,
		`mkdir -p "$OUT"`,
		`test "$(find "$OUT" -maxdepth 1 -type f | wc -l | tr -d ' ')" -eq 2`,
	} {
		if !strings.Contains(source, want) {
			t.Errorf("build.sh must enforce Windows-only dist contract %q", want)
		}
	}
}

func TestBuildPowerShellScriptMatchesContract(t *testing.T) {
	script, err := os.ReadFile("build.ps1")
	if err != nil {
		t.Fatal(err)
	}
	source := string(script)
	for _, want := range []string{
		`$env:GOOS = "windows"`,
		`$env:GOARCH = "amd64"`,
		"solar_mqtt_go_windows_amd64_tray.exe",
		"-H windowsgui",
		"solar_mqtt_go_windows_amd64_console.exe",
		"dist",
	} {
		if !strings.Contains(source, want) {
			t.Errorf("build.ps1 missing %q", want)
		}
	}
}

func TestStartPowerShellScriptMatchesContract(t *testing.T) {
	script, err := os.ReadFile("start.ps1")
	if err != nil {
		t.Fatal(err)
	}
	source := string(script)
	for _, want := range []string{
		`Test-Path "..\solar_mqtt\solar_config.json"`,
		`Copy-Item "..\solar_mqtt\solar_config.json" "solar_config.json"`,
		"18868",
		".solar_mqtt_go_run.exe",
		"go build",
		"& $RunBinary",
		"@args",
	} {
		if !strings.Contains(source, want) {
			t.Errorf("start.ps1 missing %q", want)
		}
	}
	for _, forbidden := range []string{"go run", "缺少 SOLAR_MQTT_USERNAME", "缺少 SOLAR_MQTT_PASSWORD", "IsNullOrWhiteSpace($env:SOLAR_MQTT_"} {
		if strings.Contains(source, forbidden) {
			t.Errorf("start.ps1 contains forbidden content %q", forbidden)
		}
	}

	shellScript, err := os.ReadFile("start.sh")
	if err != nil {
		t.Fatal(err)
	}
	shellSource := string(shellScript)
	for _, want := range []string{
		`if [ ! -f "solar_config.json" ] && [ -f "../solar_mqtt/solar_config.json" ]; then`,
		`cp "../solar_mqtt/solar_config.json" "solar_config.json"`,
		"18868",
		".solar_mqtt_go_run",
		"go build",
		`exec "./$RUN_BINARY"`,
		`"$@"`,
	} {
		if !strings.Contains(shellSource, want) {
			t.Errorf("start.sh missing %q", want)
		}
	}
	for _, forbidden := range []string{"go run", "缺少 SOLAR_MQTT_USERNAME", "缺少 SOLAR_MQTT_PASSWORD", `[ -z "${SOLAR_MQTT_`} {
		if strings.Contains(shellSource, forbidden) {
			t.Errorf("start.sh contains forbidden content %q", forbidden)
		}
	}
}
