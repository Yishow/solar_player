package engine_test

import (
	"testing"

	"opc_mqtt/internal/config"
	"opc_mqtt/internal/engine"
	"opc_mqtt/internal/state"
)

func makeRaw(vals map[string]float64) map[string]state.TagValue {
	raw := make(map[string]state.TagValue, len(vals))
	for key, value := range vals {
		raw[key] = state.TagValue{Value: value, Ok: true}
	}
	return raw
}

func TestBasicAdd(t *testing.T) {
	virtuals := []config.VirtualTag{
		{
			Name:     "塗裝",
			Unit:     "KWH",
			Decimals: 1,
			Enabled:  true,
			Formula: []config.FormulaItem{
				{Tag: "A", Op: "+"},
				{Tag: "B", Op: "+"},
			},
		},
	}

	results := engine.Compute(virtuals, makeRaw(map[string]float64{
		"A": 100.0,
		"B": 200.5,
	}))
	if len(results) != 1 {
		t.Fatalf("len=%d want 1", len(results))
	}
	if !results[0].Ok {
		t.Fatal("result should be ok")
	}
	if results[0].Value != 300.5 {
		t.Errorf("value=%f want 300.5", results[0].Value)
	}
}

func TestSubtract(t *testing.T) {
	virtuals := []config.VirtualTag{
		{
			Name:     "差值",
			Unit:     "KWH",
			Decimals: 1,
			Enabled:  true,
			Formula: []config.FormulaItem{
				{Tag: "A", Op: "+"},
				{Tag: "B", Op: "-"},
			},
		},
	}

	results := engine.Compute(virtuals, makeRaw(map[string]float64{
		"A": 500.0,
		"B": 100.0,
	}))
	if results[0].Value != 400.0 {
		t.Errorf("value=%f want 400.0", results[0].Value)
	}
}

func TestMissingTag(t *testing.T) {
	virtuals := []config.VirtualTag{
		{
			Name:     "塗裝",
			Unit:     "KWH",
			Decimals: 1,
			Enabled:  true,
			Formula: []config.FormulaItem{
				{Tag: "A", Op: "+"},
				{Tag: "MISSING", Op: "+"},
			},
		},
	}

	results := engine.Compute(virtuals, makeRaw(map[string]float64{
		"A": 100.0,
	}))
	if results[0].Ok {
		t.Error("result with missing tag should not be ok")
	}
}

func TestReadErrorTag(t *testing.T) {
	virtuals := []config.VirtualTag{
		{
			Name:     "車身",
			Unit:     "KWH",
			Decimals: 1,
			Enabled:  true,
			Formula: []config.FormulaItem{
				{Tag: "A", Op: "+"},
				{Tag: "B", Op: "+"},
			},
		},
	}
	raw := makeRaw(map[string]float64{
		"A": 10,
		"B": 20,
	})
	raw["B"] = state.TagValue{Value: 20, Ok: false, ErrMsg: "read failed"}

	results := engine.Compute(virtuals, raw)
	if results[0].Ok {
		t.Error("result with read-error tag should not be ok")
	}
}

func TestDisabledSkipped(t *testing.T) {
	virtuals := []config.VirtualTag{
		{
			Name:    "X",
			Enabled: false,
			Formula: []config.FormulaItem{{Tag: "A", Op: "+"}},
		},
	}

	results := engine.Compute(virtuals, makeRaw(map[string]float64{
		"A": 100.0,
	}))
	if len(results) != 0 {
		t.Errorf("disabled virtual tag should be skipped, got %d results", len(results))
	}
}

func TestDecimals(t *testing.T) {
	virtuals := []config.VirtualTag{
		{
			Name:     "X",
			Unit:     "KWH",
			Decimals: 2,
			Enabled:  true,
			Formula: []config.FormulaItem{
				{Tag: "A", Op: "+"},
			},
		},
	}

	results := engine.Compute(virtuals, makeRaw(map[string]float64{
		"A": 100.456789,
	}))
	if results[0].Value != 100.46 {
		t.Errorf("value=%f want 100.46", results[0].Value)
	}
}

func TestInvalidOperatorMarksResultNotOk(t *testing.T) {
	virtuals := []config.VirtualTag{
		{
			Name:     "X",
			Unit:     "KWH",
			Decimals: 1,
			Enabled:  true,
			Formula: []config.FormulaItem{
				{Tag: "A", Op: "*"},
			},
		},
	}

	results := engine.Compute(virtuals, makeRaw(map[string]float64{
		"A": 5,
	}))
	if results[0].Ok {
		t.Error("invalid operator should not be ok")
	}
}
