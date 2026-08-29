package service

import (
	"context"
	"encoding/json"
	"errors"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"solar_mqtt_go/internal/config"
	"solar_mqtt_go/internal/scraper"
	"solar_mqtt_go/internal/storage"
)

func decodeCall(t *testing.T, call pubCall) map[string]any {
	t.Helper()
	var payload map[string]any
	if err := json.Unmarshal([]byte(call.payload), &payload); err != nil {
		t.Fatalf("payload is not JSON: %v", err)
	}
	return payload
}

func validControlEnvelope(changes map[string]any) map[string]any {
	if changes == nil {
		changes = map[string]any{}
	}
	return map[string]any{
		"requestId":  "abc-123",
		"issuedAt":   time.Now().UTC().Format(time.RFC3339),
		"ttlSeconds": 60,
		"changes":    changes,
	}
}

func validGetConfigEnvelope() map[string]any {
	return map[string]any{
		"requestId":  "get-123",
		"issuedAt":   time.Now().UTC().Format(time.RFC3339),
		"ttlSeconds": 60,
	}
}

func containsText(value any, want string) bool {
	switch v := value.(type) {
	case string:
		return strings.Contains(v, want)
	case map[string]any:
		for _, child := range v {
			if containsText(child, want) {
				return true
			}
		}
	case []any:
		for _, child := range v {
			if containsText(child, want) {
				return true
			}
		}
	}
	return false
}

func TestControlConfigPublishesSanitizedStateOnSeparateTopic(t *testing.T) {
	fb := &fakeBus{}
	svc, _, _ := newService(t, fb)

	svc.onControl("get-config", validGetConfigEnvelope())
	calls := fb.snapshot()
	if len(calls) != 2 {
		t.Fatalf("calls = %d, want state and result publications", len(calls))
	}
	var state *pubCall
	for i := range calls {
		if calls[i].topic == "solar/KN/state/config" {
			state = &calls[i]
		}
	}
	if state == nil {
		t.Fatalf("calls = %+v, missing state publication", calls)
	}
	if !state.retain {
		t.Error("sanitized config state must be retained")
	}
	payload := decodeCall(t, *state)
	if payload["factory_id"] != "KN" || payload["interval"] != float64(60) {
		t.Errorf("safe operational state missing: %v", payload)
	}
	for _, forbidden := range []string{"login_pass", "login_user", "base_url", "mqtt_host", "mqtt_port", "mosquitto_path", "mosquitto_config"} {
		if _, ok := payload[forbidden]; ok {
			t.Errorf("state exposes forbidden field %q", forbidden)
		}
	}
	if containsText(payload, "toyota") {
		t.Error("state exposes seeded credential value")
	}
}

func TestControlSetAcceptsAllowlistedChangesAndPublishesBoundedResult(t *testing.T) {
	fb := &fakeBus{}
	svc, cfg, _ := newService(t, fb)

	svc.onControl("set", validControlEnvelope(map[string]any{"interval": 30}))
	if cfg.GetInt("interval", 0) != 30 {
		t.Fatalf("interval = %d, want 30", cfg.GetInt("interval", 0))
	}
	calls := fb.snapshot()
	var state, result *pubCall
	for i := range calls {
		switch calls[i].topic {
		case "solar/KN/state/config":
			state = &calls[i]
		case "solar/KN/state/control-result":
			result = &calls[i]
		}
	}
	if state == nil || result == nil {
		t.Fatalf("calls = %+v, want state and result", calls)
	}
	if result.retain {
		t.Error("control result must not be retained")
	}
	resultPayload := decodeCall(t, *result)
	if resultPayload["requestId"] != "abc-123" || resultPayload["command"] != "set" || resultPayload["status"] != "accepted" {
		t.Errorf("result correlation/status = %v", resultPayload)
	}
	if !containsText(resultPayload["changedKeys"], "interval") {
		t.Errorf("result changedKeys = %v", resultPayload["changedKeys"])
	}
}

func TestGetConfigCommandPublishesSeparateStateAndResult(t *testing.T) {
	fb := &fakeBus{}
	svc, _, _ := newService(t, fb)

	svc.onControl("get-config", validGetConfigEnvelope())
	calls := fb.snapshot()
	if len(calls) != 2 {
		t.Fatalf("calls = %d, want state and result", len(calls))
	}
	if calls[0].topic != "solar/KN/state/config" || !calls[0].retain {
		t.Errorf("state call = %+v", calls[0])
	}
	if calls[1].topic != "solar/KN/state/control-result" || calls[1].retain {
		t.Errorf("result call = %+v", calls[1])
	}
	result := decodeCall(t, calls[1])
	if result["requestId"] != "get-123" || result["command"] != "get-config" || result["status"] != "accepted" {
		t.Errorf("get-config result = %v", result)
	}
}

