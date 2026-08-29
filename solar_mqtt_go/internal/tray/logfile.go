package tray

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
)

// RedirectLogging 將 stdout/stderr/log 套件輸出 append 至 exeDir/solar.log。
// 僅 tray 模式呼叫；回傳還原函式（還原 stdout/stderr 但保留檔案內容）。
func RedirectLogging(exeDir string) (restore func(), err error) {
	f, err := os.OpenFile(filepath.Join(exeDir, "solar.log"),
		os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		return nil, fmt.Errorf("無法開啟 solar.log：%w", err)
	}

	origStdout := os.Stdout
	origStderr := os.Stderr
	origLog := log.Writer()

	os.Stdout = f
	os.Stderr = f
	log.SetOutput(f)

	return func() {
		os.Stdout = origStdout
		os.Stderr = origStderr
		log.SetOutput(origLog)
		_ = f.Close()
	}, nil
}
