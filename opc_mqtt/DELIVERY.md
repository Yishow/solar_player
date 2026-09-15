# DDE MQTT Bridge 交付說明

## 資料來源

此版本不再連線 OPC DA Server。它與既有 VB.NET `DDEClient` 使用相同的
InTouch DDE conversation：

```text
Service = view
Topic   = tagname
Item    = GCB_610_KWH 等裸 Tag 名稱
```

程式使用 Windows DDEML 的同步 Request 讀值，再沿用原本的虛擬標籤計算與
MQTT 發布流程。

## 執行條件

- `VIEW.exe` 必須已啟動，且 Tag 已有正常數值。
- Bridge 必須由與 `VIEW.exe` 相同的登入使用者、相同 Windows Session 啟動。
- 直接 DDE 模式不支援 Windows Service；服務執行於 Session 0，無法可靠連到
  互動式桌面的 `VIEW.exe`。
- 建議放入使用者的「啟動」資料夾或工作排程器，設定為「使用者登入時」執行。

## 初次驗證

在 `VIEW.exe` 正常運行的同一個桌面開啟 PowerShell：

```powershell
cd opc_mqtt
.\build.bat
.\opc_mqtt_console.exe run --config .\opc_config.json
```

預期訊息：

```text
DDE 已連線: view/tagname
Web UI: http://127.0.0.1:8080
```

接著開啟 Web UI，確認 `GCB_610_KWH` 等 DDE Raw Tags 顯示數值，再確認 MQTT
Broker 收到對應 topic。

## 設定檔

核心欄位如下：

```json
{
  "dde_service": "view",
  "dde_topic": "tagname",
  "dde_timeout_ms": 10000,
  "tags": [
    {
      "id": "GCB_610_KWH",
      "dde_item": "GCB_610_KWH",
      "unit": "KWH",
      "decimals": 1,
      "enabled": true
    }
  ]
}
```

舊版設定中的 `opc_address` 會在載入時依 `id` 自動遷移成 `dde_item`。透過 Web UI
儲存後，設定檔會改用新格式。

## 執行檔

- `opc_mqtt_console.exe`：初次驗證與排錯使用，會顯示 DDE/MQTT log。
- `opc_mqtt.exe`：同 Session 背景執行，不顯示 console 視窗。
- `uninstall-service`：僅供清除舊版本已安裝的服務。
- `install-service`：直接 DDE 模式會拒絕安裝並顯示原因。

## 常見錯誤

- `DdeConnect(view/tagname)` 失敗：確認 `VIEW.exe` 已啟動，且 Bridge 與 VIEW 位於
  同一登入 Session。
- 單一 Item Request 失敗：確認 `dde_item` 是 InTouch Tag Dictionary 中的精確名稱。
- DDE 正常但 MQTT 無資料：檢查 Broker、發布開關與虛擬標籤公式引用的 raw tag。