func TestControlResultIncludesZeroConfigRevision(t *testing.T) {
	fb := &fakeBus{}
	svc, _, _ := newService(t, fb)

	svc.onControl("get-config", validGetConfigEnvelope())
	var result map[string]any
	for _, call := range fb.snapshot() {
		if call.topic == "solar/KN/state/control-result" {
			result = decodeCall(t, call)
		}
	}
	if result == nil {
		t.Fatal("missing control result")
	}
	if revision, ok := result["configRevision"]; !ok || revision != float64(0) {
		t.Fatalf("configRevision = %v, present=%v, want explicit zero", revision, ok)
	}
}

func TestControlSetRejectsForbiddenAndUnknownAtomicallyWithoutEcho(t *testing.T) {
	fb := &fakeBus{}
	svc, cfg, _ := newService(t, fb)
	beforePass := cfg.Factory("KN")["login_pass"]

	payload := validControlEnvelope(map[string]any{
		"interval":   30,
		"login_pass": "super-secret",
		"future_key": "ignored",
	})
	svc.onControl("set", payload)

	if cfg.GetInt("interval", 0) != 60 {
		t.Errorf("invalid atomic request partially changed interval = %d", cfg.GetInt("interval", 0))
	}
	if cfg.Factory("KN")["login_pass"] != beforePass {
		t.Error("forbidden credential field changed")
	}
	calls := fb.snapshot()
	if len(calls) != 1 || calls[0].topic != "solar/KN/state/control-result" {
		t.Fatalf("calls = %+v, want one non-retained result", calls)
	}
	if calls[0].retain {
		t.Error("rejected control result must not be retained")
	}
	result := decodeCall(t, calls[0])
	if result["status"] != "rejected" || result["code"] == "" {
		t.Errorf("rejection result = %v", result)
	}
	if containsText(result, "super-secret") {
		t.Error("rejected secret echoed in result")
	}
}

func TestMalformedControlEnvelopeProducesBoundedResult(t *testing.T) {
	fb := &fakeBus{}
	svc, _, _ := newService(t, fb)

	svc.onControl("set", map[string]any{"requestId": "bad-1"})
	calls := fb.snapshot()
	if len(calls) != 1 || calls[0].topic != "solar/KN/state/control-result" {
		t.Fatalf("calls = %+v, want one non-retained result", calls)
	}
	if calls[0].retain {
		t.Error("malformed command result must not be retained")
	}
	result := decodeCall(t, calls[0])
	if result["requestId"] != "bad-1" || result["status"] != "rejected" {
		t.Errorf("malformed result = %v", result)
	}
	if len(result["summary"].(string)) > 256 {
		t.Error("result summary is unbounded")
	}
}

func TestControlHardeningLeavesSolarDataTopicsUnchanged(t *testing.T) {
	fb := &fakeBus{}
	svc, _, _ := newService(t, fb)
	svc.publishData(
		&scraper.Summary{TotalPowerKw: fp(1)},
		[]scraper.Zone{{ZoneID: 1, TotalMwh: fp(1.0)}},
	)
	seen := map[string]bool{}
	for _, call := range fb.snapshot() {
		seen[call.topic] = true
	}
	for _, topic := range []string{
		"solar/KN/summary",
		"solar/KN/zone/1",
		"solar/KN/zone/1/total_mwh",
	} {
		if !seen[topic] {
			t.Errorf("missing unchanged Solar data topic %s", topic)
		}
	}
}

func persistentControlService(t *testing.T, dbPath string, stopAll context.CancelFunc) (*FactoryService, *config.Config, *storage.Storage, context.CancelFunc) {
	t.Helper()
	cfg := config.New()
	st := storage.Open(dbPath, true)
	ctx, cancel := context.WithCancel(context.Background())
	_ = stopAll
	svc := newFactoryService("KN", cfg, &fakeBus{}, st, ctx)
	t.Cleanup(func() {
		cancel()
		st.Close()
	})
	return svc, cfg, st, cancel
}

