package dde

import (
	"fmt"
	"strconv"
	"strings"
)

// Reader reads numeric InTouch tags through one DDE conversation.
type Reader interface {
	Connect(service, topic string, timeoutMs int) error
	ReadTags(items []string) (map[string]float64, map[string]error)
	Disconnect()
}

func parseTextValue(item, raw string) (float64, error) {
	cleaned := strings.Trim(raw, "\x00 \t\r\n")
	value, err := strconv.ParseFloat(cleaned, 64)
	if err != nil {
		return 0, fmt.Errorf("DDE value %s parse %q: %w", item, cleaned, err)
	}
	return value, nil
}
