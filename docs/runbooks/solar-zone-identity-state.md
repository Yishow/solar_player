# Solar zone identity state 維運

`solar_mqtt_go` 會在 `solar_config.json` 同一目錄維護 `solar_zone_identities.json`。這個檔案不是操作設定，而是 collector 用來固定 `factory + serial → numeric zone_id` 的 runtime identity registry。

## 備份與還原

- 備份 `solar_config.json` 時，**一起備份 `solar_zone_identities.json`**。
- 換機、重灌或搬移 collector 時，兩個檔案應一起還原到同一部署目錄。
- 不要手動清空或重新從 1 配號。若 sidecar 損壞，collector 會停止 serial-backed zone 的 canonical 資料流程，而不是靜默重建。
- sidecar 不含 Solar 登入密碼；新寫入檔案仍使用 `0600` restricted file mode。
- repo `.gitignore` 已排除正式 sidecar 與 `*.tmp-*` 暫存檔；不要把現場 identity state commit 進 Git。

## 首次升級

sidecar 尚不存在時：

1. 若 SQLite history 可用，collector 會讀取每個 factory 最近一個一致 timestamp 的 non-empty serial/zone_id snapshot 作為 bootstrap。
2. 歷史上已使用過的最大 zone id 會被保留為 allocation floor，避免新 serial 重用舊數字。
3. 若 SQLite 停用或沒有可用 snapshot，第一次成功 fetch 會依當次觀察配置 numeric id，並在任何 canonical publish/record 前先寫 sidecar。

因此，「沒有 sidecar、也沒有 history」的第一次升級無法推回舊版本曾使用的 mapping；這是一次性 continuity 限制，不應用名稱、容量等可變欄位猜測。

## Serial-less zone

上游沒有 serial 的 zone 只保留 position fallback，log 會明確警告。這類 zone **不具 durable hardware identity 保證**；若現場確實存在且需要歷史連續性，應另案選定可信 identity source。

## 故障處理

- `zone identity state JSON 損壞` / `不支援的 version`：先保留原檔，不要刪除；從可信備份還原或人工檢查 mapping。
- `zone_id 同時綁定不同 identity`：視為衝突，不要自行選一個繼續。
- sidecar 寫入失敗：修復目錄權限/磁碟空間後再重試；失敗那一輪不會先發布新配置的 canonical zone id。
- 同一部署目錄只應啟動一個正式 collector process；避免多 process 同時修改同一 sidecar。
