package mqttbus

import (
	"testing"
	"time"
)

func TestBusRoutesOnlySeparatedControlTopics(t *testing.T) {
	fb := &fakeBroker{}
	b := New()
	b.Attach(fb, "localhost", 1883, "solar")

	setCalls := make(chan map[string]any, 4)
	configCalls := make(chan struct{}, 4)
	b.RegisterFactory("CL", func(command string, payload map[string]any) {
		if command == "set" {
			setCalls <- payload
			return
		}
		configCalls <- struct{}{}
	})

	fb.mu.Lock()
	if !contains(fb.subscribed, "solar/CL/cmd/get-config") || !contains(fb.subscribed, "solar/CL/cmd/set") {
		t.Errorf("control subscriptions = %v", fb.subscribed)
	}
	if contains(fb.subscribed, "solar/CL/config") || contains(fb.subscribed, "solar/CL/set") {
		t.Errorf("legacy control subscriptions remain: %v", fb.subscribed)
	}
	fb.mu.Unlock()

	b.HandleMessage("solar/CL/cmd/set", []byte(`{"requestId":"abc-123","issuedAt":"2026-08-29T10:00:00Z","ttlSeconds":60,"changes":{"interval":30}}`))
	select {
	case payload := <-setCalls:
		if payload["requestId"] != "abc-123" {
			t.Errorf("set payload = %v", payload)
		}
	case <-time.After(time.Second):
		t.Fatal("new cmd/set was not routed")
	}

	b.HandleMessage("solar/CL/cmd/get-config", []byte(`{"requestId":"abc-124","issuedAt":"2026-08-29T10:00:00Z","ttlSeconds":60}`))
	select {
	case <-configCalls:
	case <-time.After(time.Second):
		t.Fatal("new cmd/get-config was not routed")
	}

	b.HandleMessage("solar/CL/state/config", []byte(`{"factory_id":"CL"}`))
	b.HandleMessage("solar/CL/set", []byte(`{"restart":true}`))
	b.HandleMessage("solar/CL/config", []byte(`{"requestId":"legacy","login_pass":"secret"}`))
	select {
	case payload := <-setCalls:
		t.Errorf("state or legacy topic was routed as set: %v", payload)
	default:
	}
	select {
	case <-configCalls:
		t.Error("state or legacy topic was routed as config")
	default:
	}
}
