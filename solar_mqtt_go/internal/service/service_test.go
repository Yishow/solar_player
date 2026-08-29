package service

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"solar_mqtt_go/internal/config"
	"solar_mqtt_go/internal/mqttbus"
	"solar_mqtt_go/internal/scraper"
	"solar_mqtt_go/internal/storage"
)

// ── fake publisher：記錄所有發佈 ──

type pubCall struct {
	topic   string
	payload string
	retain  bool
}

type fakeBus struct {
	mu          sync.Mutex
	calls       []pubCall
	prefixCalls int // UpdatePrefix 呼叫次數（服務不得呼叫）
	reconnects  int // Reconnect 呼叫次數（服務不得呼叫）
}

type managerBroker struct {
	disconnected bool
}

type manualPurgeTicker struct {
	ticks   chan time.Time
	stopped chan struct{}
}

func (t *manualPurgeTicker) C() <-chan time.Time { return t.ticks }

func (t *manualPurgeTicker) Stop() {
	select {
	case <-t.stopped:
	default:
		close(t.stopped)
	}
}

func (b *managerBroker) Publish(string, string, int, bool) {}
func (b *managerBroker) Subscribe(string, int)             {}
func (b *managerBroker) Unsubscribe(string)                {}
func (b *managerBroker) Disconnect()                       { b.disconnected = true }

func (f *fakeBus) PublishJSON(topic string, data any, retain bool) bool {
	data2, _ := json.Marshal(data)
	f.mu.Lock()
	defer f.mu.Unlock()
	f.calls = append(f.calls, pubCall{topic, string(data2), retain})
	return true
}

func (f *fakeBus) Publish(topic string, payload string, retain bool) bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.calls = append(f.calls, pubCall{topic, payload, retain})
	return true
}

func (f *fakeBus) UpdatePrefix(string) { f.prefixCalls++ }
func (f *fakeBus) Reconnect(string, int, string) {
	f.reconnects++
}

func (f *fakeBus) RegisterFactory(string, mqttbus.ControlHandler) {}
func (f *fakeBus) UnregisterFactory(string)                       {}

func (f *fakeBus) snapshot() []pubCall {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]pubCall(nil), f.calls...)
}

func (f *fakeBus) topics() []string {
	var out []string
	for _, c := range f.snapshot() {
		out = append(out, c.topic)
	}
	return out
}

// ── test scaffolding ──

func newTestConfig(t *testing.T) *config.Config {
	t.Helper()
	return config.New() // 全預設
}

func newService(t *testing.T, fb *fakeBus) (*FactoryService, *config.Config, context.CancelFunc) {
	t.Helper()
	cfg := newTestConfig(t)
	st := storage.Open(filepath.Join(t.TempDir(), "t.db"), true)
	ctx, cancel := context.WithCancel(context.Background())
	svc := newFactoryService("KN", cfg, fb, st, ctx)
	t.Cleanup(cancel)
	return svc, cfg, cancel
}

// ── guard 測試 ──

func fp(v float64) *float64 { return &v }

func zone(id int, total *float64) scraper.Zone {
	return scraper.Zone{ZoneID: id, Name: "區", TotalMwh: total}
}

func TestFactoryTotalGuardComplete(t *testing.T) {
	fb := &fakeBus{}
	svc, _, _ := newService(t, fb)

	sm := &scraper.Summary{TotalPowerKw: fp(10)}
	zs := []scraper.Zone{zone(1, fp(99.1235)), zone(2, fp(0.0005))}
	svc.publishData(sm, zs)

	// total_mwh = round(99.1235 + 0.0005, 3) = 99.124
	var summary map[string]any
	for _, c := range fb.snapshot() {
		if strings.HasSuffix(c.topic, "/summary") {
			if err := json.Unmarshal([]byte(c.payload), &summary); err != nil {
				t.Fatal(err)
			}
		}
	}
	if summary["total_mwh"] != 99.124 {
		t.Errorf("total_mwh = %v, want 99.124", summary["total_mwh"])
	}
	found := false
	for _, tp := range fb.topics() {
		if strings.HasSuffix(tp, "/total_mwh") {
			found = true
		}
	}
	if !found {
		t.Error("total_mwh topic missing")
	}
}