func TestControlRestartIsRejectedWithoutApplyingChanges(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "commands.db")
	restarts := 0
	stopAll := func() { restarts++ }
	svc, cfg, st, _ := persistentControlService(t, dbPath, stopAll)
	payload := validControlEnvelope(map[string]any{"interval": 30})
	payload["restart"] = true

	svc.onControl("set", payload)
	svc.onControl("set", payload)
	if restarts != 0 {
		t.Fatalf("restart side effects = %d, want none", restarts)
	}
	if got := cfg.GetInt("interval", 0); got != 60 {
		t.Fatalf("interval = %d, want unchanged 60", got)
	}
	calls := svc.bus.(*fakeBus).snapshot()
	if len(calls) != 2 {
		t.Fatalf("restart result calls = %d, want fresh and duplicate result", len(calls))
	}
	firstResult := decodeCall(t, calls[0])
	if firstResult["status"] != "rejected" || firstResult["code"] != "RESTART_UNSUPPORTED" {
		t.Fatalf("fresh restart result = %v", firstResult)
	}
	duplicateResult := decodeCall(t, calls[1])
	if duplicateResult["status"] != "duplicate" || duplicateResult["code"] != "DUPLICATE_REQUEST" {
		t.Fatalf("duplicate restart result = %v", duplicateResult)
	}
	record, found, err := st.GetProcessedCommand("KN", "abc-123")
	if err != nil || !found {
		t.Fatalf("restart rejection ledger = found:%v err:%v", found, err)
	}
	if record.Status != "rejected" || record.Code != "RESTART_UNSUPPORTED" || record.RestartScheduled {
		t.Fatalf("restart rejection ledger = %+v", record)
	}
}

func TestControlRestartDuplicateRemainsRejectedAfterReload(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "commands.db")
	first, cfg, firstStorage, _ := persistentControlService(t, dbPath, func() { t.Fatal("restart hook must not run") })
	payload := validControlEnvelope(map[string]any{"interval": 45})
	payload["restart"] = true
	first.onControl("set", payload)
	if got := cfg.GetInt("interval", 0); got != 60 {
		t.Fatalf("initial restart changed interval = %d", got)
	}
	firstStorage.Close()

	second, secondCfg, secondStorage, _ := persistentControlService(t, dbPath, func() { t.Fatal("replayed restart hook must not run") })
	defer secondStorage.Close()
	second.onControl("set", payload)
	if got := secondCfg.GetInt("interval", 0); got != 60 {
		t.Fatalf("replayed restart changed interval = %d", got)
	}
	record, found, err := secondStorage.GetProcessedCommand("KN", "abc-123")
	if err != nil || !found || record.Code != "RESTART_UNSUPPORTED" {
		t.Fatalf("replayed restart ledger = found:%v err:%v record:%+v", found, err, record)
	}
}

func TestControlRejectsExpiredAndFutureCommandsWithoutSideEffects(t *testing.T) {
	fb := &fakeBus{}
	svc, cfg, _ := newService(t, fb)

	expired := validControlEnvelope(map[string]any{"interval": 30})
	expired["issuedAt"] = time.Now().Add(-2 * time.Minute).UTC().Format(time.RFC3339)
	svc.onControl("set", expired)
	future := validControlEnvelope(map[string]any{"interval": 45})
	future["requestId"] = "future-1"
	future["issuedAt"] = time.Now().Add(2 * time.Minute).UTC().Format(time.RFC3339)
	svc.onControl("set", future)

	if cfg.GetInt("interval", 0) != 60 {
		t.Errorf("stale commands changed interval = %d", cfg.GetInt("interval", 0))
	}
	calls := fb.snapshot()
	if len(calls) != 2 {
		t.Fatalf("calls = %d, want one result per rejected request", len(calls))
	}
	for _, call := range calls {
		if call.topic != "solar/KN/state/control-result" || call.retain {
			t.Errorf("stale/future result = %+v", call)
		}
		result := decodeCall(t, call)
		if result["status"] != "rejected" {
			t.Errorf("stale/future status = %v", result)
		}
	}
}

func TestControlTTLRejectsDurationOverflow(t *testing.T) {
	if _, ok := parseControlTTL(json.Number("9223372036854775807")); ok {
		t.Fatal("overflowing ttl must be rejected")
	}
}

