package dde

import "testing"

func TestParseTextValue(t *testing.T) {
	value, err := parseTextValue("GCB_610_KWH", " 1234.5\x00 ")
	if err != nil {
		t.Fatalf("parseTextValue error: %v", err)
	}
	if value != 1234.5 {
		t.Fatalf("value=%v want 1234.5", value)
	}
}

func TestParseTextValueRejectsNonNumericDDEData(t *testing.T) {
	if _, err := parseTextValue("BAD", "not-a-number\x00"); err == nil {
		t.Fatal("non-numeric DDE data must return an error")
	}
}
