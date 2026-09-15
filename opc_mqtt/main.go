//go:build windows

package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"opc_mqtt/internal/config"
	"opc_mqtt/internal/dde"
	"opc_mqtt/internal/engine"
	mqttpkg "opc_mqtt/internal/mqtt"
	"opc_mqtt/internal/state"
	"opc_mqtt/internal/webui"
	"opc_mqtt/internal/winsvc"
)

type mqttPublisher interface {
	Connect(broker string, port int, qos byte, retain bool) error
	Disconnect()
	PublishVirtual(prefix string, results []engine.Result, qos byte, retain bool) error
	PublishRaw(prefix string, tags []config.TagConfig, rawValues map[string]state.TagValue, qos byte, retain bool) error
}

type dataReader interface {
	Connect(service, topic string, timeoutMs int) error
	ReadTags(items []string) (map[string]float64, map[string]error)
	Disconnect()
}

func exeDir() string {
	exe, err := os.Executable()
	if err != nil {
		return "."
	}
	return filepath.Dir(exe)
}

func splitCommandArgs(args []string) (string, []string) {
	if len(args) == 0 {
		return "", nil
	}
	if args[0] != "" && args[0][0] != '-' {
		return args[0], args[1:]
	}
	return "", args
}

func userFacingWebURL(addr string, port int) string {
	switch addr {
	case "", "0.0.0.0", "::", "[::]":
		addr = "127.0.0.1"
	}
	return fmt.Sprintf("http://%s:%d", addr, port)
}

func main() {
	command, flagArgs := splitCommandArgs(os.Args[1:])
	switch command {
	case "install-service":
		log.Fatal("直接 DDE 模式不支援 Windows Service；請在 VIEW.exe 相同的登入 Session 啟動")
	case "uninstall-service":
		if err := winsvc.Uninstall(); err != nil {
			log.Fatal(err)
		}
		return
	case "", "run":
	default:
		log.Fatalf("未知指令: %s", command)
	}

	flags := flag.NewFlagSet("opc_mqtt", flag.ExitOnError)
	brokerFlag := flags.String("broker", "", "MQTT broker IP")
	portFlag := flags.String("port", "", "MQTT broker port")
	intervalFlag := flags.String("interval", "", "publish interval (sec)")
	webPortFlag := flags.String("web-port", "", "Web UI port")
	configFlag := flags.String("config", filepath.Join(exeDir(), "opc_config.json"), "config file path")
	if err := flags.Parse(flagArgs); err != nil {
		log.Fatal(err)
	}

	cfg, err := config.Load(*configFlag)
	if err != nil {
		log.Fatalf("設定檔載入失敗: %v", err)
	}
	cfg.ApplyCLI(*brokerFlag, *portFlag, *intervalFlag, *webPortFlag)

	st := state.New()

	reader, err := dde.NewWindowsReader()
	if err != nil {
		log.Printf("警告：DDE reader 初始化失敗: %v", err)
	}

	publisher := mqttpkg.New(st)

	run := func(stop <-chan struct{}) {
		currentCfg := cfg.Get()

		server := webui.New(
			cfg,
			st,
			func() {
				if !st.Snapshot().OpcConnected {
					connectDDE(cfg, st, reader)
				}
				doRead(cfg, st, reader)
			},
			func() { doPublish(cfg, st, publisher) },
		)

		addr := fmt.Sprintf("%s:%d", currentCfg.WebAddr, currentCfg.WebPort)
		if err := server.Start(addr); err != nil {
			log.Printf("Web UI 啟動失敗: %v", err)
		} else {
			log.Printf("Web UI: %s", userFacingWebURL(currentCfg.WebAddr, currentCfg.WebPort))
		}
		defer server.Stop()

		connectDDE(cfg, st, reader)
		connectMqtt(cfg, st, publisher)

		ticker := time.NewTicker(time.Duration(currentCfg.PublishInterval) * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-stop:
				publisher.Disconnect()
				if reader != nil {
					reader.Disconnect()
				}
				return
			case <-ticker.C:
				nextCfg := cfg.Get()
				conversationChanged := nextCfg.DdeService != currentCfg.DdeService ||
					nextCfg.DdeTopic != currentCfg.DdeTopic ||
					nextCfg.DdeTimeoutMs != currentCfg.DdeTimeoutMs
				if conversationChanged || !st.Snapshot().OpcConnected {
					connectDDE(cfg, st, reader)
				}
				doRead(cfg, st, reader)
				doPublish(cfg, st, publisher)

				if nextCfg.PublishInterval != currentCfg.PublishInterval {
					ticker.Reset(time.Duration(nextCfg.PublishInterval) * time.Second)
				}
				currentCfg = nextCfg
			}
		}
	}

	if winsvc.IsService() {
		log.Fatal("直接 DDE 模式必須與 VIEW.exe 位於相同登入 Session，不能以 Windows Service 執行")
	}

	stop := make(chan struct{})
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		run(stop)
	}()
	waitInterrupt(stop)
	wg.Wait()
}

