## Summary

為 solar_mqtt_go 增加 Windows 系統列常駐模式：發佈單一無主控台視窗的 Windows 執行檔，啟動後縮入系統列，右鍵選單提供開啟網頁、暫停／恢復擷取、開啟資料夾、離開等功能。CLI 子命令介面維持不變。

## What Changes

- 新增 Windows tray 模式：tray 子命令；Windows 上無參數啟動即進入 tray 模式（GUI 子系統、不出現主控台視窗）。
- 新增內嵌網頁伺服器：以 go:embed 內嵌 web 儀表板資產（複製自 solar_mqtt/web），僅監聽 127.0.0.1（預設 port 18868），選單「開啟網頁」以系統預設瀏覽器開啟。
- embedded dashboard 新增 MQTT 訂閱可見區塊：以同一個 `factoryDataTopics(prefix, factoryId)` 來源呈現 KN 與 CL 的實際訂閱 topic，顯示尚未訂閱／已送出訂閱狀態，prefix 變更時同步更新，且不顯示帳密。
- 系統列選單：開啟網頁、暫停／恢復擷取（核選項）、開啟資料夾（exe 目錄）、離開（優雅停止服務與 embedded server）。
- tray 模式下 stdout/stderr 重新導向至 exe 目錄旁 solar.log（append）。
- 單一實例保護：同機第二個 tray 實例啟動即退出（Windows 以命名 mutex）。
- 建置：只產出 Windows `windowsgui` tray 與 console 兩個單檔；不再產出 macOS app、darwin CLI 或 Linux CLI。
- 服務本體（workers、MQTT、storage、control plane）行為不變。

## Non-Goals

- 不做 Windows 原生通知氣泡、自動更新或開機自啟。
- 不改動 web 儀表板本身的功能（僅搬移並內嵌；mqtt.min.js over ws 對 127.0.0.1 可用）。
- 不做多語系、佈景主題或圖示動畫；圖示為單一靜態 .ico。
- 不把 tray 與其他服務管理方式整合；tray 與 console 為互斥的兩種執行方式。

## Capabilities

### New Capabilities

- `solar-mqtt-go-systray`: 系統列常駐模式——tray 圖示、右鍵選單（開啟網頁／暫停恢復／開啟資料夾／離開）、內嵌僅本機的網頁伺服器、MQTT 訂閱可見區塊、無主控台單檔建置、單一實例保護、log 檔重導向。

### Modified Capabilities

(none)

## Impact

- Affected specs: 新增 solar-mqtt-go-systray capability；不修改既有 capability。
- Affected code:
  - New: solar_mqtt_go/internal/tray/（systray 選單與生命週期）、solar_mqtt_go/internal/webui/（embedded HTTP server + 儀表板靜態資產）、solar_mqtt_go/assets/tray.ico、solar_mqtt_go/build_dist.sh
  - Modified: solar_mqtt_go/main.go（tray 子命令與 Windows 預設分派）、solar_mqtt_go/commands.go（runTray 接線）
  - Removed: macOS app bundle、darwin CLI 與 Linux CLI 的 dist 輸出及其專屬 metadata。
- 依賴新增：github.com/getlantern/systray（Windows 為純 Go syscall 實作，維持 CGO_ENABLED=0 建置可行）。