func TestFactoryTotalGuardMissing(t *testing.T) {
	fb := &fakeBus{}
	svc, _, _ := newService(t, fb)

	// 第一輪完整：zone 1,2 → 建立完整基準
	sm := &scraper.Summary{}
	svc.publishData(sm, []scraper.Zone{zone(1, fp(10)), zone(2, fp(20))})
	nFirst := len(fb.snapshot())

	// 第二輪 zone 2 消失 → total_mwh 省略 + WARN
	sm2 := &scraper.Summary{TotalPowerKw: fp(5)}
	svc.publishData(sm2, []scraper.Zone{zone(1, fp(10))})

	calls := fb.snapshot()
	var summary map[string]any
	var alert *pubCall
	for i := nFirst; i < len(calls); i++ {
		c := calls[i]
		if strings.HasSuffix(c.topic, "/summary") {
			if err := json.Unmarshal([]byte(c.payload), &summary); err != nil {
				t.Fatal(err)
			}
		}
		if strings.HasSuffix(c.topic, "/alert") {
			a := c
			alert = &a
		}
	}
	if _, has := summary["total_mwh"]; has {
		t.Errorf("total_mwh should be omitted, got %v", summary["total_mwh"])
	}
	if alert == nil {
		t.Fatal("missing zone did not raise alert")
	}
	var alertPayload map[string]any
	if err := json.Unmarshal([]byte(alert.payload), &alertPayload); err != nil {
		t.Fatal(err)
	}
	if alertPayload["level"] != "WARN" {
		t.Errorf("alert level = %v", alertPayload["level"])
	}
	if !strings.Contains(alertPayload["message"].(string), "zone 2") {
		t.Errorf("alert message = %v", alertPayload["message"])
	}

	// nil total（非有限）也視為 invalid
	n2 := len(fb.snapshot())
	sm3 := &scraper.Summary{}
	svc.publishData(sm3, []scraper.Zone{zone(1, fp(10)), zone(2, nil), zone(3, fp(1))})
	alert2 := false
	for _, c := range fb.snapshot()[n2:] {
		if strings.HasSuffix(c.topic, "/alert") {
			alert2 = true
		}
	}
	if !alert2 {
		t.Error("nil total_mwh did not raise alert")
	}
}

func TestPublishDataTopicSetAndPayloadShape(t *testing.T) {
	fb := &fakeBus{}
	svc, _, _ := newService(t, fb)

	sm := &scraper.Summary{TotalPowerKw: fp(1.5), TodayMwh: fp(2.5), MonthMwh: fp(3.5)}
	zs := []scraper.Zone{zone(7, fp(10))}
	zs[0].PowerKw = fp(4.2)
	svc.publishData(sm, zs)

	got := map[string]bool{}
	for _, tp := range fb.topics() {
		got[tp] = true
	}
	base := "solar/KN"
	want := []string{
		base + "/summary", base + "/total_power_kw", base + "/today_mwh",
		base + "/month_mwh", base + "/total_mwh",
		base + "/zone/7",
		base + "/zone/7/power_kw", base + "/zone/7/today_kwh", base + "/zone/7/month_mwh",
		base + "/zone/7/total_mwh", base + "/zone/7/capacity_kwp", base + "/zone/7/today_hours",
	}
	for _, w := range want {
		if !got[w] {
			t.Errorf("missing topic %s", w)
		}
	}

	byTopic := map[string]pubCall{}
	for _, c := range fb.snapshot() {
		byTopic[c.topic] = c
	}
	var summary map[string]any
	if err := json.Unmarshal([]byte(byTopic[base+"/summary"].payload), &summary); err != nil {
		t.Fatal(err)
	}
	if summary["factory"] != "KN" {
		t.Errorf("summary factory = %v", summary["factory"])
	}
	ts, _ := summary["timestamp"].(string)
	if len(ts) != 19 {
		t.Errorf("timestamp = %q", ts)
	}
	if summary["total_power_kw"] != 1.5 {
		t.Errorf("total_power_kw = %v", summary["total_power_kw"])
	}
	if !byTopic[base+"/summary"].retain {
		t.Error("summary should be retained by default")
	}
	var metric map[string]any
	if err := json.Unmarshal([]byte(byTopic[base+"/zone/7/power_kw"].payload), &metric); err != nil {
		t.Fatal(err)
	}
	if metric["value"] != 4.2 {
		t.Errorf("metric value = %v", metric["value"])
	}
	var zp map[string]any
	if err := json.Unmarshal([]byte(byTopic[base+"/zone/7"].payload), &zp); err != nil {
		t.Fatal(err)
	}
	if zp["zone_id"] != float64(7) || zp["factory"] != "KN" {
		t.Errorf("zone payload = %v", zp)
	}
}

