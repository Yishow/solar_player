//go:build windows

package main

import (
	"errors"
	"os"
	"testing"
	"time"

	"opc_mqtt/internal/config"
	"opc_mqtt/internal/engine"
	"opc_mqtt/internal/state"
)

type fakeReader struct {
	connectErr error
	service    string
	topic      string
	timeoutMs  int
	items      []string
	values     map[string]float64
	errs       map[string]error
}

func (f *fakeReader) Connect(service, topic string, timeoutMs int) error {
	f.service = service
	f.topic = topic
	f.timeoutMs = timeoutMs
	return f.connectErr
}

func (f *fakeReader) ReadTags(items []string) (map[string]float64, map[string]error) {
	f.items = append([]string(nil), items...)
	values := make(map[string]float64, len(f.values))
	for key, value := range f.values {
		values[key] = value
	}

	errs := make(map[string]error, len(f.errs))
	for key, value := range f.errs {
		errs[key] = value
	}
	return values, errs
}

func (f *fakeReader) Disconnect() {}

type fakePublisher struct {
	connectErr        error
	publishVirtualErr error
	publishRawErr     error
	virtualCalls      int
	rawCalls          int
	virtualResults    []engine.Result
	rawValues         map[string]state.TagValue
}

func (f *fakePublisher) Connect(_ string, _ int, _ byte, _ bool) error {
	return f.connectErr
}

func (f *fakePublisher) Disconnect() {}

func (f *fakePublisher) PublishVirtual(_ string, results []engine.Result, _ byte, _ bool) error {
	f.virtualCalls++
	f.virtualResults = append([]engine.Result(nil), results...)
	return f.publishVirtualErr
}

func (f *fakePublisher) PublishRaw(_ string, _ []config.TagConfig, rawValues map[string]state.TagValue, _ byte, _ bool) error {
	f.rawCalls++
	f.rawValues = make(map[string]state.TagValue, len(rawValues))
	for key, value := range rawValues {
		f.rawValues[key] = value
	}
	return f.publishRawErr
}

func makeTestConfig(t *testing.T) *config.Config {
	t.Helper()

	file, err := os.CreateTemp(t.TempDir(), "cfg*.json")
	if err != nil {
		t.Fatalf("CreateTemp error: %v", err)
	}
	if _, err := file.WriteString(`{}`); err != nil {
		t.Fatalf("WriteString error: %v", err)
	}
	if err := file.Close(); err != nil {
		t.Fatalf("Close error: %v", err)
	}

	cfg, err := config.Load(file.Name())
	if err != nil {
		t.Fatalf("Load error: %v", err)
	}
	return cfg
}

func TestConnectDDEUsesConfiguredConversationAndReportsFailure(t *testing.T) {
	cfg := makeTestConfig(t)
	st := state.New()
	reader := &fakeReader{connectErr: errors.New("opc down")}

	connectDDE(cfg, st, reader)

	if reader.service != "view" || reader.topic != "tagname" {
		t.Fatalf("DDE connect=%q/%q want view/tagname", reader.service, reader.topic)
	}

	snap := st.Snapshot()
	if snap.OpcConnected {
		t.Fatal("OpcConnected should be false on connect failure")
	}
	if len(snap.Errors) == 0 {
		t.Fatal("connect failure should add error")
	}
}

func TestDoReadMapsValuesAndComputesVirtuals(t *testing.T) {
	cfg := makeTestConfig(t)
	st := state.New()
	snap := cfg.Get()
	snap.Tags = []config.TagConfig{
		{ID: "RAW_A", DdeItem: "RAW_A", Unit: "KWH", Enabled: true},
		{ID: "RAW_B", DdeItem: "RAW_B", Unit: "KWH", Enabled: true},
		{ID: "RAW_DISABLED", DdeItem: "RAW_DISABLED", Unit: "KWH", Enabled: false},
	}
	snap.VirtualTags = []config.VirtualTag{
		{
			Name:     "V_SUM",
			Unit:     "KWH",
			Decimals: 1,
			Enabled:  true,
			Formula: []config.FormulaItem{
				{Tag: "RAW_A", Op: "+"},
				{Tag: "RAW_B", Op: "+"},
			},
		},
	}
	cfg.Replace(snap)

	reader := &fakeReader{
		values: map[string]float64{
			"RAW_A": 10.5,
			"RAW_B": 20.0,
		},
	}

	doRead(cfg, st, reader)
	if len(reader.items) != 2 || reader.items[0] != "RAW_A" || reader.items[1] != "RAW_B" {
		t.Fatalf("DDE items=%v want [RAW_A RAW_B]", reader.items)
	}

	stateSnap := st.Snapshot()
	if !stateSnap.OpcConnected {
		t.Fatal("OpcConnected should be true after successful read")
	}
	if stateSnap.LastRead.IsZero() {
		t.Fatal("LastRead should be updated on successful read")
	}
	if got := stateSnap.RawValues["RAW_A"].Value; got != 10.5 {
		t.Fatalf("RAW_A=%f want 10.5", got)
	}
	if len(stateSnap.VirtualValues) != 1 {
		t.Fatalf("virtual len=%d want 1", len(stateSnap.VirtualValues))
	}
	if got := stateSnap.VirtualValues[0].Value; got != 30.5 {
		t.Fatalf("virtual value=%f want 30.5", got)
	}
}

