package engine

import (
	"math"

	"opc_mqtt/internal/config"
	"opc_mqtt/internal/state"
)

type Result struct {
	Name  string
	Value float64
	Unit  string
	Ok    bool
}

func Compute(virtuals []config.VirtualTag, rawValues map[string]state.TagValue) []Result {
	results := make([]Result, 0, len(virtuals))
	for _, virtualTag := range virtuals {
		if !virtualTag.Enabled {
			continue
		}

		value, ok := computeOne(virtualTag, rawValues)
		results = append(results, Result{
			Name:  virtualTag.Name,
			Value: round(value, virtualTag.Decimals),
			Unit:  virtualTag.Unit,
			Ok:    ok,
		})
	}
	return results
}

func computeOne(virtualTag config.VirtualTag, rawValues map[string]state.TagValue) (float64, bool) {
	total := 0.0
	for _, item := range virtualTag.Formula {
		tagValue, exists := rawValues[item.Tag]
		if !exists || !tagValue.Ok {
			return 0, false
		}

		switch item.Op {
		case "+":
			total += tagValue.Value
		case "-":
			total -= tagValue.Value
		default:
			return 0, false
		}
	}
	return total, true
}

func round(value float64, decimals int) float64 {
	pow := math.Pow(10, float64(decimals))
	return math.Round(value*pow) / pow
}
