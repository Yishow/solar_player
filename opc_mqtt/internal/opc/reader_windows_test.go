//go:build windows

package opc

import "testing"

func TestWindowsReaderDisconnectIsIdempotent(t *testing.T) {
	reader, err := newWindowsReaderImpl()
	if err != nil {
		t.Fatalf("newWindowsReaderImpl: %v", err)
	}

	reader.Disconnect()
	reader.Disconnect()
}

func TestWindowsReaderReadAfterDisconnectReturnsPerAddressErrors(t *testing.T) {
	reader, err := newWindowsReaderImpl()
	if err != nil {
		t.Fatalf("newWindowsReaderImpl: %v", err)
	}
	reader.Disconnect()

	values, errs := reader.ReadTags([]string{"A", "B"})
	if len(values) != 0 {
		t.Fatalf("values=%v want empty", values)
	}
	if errs["A"] == nil || errs["B"] == nil {
		t.Fatalf("errs=%v want one error per address", errs)
	}
}
