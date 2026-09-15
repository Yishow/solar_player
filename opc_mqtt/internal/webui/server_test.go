package webui_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"opc_mqtt/internal/config"
	"opc_mqtt/internal/state"
	"opc_mqtt/internal/webui"
)

type callbackFlags struct {
	readCalled    bool
	publishCalled bool
}

func makeServer(t *testing.T) (*webui.Server, *config.Config, *state.State, *callbackFlags) {
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

	st := state.New()
	flags := &callbackFlags{}
	srv := webui.New(
		cfg,
		st,
		func() { flags.readCalled = true },
		func() { flags.publishCalled = true },
	)
	return srv, cfg, st, flags
}

func TestGetStatus(t *testing.T) {
	srv, _, st, _ := makeServer(t)
	st.SetOpcConnected(true)
	st.SetMqttConnected(false)

	req := httptest.NewRequest(http.MethodGet, "/api/status", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d want 200", rec.Code)
	}

	var body map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode error: %v", err)
	}
	if body["opc_connected"] != true {
		t.Error("opc_connected should be true")
	}
	if body["mqtt_connected"] != false {
		t.Error("mqtt_connected should be false")
	}
}

func TestGetConfig(t *testing.T) {
	srv, _, _, _ := makeServer(t)

	req := httptest.NewRequest(http.MethodGet, "/api/config", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d want 200", rec.Code)
	}
}

func TestPostConfig(t *testing.T) {
	srv, cfg, _, _ := makeServer(t)
	snap := cfg.Get()
	snap.Broker = "10.0.0.5"
	snap.BrokerPort = 1993
	snap.Tags = []config.TagConfig{
		{ID: "A", OpcAddress: "intouch.GP.A", Unit: "KWH", Enabled: true},
	}
	snap.VirtualTags = []config.VirtualTag{
		{
			Name:     "V_A",
			Unit:     "KWH",
			Decimals: 1,
			Enabled:  true,
			Formula: []config.FormulaItem{
				{Tag: "A", Op: "+"},
			},
		},
	}

	body, err := json.Marshal(snap)
	if err != nil {
		t.Fatalf("Marshal error: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/config", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d want 200 body=%s", rec.Code, rec.Body.String())
	}
	if cfg.Get().Broker != "10.0.0.5" {
		t.Fatalf("broker=%q want 10.0.0.5", cfg.Get().Broker)
	}
}

func TestPostConfigRejectsInvalidQos(t *testing.T) {
	srv, cfg, _, _ := makeServer(t)
	snap := cfg.Get()
	snap.MqttQos = 3

	body, err := json.Marshal(snap)
	if err != nil {
		t.Fatalf("Marshal error: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/config", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status=%d want 400", rec.Code)
	}
}

func TestPostConfigRejectsUnknownFormulaTag(t *testing.T) {
	srv, cfg, _, _ := makeServer(t)
	snap := cfg.Get()
	snap.Tags = []config.TagConfig{
		{ID: "A", OpcAddress: "intouch.GP.A", Unit: "KWH", Enabled: true},
	}
	snap.VirtualTags = []config.VirtualTag{
		{
			Name:     "虛擬一",
			Unit:     "KWH",
			Decimals: 1,
			Enabled:  true,
			Formula: []config.FormulaItem{
				{Tag: "MISSING", Op: "+"},
			},
		},
	}

	body, err := json.Marshal(snap)
	if err != nil {
		t.Fatalf("Marshal error: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/config", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status=%d want 400", rec.Code)
	}
}

func TestActionRead(t *testing.T) {
	srv, _, _, flags := makeServer(t)

	req := httptest.NewRequest(http.MethodPost, "/api/action/read", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d want 200", rec.Code)
	}
	if !flags.readCalled {
		t.Error("onRead callback should have been called")
	}
}

func TestActionPublish(t *testing.T) {
	srv, _, _, flags := makeServer(t)

	req := httptest.NewRequest(http.MethodPost, "/api/action/publish", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d want 200", rec.Code)
	}
	if !flags.publishCalled {
		t.Error("onPublish callback should have been called")
	}
}

func TestStaticIndexServed(t *testing.T) {
	srv, _, _, _ := makeServer(t)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d want 200", rec.Code)
	}
	if !bytes.Contains(rec.Body.Bytes(), []byte("DDE MQTT Bridge")) {
		t.Fatal("index page should contain title text")
	}
}