func TestPublishStatusTopicAndPayloadShape(t *testing.T) {
	fb := &fakeBus{}
	svc, _, _ := newService(t, fb)

	svc.publishStatus("running", "ready")
	calls := fb.snapshot()
	if len(calls) != 1 {
		t.Fatalf("calls = %d, want one status publication", len(calls))
	}
	if calls[0].topic != "solar/KN/status" || !calls[0].retain {
		t.Fatalf("status call = %+v", calls[0])
	}
	var payload map[string]any
	if err := json.Unmarshal([]byte(calls[0].payload), &payload); err != nil {
		t.Fatal(err)
	}
	if payload["status"] != "running" || payload["message"] != "ready" {
		t.Errorf("status payload = %v", payload)
	}
	if timestamp, ok := payload["timestamp"].(string); !ok || len(timestamp) != 19 {
		t.Errorf("status timestamp = %v", payload["timestamp"])
	}
}

func TestPublishAlertTopicAndPayloadShape(t *testing.T) {
	fb := &fakeBus{}
	cfg := config.New()
	st := storage.Open(filepath.Join(t.TempDir(), "alerts.db"), true)
	t.Cleanup(st.Close)
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	svc := newFactoryService("KN", cfg, fb, st, ctx)

	svc.onAlert("KN", "WARN", "zero power")
	calls := fb.snapshot()
	if len(calls) != 1 {
		t.Fatalf("calls = %d, want one alert publication", len(calls))
	}
	if calls[0].topic != "solar/KN/alert" || calls[0].retain {
		t.Fatalf("alert call = %+v", calls[0])
	}
	var payload map[string]any
	if err := json.Unmarshal([]byte(calls[0].payload), &payload); err != nil {
		t.Fatal(err)
	}
	if payload["level"] != "WARN" || payload["message"] != "zero power" {
		t.Errorf("alert payload = %v", payload)
	}
	alerts, err := st.HistoryAlerts(1)
	if err != nil {
		t.Fatal(err)
	}
	if len(alerts) != 1 || alerts[0].FactoryID != "KN" || alerts[0].Message != "zero power" {
		t.Errorf("stored alert = %+v", alerts)
	}
}

func TestManagerStopAllDisconnectsMqtt(t *testing.T) {
	broker := &managerBroker{}
	bus := mqttbus.New()
	bus.Attach(broker, "localhost", 1883, "solar")
	manager := NewManager(config.New(), bus, storage.Open(filepath.Join(t.TempDir(), "disconnect.db"), false))
	manager.StopAll()
	if !broker.disconnected {
		t.Fatal("StopAll left the MQTT broker connected")
	}
}

func TestManagerLedgerPurgeRunsOnTickAndStopsWithManager(t *testing.T) {
	dir := t.TempDir()
	st := storage.Open(filepath.Join(dir, "commands.db"), true)
	t.Cleanup(func() { st.Close() })
	now := time.Date(2026, 8, 29, 12, 0, 0, 0, time.UTC)
	if err := st.PutProcessedCommand(storage.CommandRecord{
		Site: "KN", RequestID: "expired", Command: "set", Status: "rejected",
		Code: "COMMAND_EXPIRED", Summary: "expired", OccurredAt: now.Add(-25 * time.Hour).Format(time.RFC3339),
		CompletedAt: now.Add(-25 * time.Hour),
	}); err != nil {
		t.Fatal(err)
	}

	ticker := &manualPurgeTicker{ticks: make(chan time.Time, 1), stopped: make(chan struct{})}
	originalTicker := newPurgeTicker
	originalNow := controlNow
	newPurgeTicker = func(time.Duration) purgeTicker { return ticker }
	controlNow = func() time.Time { return now }
	t.Cleanup(func() {
		newPurgeTicker = originalTicker
		controlNow = originalNow
	})

	manager := NewManager(config.New(), mqttbus.New(), st)
	manager.startLedgerPurge()
	ticker.ticks <- now

	deadline := time.After(time.Second)
	for {
		_, found, err := st.GetProcessedCommand("KN", "expired")
		if err != nil {
			t.Fatal(err)
		}
		if !found {
			break
		}
		select {
		case <-deadline:
			t.Fatal("periodic purge did not remove expired command")
		case <-time.After(5 * time.Millisecond):
		}
	}

	manager.cancel()
	select {
	case <-manager.ledgerPurgeDone:
	case <-time.After(time.Second):
		t.Fatal("ledger purge goroutine did not stop with manager")
	}
	select {
	case <-ticker.stopped:
	default:
		t.Fatal("purge ticker was not stopped")
	}
}

