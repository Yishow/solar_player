//go:build windows

package opc

import (
	"math"
	"testing"

	"github.com/go-ole/go-ole"
)

func testFloatVariant(value float64) ole.VARIANT {
	return ole.NewVariant(ole.VT_R8, int64(math.Float64bits(value)))
}

func TestDecodeReadResultsKeepsGoodItemsWhenOneFails(t *testing.T) {
	states := []opcItemState{
		{Quality: 0xC0, Value: testFloatVariant(12.5)},
		{Quality: 0xC0, Value: testFloatVariant(99)},
	}

	values, errs := decodeReadResults(
		[]string{"intouch.GP.GOOD", "intouch.GP.BAD"},
		states,
		[]int32{0, -1073479673}, // OPC_E_UNKNOWNITEMID (0xC0040007)
	)

	if values["intouch.GP.GOOD"] != 12.5 {
		t.Fatalf("GOOD=%v want 12.5", values["intouch.GP.GOOD"])
	}
	if _, ok := errs["intouch.GP.BAD"]; !ok {
		t.Fatal("BAD must retain its OPC HRESULT error")
	}
}

func TestDecodeReadResultsRejectsBadQuality(t *testing.T) {
	states := []opcItemState{{Quality: 0x40, Value: testFloatVariant(12.5)}}
	values, errs := decodeReadResults([]string{"UNCERTAIN"}, states, []int32{0})
	if len(values) != 0 {
		t.Fatalf("values=%v want empty", values)
	}
	if _, ok := errs["UNCERTAIN"]; !ok {
		t.Fatal("uncertain OPC quality must be reported as an error")
	}
}

func TestDecodeReadResultsRejectsIncompleteResponse(t *testing.T) {
	values, errs := decodeReadResults([]string{"A"}, nil, nil)
	if len(values) != 0 {
		t.Fatalf("values=%v want empty", values)
	}
	if _, ok := errs["A"]; !ok {
		t.Fatal("A must report an incomplete response")
	}
}

func TestHRESULTFailedAcceptsSFalseAndRejectsFailures(t *testing.T) {
	if hresultFailed(0) || hresultFailed(1) {
		t.Fatal("S_OK and S_FALSE must not be transport failures")
	}
	if !hresultFailed(-2147467262) { // E_NOINTERFACE (0x80004002)
		t.Fatal("E_NOINTERFACE must be a failure")
	}
}

func TestSelectReadableItemsKeepsValidHandles(t *testing.T) {
	addresses, handles, errs := selectReadableItems(
		[]string{"GOOD", "BAD", "GOOD_2"},
		[]uint32{11, 0, 22},
		[]int32{0, -1073479673, 0},
	)

	if len(addresses) != 2 || addresses[0] != "GOOD" || addresses[1] != "GOOD_2" {
		t.Fatalf("addresses=%v", addresses)
	}
	if len(handles) != 2 || handles[0] != 11 || handles[1] != 22 {
		t.Fatalf("handles=%v", handles)
	}
	if _, ok := errs["BAD"]; !ok {
		t.Fatal("BAD must retain its AddItems error")
	}
}

func TestSameAddressesRequiresSameOrder(t *testing.T) {
	if !sameAddresses([]string{"A", "B"}, []string{"A", "B"}) {
		t.Fatal("equal ordered lists must match")
	}
	if sameAddresses([]string{"A", "B"}, []string{"B", "A"}) {
		t.Fatal("reordered handles require a rebuild")
	}
	if sameAddresses([]string{"A"}, []string{"A", "B"}) {
		t.Fatal("a size change requires a rebuild")
	}
}
