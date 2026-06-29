## Why

目前資料存放與來源分散在 SQLite、uploads、MQTT runtime、weather source 與 browser-local cache，操作者只能靠工程師口頭說明或查檔案確認。需要一個管理頁清楚呈現目前所有實際資料來源、持久化位置、資料量與建議維運動作，但不應在未規劃完整前引入外部資料庫 connector。

## What Changes

- 新增 /settings/data-source 管理頁，顯示 Runtime SQLite、uploads/images、uploads/brand、MQTT、weather、history retention、browser-local cache 的現況摘要。
- 新增只讀 diagnostics API，回傳資料路徑、SQLite 表計數、uploads 檔案摘要、MQTT data mode 與相關功能入口，不回傳密碼或敏感值。
- 管理頁提供到 /settings/mqtt、/settings/images、/settings/playback、/device-status 的明確維運入口。
- 頁面提供推薦功能清單：runtime state export、DB backup/restore、health check、外部 DB connector 評估；推薦區只說明，不在本 change 實作外部 DB 寫入。
- 保持既有 management trusted-origin/access-token 邊界，未信任 caller 不得讀取 diagnostics payload。

## Non-Goals

- 不新增 PostgreSQL/MySQL/remote DB connector。
- 不把 MQTT/history/runtime 資料改存到外部 DB。
- 不回傳 MQTT password、management token、CWA authorization 或任何 secret。
- 不把資料來源設定頁做成可修改所有資料來源的 wizard；本 change 只做目前來源總覽與維運入口。

## Capabilities

### New Capabilities

- `data-source-settings-overview`: 定義 /settings/data-source 的資料來源總覽、只讀 diagnostics API、敏感值遮蔽與維運入口契約。

### Modified Capabilities

(none)

## Impact

- Affected specs: data-source-settings-overview
- Affected code:
  - New: apps/server/src/routes/data-source.ts
  - Modified: apps/server/src/app.ts
  - New: apps/server/src/routes/data-source.test.ts
  - New: apps/web/src/pages/DataSourceSettings/index.tsx
  - New: apps/web/src/pages/DataSourceSettings/viewModel.ts
  - New: apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - Modified: apps/web/src/app/router.tsx
  - Modified: apps/web/src/app/routeMeta.ts
  - Modified: apps/web/src/services/api.ts
  - Modified: apps/web/src/services/api.test.ts
  - Modified: apps/web/src/layouts/brandBootstrap.test.ts
