package tray

import (
	"bytes"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"testing"
)

// TestLogFileRedirectOnlyInTray：RedirectLogging 後 stdout 落入 solar.log；
// CancelLogging 還原後輸出不再進檔。
func TestLogFileRedirectOnlyInTray(t *testing.T) {
	dir := t.TempDir()

	restore, err := RedirectLogging(dir)
	if err != nil {
		t.Fatal(err)
	}
	fmt.Println("tray-log-line-1")
	restore()

	// 還原後再印，不應進檔
	fmt.Println("after-restore-line")

	data, err := os.ReadFile(filepath.Join(dir, "solar.log"))
	if err != nil {
		t.Fatal(err)
	}
	content := string(data)
	if !containsStr(content, "tray-log-line-1") {
		t.Errorf("log missing tray line: %q", content)
	}
	if containsStr(content, "after-restore-line") {
		t.Errorf("log captured post-restore output: %q", content)
	}
}

func TestRedirectLoggingRestoresOriginalLogWriter(t *testing.T) {
	dir := t.TempDir()
	var original bytes.Buffer
	originalWriter := log.Writer()
	log.SetOutput(&original)
	t.Cleanup(func() { log.SetOutput(originalWriter) })

	restore, err := RedirectLogging(dir)
	if err != nil {
		t.Fatal(err)
	}
	log.Print("redirected")
	restore()
	log.Print("restored")

	if got := original.String(); !containsStr(got, "restored") {
		t.Fatalf("original log writer was not restored: %q", got)
	}
	if containsStr(original.String(), "redirected") {
		t.Fatalf("redirected log unexpectedly reached original writer: %q", original.String())
	}
}

func TestRedirectAppends(t *testing.T) {
	dir := t.TempDir()

	r1, err := RedirectLogging(dir)
	if err != nil {
		t.Fatal(err)
	}
	fmt.Println("append-first")
	r1()

	r2, err := RedirectLogging(dir)
	if err != nil {
		t.Fatal(err)
	}
	fmt.Println("append-second")
	r2()

	data, _ := os.ReadFile(filepath.Join(dir, "solar.log"))
	if !containsStr(string(data), "append-first") || !containsStr(string(data), "append-second") {
		t.Errorf("append semantics broken: %q", string(data))
	}
}

func containsStr(haystack, needle string) bool {
	return len(haystack) >= len(needle) && (func() bool {
		for i := 0; i+len(needle) <= len(haystack); i++ {
			if haystack[i:i+len(needle)] == needle {
				return true
			}
		}
		return false
	})()
}
