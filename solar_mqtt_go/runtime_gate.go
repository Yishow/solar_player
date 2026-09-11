package main

import (
	"fmt"
	"os"

	"solar_mqtt_go/internal/config"
	"solar_mqtt_go/internal/mqttbus"
)

func runDataPlaneCommand(name string, fn func() int) int {
	if err := config.ValidateDataPlaneFile(configPathFor()); err != nil {
		fmt.Fprintf(os.Stderr, "%s：Solar 設定未就緒，已停止資料擷取：%v\n", name, err)
		return 1
	}
	return fn()
}

func runDataPlaneDefault() int {
	return runDataPlaneCommand("run", cmdRun)
}

func runDataPlaneOnce() int {
	return runDataPlaneCommand("once", cmdOnce)
}

func runDataPlaneTestLogin(factoryID string) int {
	return runDataPlaneCommand("test-login", func() int { return cmdTestLogin(factoryID) })
}

func runDataPlaneDumpAPI(factoryID string) int {
	return runDataPlaneCommand("dump-api", func() int { return cmdDumpAPI(factoryID) })
}

// runTrayWithConfigGate keeps the local tray/WebUI available when the Solar
// collector configuration is missing or incomplete, but blocks the MQTT/data
// plane for the lifetime of that tray session. After saving a valid config the
// operator restarts the tray so Config is loaded from disk again.
func runTrayWithConfigGate() int {
	if err := config.ValidateDataPlaneFile(configPathFor()); err == nil {
		return cmdTray()
	} else {
		fmt.Fprintf(os.Stderr, "tray：Solar 設定未就緒，僅啟動本機設定介面；儲存完整設定後請重新啟動：%v\n", err)
	}

	originalConnect := connectMQTTBusFn
	connectMQTTBusFn = func(*mqttbus.Bus, mqttbus.ConnectionOptions) bool { return false }
	defer func() { connectMQTTBusFn = originalConnect }()
	return cmdTray()
}