func TestDoReadDoesNotMarkSuccessWhenAllReadsFail(t *testing.T) {
	cfg := makeTestConfig(t)
	st := state.New()
	snap := cfg.Get()
	snap.Tags = []config.TagConfig{
		{ID: "RAW_A", DdeItem: "RAW_A", Unit: "KWH", Enabled: true},
	}
	cfg.Replace(snap)

	reader := &fakeReader{
		errs: map[string]error{
			"RAW_A": errors.New("read failed"),
		},
	}

	doRead(cfg, st, reader)

	stateSnap := st.Snapshot()
	if stateSnap.OpcConnected {
		t.Fatal("OpcConnected should remain false when all reads fail")
	}
	if !stateSnap.LastRead.IsZero() {
		t.Fatal("LastRead should not update when no reads succeed")
	}
}

func TestConnectMqttFailureAddsError(t *testing.T) {
	cfg := makeTestConfig(t)
	st := state.New()
	publisher := &fakePublisher{connectErr: errors.New("mqtt down")}

	connectMqtt(cfg, st, publisher)

	if len(st.Snapshot().Errors) == 0 {
		t.Fatal("MQTT connect failure should add error")
	}
}

func TestDoPublishHonorsFlagsAndUpdatesTimestampOnSuccess(t *testing.T) {
	cfg := makeTestConfig(t)
	st := state.New()
	publisher := &fakePublisher{}

	snap := cfg.Get()
	snap.PublishVirtual = true
	snap.PublishRaw = false
	snap.Tags = []config.TagConfig{
		{ID: "RAW_A", Unit: "KWH", Enabled: true},
	}
	cfg.Replace(snap)

	st.SetVirtualValues([]state.VirtualValue{
		{Name: "V_SUM", Value: 30.5, Unit: "KWH", Ok: true},
	})
	st.SetRawValues(map[string]state.TagValue{
		"RAW_A": {Value: 10, Ok: true},
	})

	doPublish(cfg, st, publisher)

	stateSnap := st.Snapshot()
	if publisher.virtualCalls != 1 {
		t.Fatalf("virtualCalls=%d want 1", publisher.virtualCalls)
	}
	if publisher.rawCalls != 0 {
		t.Fatalf("rawCalls=%d want 0", publisher.rawCalls)
	}
	if stateSnap.LastPublish.IsZero() {
		t.Fatal("LastPublish should update on successful publish")
	}
}

func TestDoPublishDoesNotUpdateLastPublishOnFailure(t *testing.T) {
	cfg := makeTestConfig(t)
	st := state.New()
	publisher := &fakePublisher{publishVirtualErr: errors.New("publish failed")}

	snap := cfg.Get()
	snap.PublishVirtual = true
	snap.PublishRaw = false
	cfg.Replace(snap)

	st.SetVirtualValues([]state.VirtualValue{
		{Name: "V_SUM", Value: 30.5, Unit: "KWH", Ok: true},
	})
	before := time.Now()

	doPublish(cfg, st, publisher)

	stateSnap := st.Snapshot()
	if !stateSnap.LastPublish.IsZero() && stateSnap.LastPublish.After(before.Add(-time.Second)) {
		t.Fatal("LastPublish should not update on publish failure")
	}
	if len(stateSnap.Errors) == 0 {
		t.Fatal("publish failure should add error")
	}
}

func TestSplitCommandArgs(t *testing.T) {
	command, args := splitCommandArgs([]string{"run", "--broker", "127.0.0.1"})
	if command != "run" {
		t.Fatalf("command=%q want run", command)
	}
	if len(args) != 2 || args[0] != "--broker" || args[1] != "127.0.0.1" {
		t.Fatalf("args=%v want [--broker 127.0.0.1]", args)
	}

	command, args = splitCommandArgs([]string{"--broker", "127.0.0.1"})
	if command != "" {
		t.Fatalf("command=%q want empty", command)
	}
	if len(args) != 2 || args[0] != "--broker" || args[1] != "127.0.0.1" {
		t.Fatalf("args=%v want [--broker 127.0.0.1]", args)
	}
}

func TestUserFacingWebURL(t *testing.T) {
	tests := []struct {
		name string
		addr string
		port int
		want string
	}{
		{name: "bind all interfaces", addr: "0.0.0.0", port: 8080, want: "http://127.0.0.1:8080"},
		{name: "localhost bind", addr: "127.0.0.1", port: 18080, want: "http://127.0.0.1:18080"},
		{name: "named host", addr: "opc-host", port: 9000, want: "http://opc-host:9000"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := userFacingWebURL(tt.addr, tt.port); got != tt.want {
				t.Fatalf("userFacingWebURL(%q, %d)=%q want %q", tt.addr, tt.port, got, tt.want)
			}
		})
	}
}
