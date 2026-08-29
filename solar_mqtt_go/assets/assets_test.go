package assets

import (
	"bytes"
	"encoding/binary"
	"image"
	"image/png"
	"testing"
)

// TestTrayIconDecodable 驗證 ICO 檔頭合法且內嵌 PNG 可解碼（systray 載入前提）。
func TestTrayIconDecodable(t *testing.T) {
	data := TrayIcon()
	if len(data) < 22 {
		t.Fatalf("ico too small: %d bytes", len(data))
	}
	// ICONDIR：reserved=0, type=1, count=1
	if data[0] != 0 || data[1] != 0 {
		t.Errorf("reserved = %d", data[0])
	}
	if data[2] != 1 || data[3] != 0 {
		t.Errorf("type = %d, want 1 (icon)", binary.LittleEndian.Uint16(data[2:4]))
	}
	if binary.LittleEndian.Uint16(data[4:6]) != 1 {
		t.Errorf("image count = %d, want 1", binary.LittleEndian.Uint16(data[4:6]))
	}
	// entry：寬高 32、bpp 32
	if data[6] != 32 || data[7] != 32 {
		t.Errorf("size = %dx%d, want 32x32", data[6], data[7])
	}
	if binary.LittleEndian.Uint16(data[10:12]) != 1 {
		t.Error("planes must be 1")
	}
	if binary.LittleEndian.Uint16(data[12:14]) != 32 {
		t.Error("bpp must be 32")
	}
	size := binary.LittleEndian.Uint32(data[14:18])
	offset := binary.LittleEndian.Uint32(data[18:22])
	if int(offset+size) != len(data) {
		t.Errorf("offset(%d)+size(%d) != file len(%d)", offset, size, len(data))
	}
	img, err := png.Decode(bytes.NewReader(data[offset:]))
	if err != nil {
		t.Fatalf("embedded PNG not decodable: %v", err)
	}
	if img.Bounds().Dx() != 32 || img.Bounds().Dy() != 32 {
		t.Errorf("png bounds = %v", img.Bounds())
	}
	var _ image.Image = img
}
