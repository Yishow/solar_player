package opc

import (
	"errors"
	"fmt"
)

// Reader 是 OPC DA 讀取的抽象介面，方便測試替換。
type Reader interface {
	Connect(progID string, timeoutMs int) error
	ReadTags(addresses []string) (map[string]float64, map[string]error)
	Disconnect()
}

// MockReader 供測試或無 OPC Server 環境使用。
type MockReader struct {
	values map[string]float64
	errors map[string]error
}

var errNotWindows = errors.New("OPC DA COM only available on Windows")

func NewMockReader(values map[string]float64, errs map[string]error) Reader {
	return &MockReader{
		values: cloneFloatValues(values),
		errors: cloneErrors(errs),
	}
}

func NewWindowsReader() (Reader, error) {
	return newWindowsReaderImpl()
}

func (m *MockReader) Connect(_ string, _ int) error {
	return nil
}

func (m *MockReader) ReadTags(addresses []string) (map[string]float64, map[string]error) {
	values := make(map[string]float64)
	errs := make(map[string]error)

	for _, address := range addresses {
		if err, ok := m.errors[address]; ok {
			errs[address] = err
			continue
		}

		value, ok := m.values[address]
		if !ok {
			errs[address] = fmt.Errorf("tag not found: %s", address)
			continue
		}
		values[address] = value
	}

	return values, errs
}

func (m *MockReader) Disconnect() {}

func cloneFloatValues(values map[string]float64) map[string]float64 {
	if values == nil {
		return map[string]float64{}
	}

	cloned := make(map[string]float64, len(values))
	for key, value := range values {
		cloned[key] = value
	}
	return cloned
}

func cloneErrors(values map[string]error) map[string]error {
	if values == nil {
		return map[string]error{}
	}

	cloned := make(map[string]error, len(values))
	for key, value := range values {
		cloned[key] = value
	}
	return cloned
}
