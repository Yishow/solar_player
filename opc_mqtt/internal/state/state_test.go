package state_test

import (
	"testing"
	"time"

	"opc_mqtt/internal/state"
)

func TestConnectedFlags(t *testing.T) {
	s := state.New()
	s.SetOpcConnected(true)
	s.SetMqttConnected(false)

	snap := s.Snapshot()
	if !snap.OpcConnected {
		t.Error("opc should be connected")
	}
	if snap.MqttConnected {
		t.Error("mqtt should not be connected")
	}
}

func TestRawValues(t *testing.T) {
	s := state.New()
	s.SetRawValues(map[string]state.TagValue{
		"TAG_A": {Value: 123.4, Ok: true},
		"TAG_B": {Value: 0, Ok: false, ErrMsg: "read error"},
	})

	snap := s.Snapshot()
	if snap.RawValues["TAG_A"].Value != 123.4 {
		t.Errorf("TAG_A value=%f want 123.4", snap.RawValues["TAG_A"].Value)
	}
	if snap.RawValues["TAG_B"].Ok {
		t.Error("TAG_B should not be ok")
	}
}

func TestVirtualValues(t *testing.T) {
	s := state.New()
	s.SetVirtualValues([]state.VirtualValue{
		{Name: "paint", Value: 10.5, Unit: "KWH", Ok: true},
		{Name: "body", Value: 0, Unit: "KWH", Ok: false},
	})

	snap := s.Snapshot()
	if len(snap.VirtualValues) != 2 {
		t.Fatalf("virtual len=%d want 2", len(snap.VirtualValues))
	}
	if snap.VirtualValues[0].Name != "paint" {
		t.Errorf("virtual[0].name=%q want paint", snap.VirtualValues[0].Name)
	}
	if snap.VirtualValues[1].Ok {
		t.Error("virtual[1] should not be ok")
	}
}

func TestErrorRing(t *testing.T) {
	s := state.New()
	for i := 0; i < 15; i++ {
		s.AddError("err")
	}

	snap := s.Snapshot()
	if len(snap.Errors) != 10 {
		t.Errorf("errors len=%d want 10", len(snap.Errors))
	}
}

func TestTimestamps(t *testing.T) {
	s := state.New()
	now := time.Now()

	s.SetLastRead(now)
	s.SetLastPublish(now)

	snap := s.Snapshot()
	if snap.LastRead.IsZero() {
		t.Error("LastRead should not be zero")
	}
	if snap.LastPublish.IsZero() {
		t.Error("LastPublish should not be zero")
	}
}

func TestSnapshotIsolatedFromFutureMutation(t *testing.T) {
	s := state.New()
	raw := map[string]state.TagValue{
		"TAG_A": {Value: 1, Ok: true},
	}
	virtuals := []state.VirtualValue{
		{Name: "virtual-a", Value: 2, Unit: "KWH", Ok: true},
	}

	s.SetRawValues(raw)
	s.SetVirtualValues(virtuals)
	s.AddError("first")

	snap := s.Snapshot()
	raw["TAG_A"] = state.TagValue{Value: 99, Ok: false, ErrMsg: "mutated"}
	virtuals[0] = state.VirtualValue{Name: "changed", Value: 9, Unit: "KWH", Ok: false}
	snap.RawValues["TAG_A"] = state.TagValue{Value: 3, Ok: true}
	snap.VirtualValues[0] = state.VirtualValue{Name: "local", Value: 4, Unit: "KWH", Ok: true}
	snap.Errors[0] = "changed"

	next := s.Snapshot()
	if next.RawValues["TAG_A"].Value != 1 {
		t.Errorf("raw snapshot mutated to %f want 1", next.RawValues["TAG_A"].Value)
	}
	if next.VirtualValues[0].Name != "virtual-a" {
		t.Errorf("virtual snapshot mutated to %q want virtual-a", next.VirtualValues[0].Name)
	}
	if next.Errors[0] != "first" {
		t.Errorf("error snapshot mutated to %q want first", next.Errors[0])
	}
}
