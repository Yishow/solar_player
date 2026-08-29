// EZ-Solar 發電量擷取服務 CLI（Go 版）。
//
// 對應 Python 版 scrape_solar.py 的子命令介面：
//
//	solar_mqtt_go run                 # 循環執行（預設）
//	solar_mqtt_go once                # 每廠各跑一輪
//	solar_mqtt_go test-login [ID]     # 測試登入
//	solar_mqtt_go test-mqtt           # 測試 MQTT 連線
//	solar_mqtt_go dump-api [ID]       # 印出 API 原始 JSON
//	solar_mqtt_go history [-f ID] [-n N]
//	solar_mqtt_go alerts [-n N]
package main

import (
	"flag"
	"fmt"
	"os"
	"runtime"
	"strings"

	"solar_mqtt_go/internal/tray"
)

const usageText = `EZ-Solar 發電量擷取

用法：
  solar_mqtt_go run                 # 循環執行（預設）
  solar_mqtt_go once                # 每廠各跑一輪
  solar_mqtt_go test-login [FACTORY_ID]
  solar_mqtt_go test-mqtt
  solar_mqtt_go dump-api [FACTORY_ID]
  solar_mqtt_go history [--factory KN] [--limit 50]
  solar_mqtt_go alerts [--limit 50]
`

// extractLegacyOnce 抽出舊版相容的全域 --once / -o 旗標（可在任何位置）。
func extractLegacyOnce(args []string) ([]string, bool) {
	out := args[:0:0]
	once := false
	for _, a := range args {
		if a == "--once" || a == "-o" {
			once = true
			continue
		}
		out = append(out, a)
	}
	return out, once
}

// launch mode 與各入口可測試替換。
var (
	trayAvailableFn = tray.Available
	runDefaultFn    = cmdRun
	runTrayFn       = runTrayOrFail
	defaultGOOS     = func() string { return runtime.GOOS }
)

func runTrayOrFail() int {
	if !trayAvailableFn() {
		fmt.Fprintln(os.Stderr, "tray：系統列不可用，請使用一般 run 子命令")
		return 1
	}
	return cmdTray()
}

// runCLI 解析參數並分派子命令，回傳 process exit code。
func runCLI(args []string) int {
	args, legacyOnce := extractLegacyOnce(args)

	if len(args) == 0 {
		if legacyOnce {
			return cmdOnce()
		}
		if defaultGOOS() == "windows" {
			return runTrayFn()
		}
		return runDefaultFn()
	}

	switch args[0] {
	case "tray":
		return runTrayFn()
	case "run":
		return cmdRun()
	case "once":
		return cmdOnce()
	case "test-login":
		return cmdTestLogin(firstArg(args[1:]))
	case "test-mqtt":
		return cmdTestMqtt()
	case "dump-api":
		return cmdDumpAPI(firstArg(args[1:]))
	case "history":
		fs := flag.NewFlagSet("history", flag.ContinueOnError)
		factory := fs.String("factory", "", "工廠 ID")
		fs.StringVar(factory, "f", "", "工廠 ID（短選項）")
		limit := fs.Int("limit", 50, "筆數上限")
		fs.IntVar(limit, "n", 50, "筆數上限（短選項）")
		if err := fs.Parse(args[1:]); err != nil {
			return 2
		}
		return cmdHistory(*factory, *limit)
	case "alerts":
		fs := flag.NewFlagSet("alerts", flag.ContinueOnError)
		limit := fs.Int("limit", 50, "筆數上限")
		fs.IntVar(limit, "n", 50, "筆數上限（短選項）")
		if err := fs.Parse(args[1:]); err != nil {
			return 2
		}
		return cmdAlerts(*limit)
	case "-h", "--help", "help":
		fmt.Print(usageText)
		return 0
	default:
		fmt.Fprintf(os.Stderr, "未知命令：%s\n\n", args[0])
		fmt.Print(usageText)
		return 1
	}
}

func firstArg(args []string) string {
	for _, a := range args {
		if !strings.HasPrefix(a, "-") {
			return a
		}
	}
	return ""
}

func main() {
	os.Exit(runCLI(os.Args[1:]))
}
