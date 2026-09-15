//go:build windows

package dde

import "testing"

func TestWindowsReaderReportsMissingDDEConversation(t *testing.T) {
	reader, err := NewWindowsReader()
	if err != nil {
		t.Fatalf("NewWindowsReader error: %v", err)
	}
	defer reader.Disconnect()

	err = reader.Connect("__OPC_MQTT_MISSING_DDE_SERVICE__", "__MISSING_TOPIC__", 250)
	if err == nil {
		t.Fatal("missing DDE service/topic must fail to connect")
	}
}