func TestConcurrentFactoryControlSavesPreserveBothChanges(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "solar_config.json")
	configJSON := []byte(`{"factories":[{"factory_id":"KN"},{"factory_id":"CL"}]}`)
	if err := os.WriteFile(configPath, configJSON, 0o644); err != nil {
		t.Fatal(err)
	}
	cfg := config.New()
	if err := cfg.Load(configPath); err != nil {
		t.Fatal(err)
	}
	st := storage.Open(filepath.Join(dir, "commands.db"), true)
	t.Cleanup(func() { st.Close() })
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	kn := newFactoryService("KN", cfg, &fakeBus{}, st, ctx)
	cl := newFactoryService("CL", cfg, &fakeBus{}, st, ctx)
	kn.saveConfig = func() error { return cfg.Save(configPath) }
	cl.saveConfig = func() error { return cfg.Save(configPath) }

	for i := 0; i < 40; i++ {
		start := make(chan struct{})
		kn.saveConfig = func() error { return cfg.Save(configPath) }
		cl.saveConfig = func() error { return cfg.Save(configPath) }
		var wg sync.WaitGroup
		wg.Add(2)
		go func(i int) {
			defer wg.Done()
			<-start
			payload := validControlEnvelope(map[string]any{"interval": 100 + i})
			payload["requestId"] = "kn-" + strconv.Itoa(i)
			kn.onControl("set", payload)
		}(i)
		go func(i int) {
			defer wg.Done()
			<-start
			payload := validControlEnvelope(map[string]any{"heartbeat_interval": 200 + i})
			payload["requestId"] = "cl-" + strconv.Itoa(i)
			cl.onControl("set", payload)
		}(i)
		close(start)
		wg.Wait()
	}

	reloaded := config.New()
	if err := reloaded.Load(configPath); err != nil {
		t.Fatal(err)
	}
	if got := reloaded.GetInt("interval", 0); got != 139 {
		t.Fatalf("KN change lost after concurrent saves: interval=%d, want 139", got)
	}
	if got := reloaded.GetInt("heartbeat_interval", 0); got != 239 {
		t.Fatalf("CL change lost after concurrent saves: heartbeat_interval=%d, want 239", got)
	}
}

func TestFactoryControlRollbackCannotOverwriteAcceptedFactoryMutation(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "solar_config.json")
	if err := os.WriteFile(configPath, []byte(`{"factories":[{"factory_id":"KN"},{"factory_id":"CL"}]}`), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg := config.New()
	if err := cfg.Load(configPath); err != nil {
		t.Fatal(err)
	}
	if err := cfg.Save(configPath); err != nil {
		t.Fatal(err)
	}
	st := storage.Open(filepath.Join(dir, "commands.db"), true)
	t.Cleanup(func() { st.Close() })
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	knBus, clBus := &fakeBus{}, &fakeBus{}
	kn := newFactoryService("KN", cfg, knBus, st, ctx)
	cl := newFactoryService("CL", cfg, clBus, st, ctx)

	aSaved := make(chan struct{})
	aRelease := make(chan struct{})
	var firstASave sync.Once
	kn.saveConfig = func() error {
		if err := cfg.Save(configPath); err != nil {
			return err
		}
		firstASave.Do(func() {
			close(aSaved)
			<-aRelease
		})
		return nil
	}
	kn.putProcessedCommand = func(storage.CommandRecord) error {
		return errors.New("fixture ledger failure")
	}
	var bSaved atomic.Bool
	cl.saveConfig = func() error {
		if err := cfg.Save(configPath); err != nil {
			return err
		}
		bSaved.Store(true)
		return nil
	}

	aDone := make(chan struct{})
	go func() {
		defer close(aDone)
		payload := validControlEnvelope(map[string]any{"interval": 31})
		payload["requestId"] = "rollback-kn"
		kn.onControl("set", payload)
	}()
	<-aSaved

	bStarted := make(chan struct{})
	bDone := make(chan struct{})
	go func() {
		close(bStarted)
		defer close(bDone)
		payload := validControlEnvelope(map[string]any{"heartbeat_interval": 41})
		payload["requestId"] = "accepted-cl"
		cl.onControl("set", payload)
	}()
	<-bStarted
	select {
	case <-bDone:
		t.Fatal("CL accepted while KN rollback transaction was paused")
	case <-time.After(100 * time.Millisecond):
	}
	close(aRelease)
	<-aDone
	<-bDone
	if !bSaved.Load() {
		t.Fatal("CL control did not persist after KN rollback completed")
	}

	if got := cfg.GetInt("interval", 0); got != 60 {
		t.Fatalf("KN interval after rollback = %d, want 60", got)
	}
	if got := cfg.GetInt("heartbeat_interval", 0); got != 41 {
		t.Fatalf("CL heartbeat interval after accepted mutation = %d, want 41", got)
	}
	reloaded := config.New()
	if err := reloaded.Load(configPath); err != nil {
		t.Fatal(err)
	}
	if got := reloaded.GetInt("interval", 0); got != 60 {
		t.Fatalf("disk KN interval after rollback = %d, want 60", got)
	}
	if got := reloaded.GetInt("heartbeat_interval", 0); got != 41 {
		t.Fatalf("disk CL heartbeat interval after accepted mutation = %d, want 41", got)
	}
}

