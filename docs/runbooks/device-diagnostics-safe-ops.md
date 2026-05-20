# Device Diagnostics Safe Ops Runbook

這份 runbook 說明 `Device Status` 目前哪些 diagnostics 動作可安全在 app 內執行，哪些故障情境需要改走主機層處置。

## 邊界

- app 內 safe diagnostics 只包含讀取、摘要匯出與 readiness refresh。
- app 不會直接執行裝置 reboot、cache purge 或其他危險 host control。
- 若需要重啟 player process，請在主機層執行 `systemctl restart solar-display`。

## In-app safe checks

### `refresh-readiness`

- 作用：重新整理 display readiness、skip summary 與 asset health 摘要。
- 適用情境：剛調整 MQTT、Display Pages、圖片資產，想確認 blocking/warning 是否已消失。
- 期望結果：回傳最新的 safe diagnostics summary，不會觸發裝置控制。

### `export-summary`

- 作用：輸出目前 display diagnostics summary 快照。
- 適用情境：需要把目前 readiness / skip / asset health 狀態提供給維運或開發者。
- 期望結果：回傳目前 server 端已知的 summary，不修改主機狀態。

## 建議排查順序

1. 先看 `Device Status` 的 runtime summary，確認目前是 host health、display degraded、還是 access denied。
2. 執行 `refresh-readiness`，重新取得最新的 display diagnostics summary。
3. 若畫面顯示 blocking readiness finding，優先檢查 MQTT 設定、topic mapping 與 display page publish 狀態。
4. 若畫面顯示 skipped pages 或 asset unhealthy，優先檢查 `Display Pages Editor`、圖片資產與 publish history。
5. 若 app 內 safe checks 仍無法恢復，改走主機層處置。

## Host-level escalation

### Restart player service

當 diagnostics 指向 host-level 問題，或 app 內 safe checks 無法恢復播放時：

```bash
systemctl restart solar-display
```

- 這個指令對應目前 repo 內的 [deploy/solar-display.service](/Users/yishow/prj/solar_player/deploy/solar-display.service)。
- service 目前假設 `WorkingDirectory=/opt/solar-display`，並由 systemd 管理啟動、重啟與寫入目錄。
- 若環境沒有 systemd，請交由該環境的主機層維運流程處理；app 內不會假裝已執行 reboot。

## 不支援的危險操作

- `reboot`
  - app 內回傳 unsupported guidance，不會真的重開機。
- `clear-cache`
  - app 內回傳 unsupported guidance，不會直接清除 host cache。

## 何時升級處理

- `Device Status` 一直顯示 degraded，且 repeated `refresh-readiness` 之後 blocking findings 未消失。
- publish / asset / MQTT 問題已排除，但播放仍未恢復。
- 需要主機層 log、systemd 狀態、磁碟空間或程序存活資訊才能繼續定位。

## 關聯檔案

- [README.md](/Users/yishow/prj/solar_player/README.md)
- [docs/README.md](/Users/yishow/prj/solar_player/docs/README.md)
- [deploy/solar-display.service](/Users/yishow/prj/solar_player/deploy/solar-display.service)
