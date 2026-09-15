package opc_test

import (
	"errors"
	"testing"

	"opc_mqtt/internal/opc"
)

func TestMockReaderConnect(t *testing.T) {
	reader := opc.NewMockReader(map[string]float64{
		"intouch.GP.VCB_5_1_KWH": 1234.5,
	}, nil)

	if err := reader.Connect("any.ProgID", 5000); err != nil {
		t.Fatalf("Connect error: %v", err)
	}
}

func TestMockReaderReadTags(t *testing.T) {
	reader := opc.NewMockReader(map[string]float64{
		"intouch.GP.VCB_5_1_KWH": 1234.5,
		"intouch.GP.VCB_6_KWH":   200.0,
	}, nil)

	if err := reader.Connect("any", 5000); err != nil {
		t.Fatalf("Connect error: %v", err)
	}

	values, errs := reader.ReadTags([]string{
		"intouch.GP.VCB_5_1_KWH",
		"intouch.GP.VCB_6_KWH",
		"MISSING",
	})
	if values["intouch.GP.VCB_5_1_KWH"] != 1234.5 {
		t.Errorf("got %f want 1234.5", values["intouch.GP.VCB_5_1_KWH"])
	}
	if _, ok := errs["MISSING"]; !ok {
		t.Error("MISSING should have error")
	}
}

func TestMockReaderUsesConfiguredErrors(t *testing.T) {
	expectedErr := errors.New("forced read error")
	reader := opc.NewMockReader(map[string]float64{
		"GOOD": 1,
	}, map[string]error{
		"BAD": expectedErr,
	})

	values, errs := reader.ReadTags([]string{"GOOD", "BAD"})
	if values["GOOD"] != 1 {
		t.Errorf("GOOD=%f want 1", values["GOOD"])
	}
	if !errors.Is(errs["BAD"], expectedErr) {
		t.Fatalf("BAD error=%v want %v", errs["BAD"], expectedErr)
	}
}

func TestMockReaderDisconnect(t *testing.T) {
	reader := opc.NewMockReader(nil, nil)
	if err := reader.Connect("any", 5000); err != nil {
		t.Fatalf("Connect error: %v", err)
	}

	reader.Disconnect()
}