func connectDDE(cfg *config.Config, st *state.State, reader dataReader) {
	if reader == nil {
		return
	}

	snap := cfg.Get()
	if err := reader.Connect(snap.DdeService, snap.DdeTopic, snap.DdeTimeoutMs); err != nil {
		st.SetOpcConnected(false)
		st.AddError(fmt.Sprintf("DDE 連線失敗: %v", err))
		log.Printf("DDE 連線失敗: %v", err)
		return
	}

	st.SetOpcConnected(true)
	log.Printf("DDE 已連線: %s/%s", snap.DdeService, snap.DdeTopic)
}

func connectMqtt(cfg *config.Config, st *state.State, publisher mqttPublisher) {
	if publisher == nil {
		return
	}

	snap := cfg.Get()
	if err := publisher.Connect(snap.Broker, snap.BrokerPort, snap.MqttQos, snap.MqttRetain); err != nil {
		st.SetMqttConnected(false)
		st.AddError(fmt.Sprintf("MQTT 連線失敗: %v", err))
		log.Printf("MQTT 連線失敗: %v", err)
		return
	}

	st.SetMqttConnected(true)
}

func doRead(cfg *config.Config, st *state.State, reader dataReader) {
	if reader == nil {
		return
	}

	snap := cfg.Get()
	items := make([]string, 0, len(snap.Tags))
	itemToID := make(map[string]string, len(snap.Tags))
	for _, tag := range snap.Tags {
		if !tag.Enabled {
			continue
		}
		items = append(items, tag.DdeItem)
		itemToID[tag.DdeItem] = tag.ID
	}

	values, errs := reader.ReadTags(items)
	rawValues := make(map[string]state.TagValue)
	successCount := 0

	for item, value := range values {
		tagID := itemToID[item]
		if tagID == "" {
			st.AddError(fmt.Sprintf("DDE 回傳未知項目: %s", item))
			continue
		}
		rawValues[tagID] = state.TagValue{Value: value, Ok: true}
		successCount++
	}

	for item, err := range errs {
		tagID := itemToID[item]
		if tagID == "" {
			st.AddError(fmt.Sprintf("讀取未知 DDE 項目 %s 失敗: %v", item, err))
			continue
		}
		rawValues[tagID] = state.TagValue{Ok: false, ErrMsg: err.Error()}
		st.AddError(fmt.Sprintf("讀取 %s 失敗: %v", item, err))
	}

	st.SetRawValues(rawValues)

	results := engine.Compute(snap.VirtualTags, rawValues)
	virtualValues := make([]state.VirtualValue, len(results))
	for i, result := range results {
		virtualValues[i] = state.VirtualValue{
			Name:  result.Name,
			Value: result.Value,
			Unit:  result.Unit,
			Ok:    result.Ok,
		}
	}
	st.SetVirtualValues(virtualValues)

	if successCount > 0 {
		st.SetOpcConnected(true)
		st.SetLastRead(time.Now())
	} else if len(errs) > 0 {
		st.SetOpcConnected(false)
	}
}

func doPublish(cfg *config.Config, st *state.State, publisher mqttPublisher) {
	if publisher == nil {
		return
	}

	snap := cfg.Get()
	stateSnap := st.Snapshot()
	attempted := false
	failed := false

	if snap.PublishVirtual {
		attempted = true
		results := make([]engine.Result, 0, len(stateSnap.VirtualValues))
		for _, value := range stateSnap.VirtualValues {
			results = append(results, engine.Result{
				Name:  value.Name,
				Value: value.Value,
				Unit:  value.Unit,
				Ok:    value.Ok,
			})
		}

		if err := publisher.PublishVirtual(snap.MqttPrefix, results, snap.MqttQos, snap.MqttRetain); err != nil {
			failed = true
			st.AddError(fmt.Sprintf("publish virtual 失敗: %v", err))
			log.Printf("publish virtual 失敗: %v", err)
		}
	}

	if snap.PublishRaw {
		attempted = true
		if err := publisher.PublishRaw(snap.MqttPrefix, snap.Tags, stateSnap.RawValues, snap.MqttQos, snap.MqttRetain); err != nil {
			failed = true
			st.AddError(fmt.Sprintf("publish raw 失敗: %v", err))
			log.Printf("publish raw 失敗: %v", err)
		}
	}

	if attempted && !failed {
		st.SetLastPublish(time.Now())
	}
}
