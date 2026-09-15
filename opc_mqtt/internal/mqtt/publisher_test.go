package mqtt_test

import (
	"testing"

	"opc_mqtt/internal/config"
	"opc_mqtt/internal/engine"
	mqttpkg "opc_mqtt/internal/mqtt"
	"opc_mqtt/internal/state"
)

func TestConnectFailDoesNotPanic(t *testing.T) {
	st := state.New()
	publisher := mqttpkg.New(st)

	err := publisher.Connect("127.0.0.1", 19999, 1, true)
	if err == nil {
		t.Log("unexpected success; a broker may be running on 127.0.0.1:19999")
	}
}

func TestPublishVirtualNoConnect(t *testing.T) {
	st := state.New()
	publisher := mqttpkg.New(st)

	err := publisher.PublishVirtual("opc", []engine.Result{
		{Name: "塗裝", Value: 1234.5, Unit: "KWH", Ok: true},
	}, 1, true)
	if err == nil {
		t.Error("should error when not connected")
	}
}

func TestPublishRawNoConnect(t *testing.T) {
	st := state.New()
	publisher := mqttpkg.New(st)

	err := publisher.PublishRaw("opc", []config.TagConfig{
		{ID: "A", Unit: "KWH", Enabled: true},
	}, map[string]state.TagValue{
		"A": {Value: 1, Ok: true},
	}, 1, true)
	if err == nil {
		t.Error("should error when not connected")
	}
}