func pendingManagerFixture(t *testing.T, ledgerStatus string) (*FactoryServiceManager, *config.Config, *storage.Storage, string) {
	t.Helper()
	dir := t.TempDir()
	configPath := filepath.Join(dir, "solar_config.json")
	cfg := config.New()
	if err := cfg.Save(configPath); err != nil {
		t.Fatal(err)
	}
	if err := cfg.Load(configPath); err != nil {
		t.Fatal(err)
	}
	cfg.ApplySet("KN", map[string]any{"interval": 31})
	pending, err := json.Marshal(map[string]any{
		"request_id": "startup-recovery",
		"factory_id": "KN",
		"config":     cfg.AsDict(),
	})
	if err != nil {
		t.Fatal(err)
	}
	pendingPath := configPath + ".pending-crash"
	if err := os.WriteFile(pendingPath, pending, 0o600); err != nil {
		t.Fatal(err)
	}
	if err := cfg.Load(configPath); err != nil {
		t.Fatal(err)
	}
	st := storage.Open(filepath.Join(dir, "commands.db"), true)
	t.Cleanup(func() { st.Close() })
	if ledgerStatus != "" {
		if err := st.PutProcessedCommand(storage.CommandRecord{
			Site: "KN", RequestID: "startup-recovery", Command: "set", Status: ledgerStatus,
			Code: "OK", Summary: "command accepted", ChangedKeys: []string{"interval"},
			OccurredAt: time.Now().UTC().Format(time.RFC3339Nano), CompletedAt: time.Now().UTC(),
		}); err != nil {
			t.Fatal(err)
		}
	}
	return NewManager(cfg, mqttbus.New(), st), cfg, st, pendingPath
}

func TestManagerRecoversPendingConfigBeforeStartingControl(t *testing.T) {
	t.Run("accepted", func(t *testing.T) {
		manager, cfg, _, pendingPath := pendingManagerFixture(t, "accepted")
		manager.StartAll()
		if got := cfg.GetInt("interval", 0); got != 31 {
			t.Fatalf("recovered interval = %d, want 31", got)
		}
		if _, err := os.Stat(pendingPath); !os.IsNotExist(err) {
			t.Fatalf("accepted pending path still exists, err=%v", err)
		}
		if len(manager.services) != 1 {
			t.Fatalf("services started = %d, want one after successful recovery", len(manager.services))
		}
		manager.StopAll()
	})

	for _, status := range []string{"", "rejected"} {
		name := "missing"
		if status != "" {
			name = "rejected"
		}
		t.Run("discard-"+name, func(t *testing.T) {
			manager, cfg, _, pendingPath := pendingManagerFixture(t, status)
			manager.StartAll()
			if got := cfg.GetInt("interval", 0); got != 60 {
				t.Fatalf("discarded pending interval = %d, want live 60", got)
			}
			if _, err := os.Stat(pendingPath); !os.IsNotExist(err) {
				t.Fatalf("discarded pending path still exists, err=%v", err)
			}
			manager.StopAll()
		})
	}
}

