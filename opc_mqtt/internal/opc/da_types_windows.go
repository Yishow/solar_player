//go:build windows

package opc

import (
	"fmt"
	"syscall"

	"github.com/go-ole/go-ole"
)

var (
	opcServerIID  = ole.NewGUID("{39C13A4D-011E-11D0-9675-0020AFD8ADB3}")
	opcItemMgtIID = ole.NewGUID("{39C13A54-011E-11D0-9675-0020AFD8ADB3}")
	opcSyncIOIID  = ole.NewGUID("{39C13A52-011E-11D0-9675-0020AFD8ADB3}")
)

const opcDevice = uint32(2)

// opcItemDef mirrors OPCITEMDEF from the OPC DA 2.05a COM contract.
type opcItemDef struct {
	AccessPath        *uint16
	ItemID            *uint16
	Active            int32
	ClientHandle      uint32
	BlobSize          uint32
	Blob              *byte
	RequestedDataType uint16
	Reserved          uint16
}

// opcItemResult mirrors OPCITEMRESULT from the OPC DA 2.05a COM contract.
type opcItemResult struct {
	ServerHandle      uint32
	CanonicalDataType uint16
	Reserved          uint16
	AccessRights      uint32
	BlobSize          uint32
	Blob              *byte
}

// opcItemState mirrors OPCITEMSTATE from the OPC DA 2.05a COM contract.
type opcItemState struct {
	ClientHandle uint32
	Timestamp    syscall.Filetime
	Quality      uint16
	Reserved     uint16
	Value        ole.VARIANT
}

func hresultFailed(hr int32) bool {
	return hr < 0
}

func hresultError(operation string, hr int32) error {
	return fmt.Errorf("%s: HRESULT 0x%08X", operation, uint32(hr))
}

func decodeReadResults(addresses []string, states []opcItemState, itemErrors []int32) (map[string]float64, map[string]error) {
	values := make(map[string]float64, len(addresses))
	errs := make(map[string]error)

	for i, address := range addresses {
		if i >= len(states) || i >= len(itemErrors) {
			errs[address] = fmt.Errorf("OPC read returned incomplete result for item %d", i)
			continue
		}
		if hresultFailed(itemErrors[i]) {
			errs[address] = hresultError("OPC read "+address, itemErrors[i])
			continue
		}
		if states[i].Quality&0xC0 != 0xC0 {
			errs[address] = fmt.Errorf("OPC value %s has non-good quality 0x%04X", address, states[i].Quality)
			continue
		}

		value, err := anyToFloat64(states[i].Value.Value())
		if err != nil {
			errs[address] = fmt.Errorf("OPC value %s: %w", address, err)
			continue
		}
		values[address] = value
	}

	return values, errs
}

func selectReadableItems(addresses []string, handles []uint32, itemErrors []int32) ([]string, []uint32, map[string]error) {
	readAddresses := make([]string, 0, len(addresses))
	readHandles := make([]uint32, 0, len(addresses))
	errs := make(map[string]error)

	for i, address := range addresses {
		if i >= len(handles) || i >= len(itemErrors) {
			errs[address] = fmt.Errorf("OPC AddItems returned incomplete result for item %d", i)
			continue
		}
		if hresultFailed(itemErrors[i]) {
			errs[address] = hresultError("OPC AddItems "+address, itemErrors[i])
			continue
		}
		readAddresses = append(readAddresses, address)
		readHandles = append(readHandles, handles[i])
	}

	return readAddresses, readHandles, errs
}

func sameAddresses(left, right []string) bool {
	if len(left) != len(right) {
		return false
	}
	for i := range left {
		if left[i] != right[i] {
			return false
		}
	}
	return true
}