func TestControlSetPersistenceFailureRejectsAndRollsBack(t *testing.T) {
	fb := &fakeBus{}
	svc, cfg, st, _ := persistentControlService(t, filepath.Join(t.TempDir(), "persist.db"), func() {})
	svc.bus = fb
	svc.saveConfig = func() error { return errors.New("fixture write failure") }
	payload := validControlEnvelope(map[string]any{"interval": 30})
	payload["requestId"] = "persist-failure"

	svc.onControl("set", payload)
	if got := cfg.GetInt("interval", 0); got != 60 {
		t.Fatalf("interval after persistence failure = %d, want rollback to 60", got)
	}
	calls := fb.snapshot()
	if len(calls) != 1 || calls[0].topic != "solar/KN/state/control-result" {
		t.Fatalf("calls = %+v, want one rejection result", calls)
	}
	result := decodeCall(t, calls[0])
	if result["status"] != "rejected" || result["code"] != "PERSISTENCE_FAILED" {
		t.Fatalf("persistence failure result = %v", result)
	}
	if _, found, err := st.GetProcessedCommand("KN", "persist-failure"); err != nil || !found {
		t.Fatalf("rejected command ledger record = found:%v err:%v", found, err)
	}
}

func TestControlSetPersistsAcrossReload(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "persist.db")
	configPath := filepath.Join(t.TempDir(), "solar_config.json")
	svc, cfg, _, _ := persistentControlService(t, dbPath, func() {})
	svc.saveConfig = func() error { return cfg.Save(configPath) }
	payload := validControlEnvelope(map[string]any{"interval": 31})
	payload["requestId"] = "persist-reload"

	svc.onControl("set", payload)
	reloaded := config.New()
	if err := reloaded.Load(configPath); err != nil {
		t.Fatal(err)
	}
	if got := reloaded.GetInt("interval", 0); got != 31 {
		t.Fatalf("reloaded interval = %d, want 31", got)
	}
}

func TestControlSetLedgerFailureRollsBackMemoryRuntimeAndDisk(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "solar_config.json")
	restartCalls := 0
	svc, cfg, st, _ := persistentControlService(t, filepath.Join(dir, "commands.db"), func() { restartCalls++ })
	fb := &fakeBus{}
	svc.bus = fb
	if err := cfg.Save(configPath); err != nil {
		t.Fatal(err)
	}
	saveCalls := 0
	svc.saveConfig = func() error {
		saveCalls++
		if saveCalls == 2 {
			return errors.New("fixture rollback write failure")
		}
		return cfg.Save(configPath)
	}
	svc.stageConfig = func(factoryID, requestID string) (*config.StagedSave, error) {
		return cfg.StageRemoteSet(configPath, factoryID, requestID)
	}
	svc.putProcessedCommand = func(storage.CommandRecord) error {
		return errors.New("fixture ledger write failure")
	}
	payload := validControlEnvelope(map[string]any{"heartbeat_interval": 45})
	payload["requestId"] = "ledger-failure"

	svc.onControl("set", payload)
	if got := cfg.GetInt("heartbeat_interval", 0); got != 30 {
		t.Fatalf("memory heartbeat interval = %d, want rollback to 30", got)
	}
	if got := svc.heartbeat.IntervalSeconds(); got != 30 {
		t.Fatalf("runtime heartbeat interval = %d, want rollback to 30", got)
	}
	if svc.configRevision != 0 {
		t.Fatalf("config revision = %d, want unchanged after ledger failure", svc.configRevision)
	}
	if restartCalls != 0 {
		t.Fatalf("restart calls = %d, want none after ledger failure", restartCalls)
	}
	reloaded := config.New()
	if err := reloaded.Load(configPath); err != nil {
		t.Fatal(err)
	}
	if got := reloaded.GetInt("heartbeat_interval", 0); got != 30 {
		t.Fatalf("disk heartbeat interval = %d, want rollback to 30", got)
	}
	if saveCalls != 0 {
		t.Fatalf("save calls = %d, want staged transaction without rollback Save", saveCalls)
	}
	calls := fb.snapshot()
	if len(calls) != 1 || calls[0].topic != "solar/KN/state/control-result" || calls[0].retain {
		t.Fatalf("calls = %+v, want one non-retained failure result", calls)
	}
	result := decodeCall(t, calls[0])
	if result["status"] != "rejected" || result["code"] != "LEDGER_WRITE_FAILED" || result["restartScheduled"] != nil {
		t.Fatalf("ledger failure result = %v", result)
	}
	if _, found, err := st.GetProcessedCommand("KN", "ledger-failure"); err != nil || found {
		t.Fatalf("failed ledger record = found:%v err:%v, want absent", found, err)
	}
}