func TestManagerDoesNotStartWhenPendingRecoveryCommitFails(t *testing.T) {
	manager, _, _, _ := pendingManagerFixture(t, "accepted")
	path := manager.cfg.ConfigPath()
	if err := os.Remove(path); err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir(path, 0o755); err != nil {
		t.Fatal(err)
	}
	manager.StartAll()
	if len(manager.services) != 0 {
		t.Fatalf("services started after recovery failure = %d, want none", len(manager.services))
	}
	select {
	case <-manager.ctx.Done():
	case <-time.After(time.Second):
		t.Fatal("manager did not fail closed after recovery failure")
	}
	manager.StopAll()
}

func TestManagerDoesNotConsumePendingWhenLedgerUnavailable(t *testing.T) {
	manager, _, st, pendingPath := pendingManagerFixture(t, "")
	st.Close()
	manager.st = storage.Open(filepath.Join(t.TempDir(), "disabled.db"), false)
	if err := manager.StartAll(); err == nil {
		t.Fatal("StartAll should fail when pending ledger is unavailable")
	}
	if _, err := os.Stat(pendingPath); err != nil {
		t.Fatalf("pending removed while ledger unavailable: %v", err)
	}
	if len(manager.services) != 0 {
		t.Fatalf("services started while ledger unavailable = %d", len(manager.services))
	}
	manager.StopAll()
}

func TestManagerDoesNotConsumePendingWhenLedgerWasClosed(t *testing.T) {
	manager, _, st, pendingPath := pendingManagerFixture(t, "accepted")
	st.Close()
	if err := manager.StartAll(); err == nil {
		t.Fatal("StartAll should fail when its ledger was closed")
	}
	if _, err := os.Stat(pendingPath); err != nil {
		t.Fatalf("pending removed after closed ledger lookup: %v", err)
	}
	if len(manager.services) != 0 {
		t.Fatalf("services started after closed ledger lookup = %d", len(manager.services))
	}
	manager.StopAll()
}

func TestManagerRecoversMultipleFactoryPendingSnapshotsInOrder(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "solar_config.json")
	initial := `{"factories":[{"factory_id":"KN","base_url":"http://kn","login_user":"u","login_pass":"p"},{"factory_id":"CL","base_url":"http://cl","login_user":"u","login_pass":"p"}]}`
	if err := os.WriteFile(configPath, []byte(initial), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg := config.New()
	if err := cfg.Load(configPath); err != nil {
		t.Fatal(err)
	}
	cfg.ApplySet("KN", map[string]any{"interval": 31})
	first, err := json.Marshal(map[string]any{
		"request_id": "kn-pending", "factory_id": "KN", "config": cfg.AsDict(),
	})
	if err != nil {
		t.Fatal(err)
	}
	cfg.ApplySet("CL", map[string]any{"heartbeat_interval": 41})
	second, err := json.Marshal(map[string]any{
		"request_id": "cl-pending", "factory_id": "CL", "config": cfg.AsDict(),
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := cfg.Load(configPath); err != nil {
		t.Fatal(err)
	}
	firstPath := configPath + ".pending-kn"
	secondPath := configPath + ".pending-cl"
	if err := os.WriteFile(firstPath, first, 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(secondPath, second, 0o600); err != nil {
		t.Fatal(err)
	}
	st := storage.Open(filepath.Join(dir, "commands.db"), true)
	t.Cleanup(func() { st.Close() })
	for _, record := range []struct{ site, requestID string }{{"KN", "kn-pending"}, {"CL", "cl-pending"}} {
		if err := st.PutProcessedCommand(storage.CommandRecord{
			Site: record.site, RequestID: record.requestID, Command: "set", Status: "accepted",
			Code: "OK", Summary: "accepted", CompletedAt: time.Now().UTC(),
		}); err != nil {
			t.Fatal(err)
		}
	}
	if err := os.Chtimes(secondPath, time.Now().Add(time.Second), time.Now().Add(time.Second)); err != nil {
		t.Fatal(err)
	}
	manager := NewManager(cfg, mqttbus.New(), st)
	if err := manager.StartAll(); err != nil {
		t.Fatalf("StartAll = %v", err)
	}
	if got := cfg.GetInt("interval", 0); got != 31 {
		t.Fatalf("recovered interval = %d, want 31", got)
	}
	if got := cfg.GetInt("heartbeat_interval", 0); got != 41 {
		t.Fatalf("recovered heartbeat interval = %d, want 41", got)
	}
	for _, pendingPath := range []string{firstPath, secondPath} {
		if _, err := os.Stat(pendingPath); !os.IsNotExist(err) {
			t.Fatalf("pending path %s still exists, err=%v", pendingPath, err)
		}
	}
	manager.StopAll()
}

// ── control contract ──

func TestConfigRequestPublishesSanitizedState(t *testing.T) {
	fb := &fakeBus{}
	svc, _, _ := newService(t, fb)

	svc.onControl("get-config", validGetConfigEnvelope())
	calls := fb.snapshot()
	if len(calls) != 2 {
		t.Fatalf("calls = %d, want state and result publications", len(calls))
	}
	var c pubCall
	for _, call := range calls {
		if call.topic == "solar/KN/state/config" {
			c = call
			break
		}
	}
	if c.topic == "" {
		t.Fatalf("calls = %+v, missing state publication", calls)
	}
	if c.topic != "solar/KN/state/config" {
		t.Errorf("topic = %s", c.topic)
	}
	if !c.retain {
		t.Error("config state should be retained")
	}
	state := decodeCall(t, c)
	if state["factory_id"] != "KN" || state["interval"] != float64(60) {
		t.Errorf("safe state missing: %v", state)
	}
	for _, forbidden := range []string{"login_pass", "login_user", "base_url", "mqtt_host", "mqtt_port", "mosquitto_path", "mosquitto_config"} {
		if _, has := state[forbidden]; has {
			t.Errorf("state exposes forbidden field %q", forbidden)
		}
	}
}

func TestControlCommitFailureCancelsManagerContext(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "solar_config.json")
	cfg := config.New()
	if err := cfg.Save(configPath); err != nil {
		t.Fatal(err)
	}
	if err := cfg.Load(configPath); err != nil {
		t.Fatal(err)
	}
	st := storage.Open(filepath.Join(dir, "commands.db"), true)
	t.Cleanup(func() { st.Close() })
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	svc := newFactoryService("KN", cfg, &fakeBus{}, st, ctx)
	svc.failClosed = cancel
	svc.stageConfig = func(factoryID, requestID string) (*config.StagedSave, error) {
		staged, err := cfg.StageRemoteSet(configPath, factoryID, requestID)
		if err != nil {
			return nil, err
		}
		if err := os.Remove(configPath); err != nil {
			return nil, err
		}
		if err := os.Mkdir(configPath, 0o755); err != nil {
			return nil, err
		}
		return staged, nil
	}
	svc.onControl("set", validControlEnvelope(map[string]any{"interval": 31}))
	select {
	case <-ctx.Done():
	default:
		t.Fatal("commit failure did not cancel manager context")
	}
	if got := cfg.GetInt("interval", 0); got != 60 {
		t.Fatalf("memory config after commit failure = %d, want 60", got)
	}
}

func TestControlAppliedCommitCleanupFailureKeepsAcceptedStateAndFailsClosed(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "solar_config.json")
	if err := os.WriteFile(configPath, []byte(`{"factories":[{"factory_id":"KN"},{"factory_id":"CL"}]}`), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg := config.New()
	if err := cfg.Load(configPath); err != nil {
		t.Fatal(err)
	}
	if err := cfg.Save(configPath); err != nil {
		t.Fatal(err)
	}
	st := storage.Open(filepath.Join(dir, "commands.db"), true)
	t.Cleanup(func() { st.Close() })
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	knBus, clBus := &fakeBus{}, &fakeBus{}
	kn := newFactoryService("KN", cfg, knBus, st, ctx)
	cl := newFactoryService("CL", cfg, clBus, st, ctx)
	kn.failClosed = cancel
	kn.stageConfig = func(factoryID, requestID string) (*config.StagedSave, error) {
		return cfg.StageRemoteSet(configPath, factoryID, requestID)
	}
	kn.commitStaged = func(staged *config.StagedSave) error {
		if err := staged.Commit(); err != nil {
			return err
		}
		return &config.CommitError{Applied: true, Err: errors.New("forced cleanup failure after rename")}
	}

	kn.onControl("set", validControlEnvelope(map[string]any{"interval": 31}))
	select {
	case <-ctx.Done():
	default:
		t.Fatal("applied cleanup failure did not cancel manager context")
	}
	if got := cfg.GetInt("interval", 0); got != 31 {
		t.Fatalf("memory config after applied cleanup failure = %d, want 31", got)
	}
	reloaded := config.New()
	if err := reloaded.Load(configPath); err != nil {
		t.Fatal(err)
	}
	if got := reloaded.GetInt("interval", 0); got != 31 {
		t.Fatalf("disk config after applied cleanup failure = %d, want 31", got)
	}
	record, found, err := st.GetProcessedCommand("KN", "abc-123")
	if err != nil || !found || record == nil || record.Status != "accepted" {
		t.Fatalf("ledger after applied cleanup failure = record=%+v found=%v err=%v, want accepted", record, found, err)
	}
	var accepted bool
	for _, call := range knBus.snapshot() {
		if call.topic != "solar/KN/state/control-result" {
			continue
		}
		var result controlResult
		if err := json.Unmarshal([]byte(call.payload), &result); err != nil {
			t.Fatal(err)
		}
		accepted = result.Status == "accepted"
	}
	if !accepted {
		t.Fatalf("control result after applied cleanup failure = %+v, want accepted", knBus.snapshot())
	}

	cl.stageConfig = func(factoryID, requestID string) (*config.StagedSave, error) {
		return cfg.StageRemoteSet(configPath, factoryID, requestID)
	}
	cl.onControl("set", validControlEnvelope(map[string]any{"heartbeat_interval": 41}))
	if got := cfg.GetInt("heartbeat_interval", 0); got != 30 {
		t.Fatalf("other factory accepted command after manager fail-closed: heartbeat_interval=%d", got)
	}
	if calls := clBus.snapshot(); len(calls) != 0 {
		t.Fatalf("other factory published after manager fail-closed: %+v", calls)
	}
}

func TestLegacySetWithoutEnvelopeIsIgnored(t *testing.T) {
	fb := &fakeBus{}
	svc, _, _ := newService(t, fb)

	svc.onControl("set", map[string]any{"restart": true})

	if svc.stopCtx.Err() != nil {
		t.Fatal("legacy set unexpectedly cancelled stop context")
	}
	if len(fb.snapshot()) != 0 {
		t.Fatalf("legacy set published control output: %+v", fb.snapshot())
	}
}

func TestControlCredentialChangeIsRejected(t *testing.T) {
	fb := &fakeBus{}
	svc, cfg, _ := newService(t, fb)
	before := cfg.Factory("KN")["login_pass"]

	svc.onControl("set", validControlEnvelope(map[string]any{"login_pass": "newpass"}))
	if cfg.Factory("KN")["login_pass"] != before {
		t.Errorf("login_pass changed to %v", cfg.Factory("KN")["login_pass"])
	}
	calls := fb.snapshot()
	if len(calls) != 1 || calls[0].topic != "solar/KN/state/control-result" {
		t.Fatalf("calls = %+v, want one rejected result", calls)
	}
}

func TestControlPrefixChangeIsRejected(t *testing.T) {
	fb := &fakeBus{}
	svc, cfg, _ := newService(t, fb)

	svc.onControl("set", validControlEnvelope(map[string]any{"mqtt_prefix": "solar2"}))

	if fb.prefixCalls != 0 {
		t.Errorf("service called bus.UpdatePrefix %d times", fb.prefixCalls)
	}
	if cfg.GetString("mqtt_prefix", "") != "solar" {
		t.Errorf("config prefix = %v", cfg.Get("mqtt_prefix"))
	}
	if svc.heartbeat.Prefix() != "solar" {
		t.Errorf("heartbeat prefix = %s", svc.heartbeat.Prefix())
	}
	if svc.haTracker.Pending() {
		t.Error("discovery unexpectedly marked pending after rejected prefix change")
	}
}

func TestControlBrokerChangeIsRejected(t *testing.T) {
	fb := &fakeBus{}
	svc, cfg, _ := newService(t, fb)

	svc.onControl("set", validControlEnvelope(map[string]any{"mqtt_host": "broker2", "mqtt_port": 1884}))

	if fb.reconnects != 0 {
		t.Errorf("service triggered reconnect %d times", fb.reconnects)
	}
	if cfg.GetString("mqtt_host", "") != "localhost" {
		t.Errorf("mqtt_host = %v", cfg.Get("mqtt_host"))
	}
	if cfg.GetInt("mqtt_port", 0) != 1883 {
		t.Errorf("mqtt_port = %v", cfg.Get("mqtt_port"))
	}
}
