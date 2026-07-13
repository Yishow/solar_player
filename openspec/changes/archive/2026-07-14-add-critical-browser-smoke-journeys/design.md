## Context

repo已有 Playwright package但沒有 e2e config。server可以由 build output提供 web dist，並可透過 env指定 database/uploads/host/port與 mock data mode。smoke目標是少量跨層 contracts，不是複製所有 unit tests或 FHD視覺驗收。

## Goals / Non-Goals

**Goals:**

- 一個命令啟動隔離 runtime與 Chromium。
- 覆蓋四條跨 REST、Socket.IO、SQLite與 router journeys。
- 每次失敗留下足以診斷的 bounded artifacts。
- 保持 tests可重跑且不碰 production state。

**Non-Goals:**

- 不做全站 e2e或 cross-browser matrix。
- 不做 pixel snapshot/FHD acceptance。
- 不新增 production auth bypass或測試專用 route。
- lazy chunk failure由 bundle-splitting change驗證，不在此 change製造跨-change依賴。

## Decisions

### One isolated Chromium harness

`scripts/run-browser-smoke.mjs`建立 unique temp root，設定 DATA_DIR、DATABASE_PATH、UPLOADS_DIR、BRAND_UPLOADS_DIR、HOST=127.0.0.1、reserved PORT=3310、MQTT_DATA_MODE=mock，執行 production build並 spawn built server。port被占用時在任何 process啟動前 fail。

runner等待 /health後啟動 Playwright Chromium single worker。finally固定終止 server、關閉 browser並清理 temp root；failure artifacts搬到 repo ignore的 `artifacts/browser-smoke/<run-id>/`後才清理。

### Four observable-contract journeys

單一 spec file含四個獨立 tests：

1. 兩個 browser contexts製造 draft baseVersion conflict，reload latest後publish，另一 playback page透過 Socket/display sync看到值。
2. 上傳小型合法 PNG，加入 playlist，確認 Images顯示；在 isolated uploads移除檔案後確認 fallback而非 broken stage。
3. UI/API切換 deterministic mock mode，確認 readiness/rotation與 live metric更新。
4. reload playback page並中斷一次 Socket transport，確認 shell保持可見且 reconnect後 live value繼續更新。

selectors優先使用 role、label與 stable route contract；不以整頁 HTML或 CSS snapshot斷言。

### Evidence is retained only on failure

Playwright設定 screenshot only-on-failure、trace retain-on-failure；runner另收 browser console、failed requests與 server stdout/stderr。成功 run清理 artifacts；失敗 run保留四類 evidence並在 stderr印 absolute artifact directory。

## Implementation Contract

- Behavior：pnpm browser:smoke在隔離 runtime完成四 journeys，production files不被讀寫。
- Interface：root script browser:smoke；base URL固定 http://127.0.0.1:3310；artifact path含 run-id。
- Failure modes：port conflict、build/server readiness、browser launch、assertion或 cleanup失敗皆nonzero；cleanup failure不得隱藏原始 failure。
- Acceptance：連續跑兩次皆通過；temp DB/uploads不同；故意破壞一個 assertion時四類 evidence存在。
- In scope：harness、Playwright config、fixtures、四 journeys、gitignore。
- Out of scope：產品 API變更、chunk splitting、全站 e2e、FHD acceptance。

## Risks / Trade-offs

- [Chromium尚未安裝] → runner preflight檢查 executable並輸出明確安裝命令，不在 test中下載。
- [固定 port碰撞] → 啟動前檢查3310並清楚失敗，不嘗試殺除本 runner以外的 process。
- [Socket timing造成 flaky] → 等待 observable reconnect state與 bounded timeout，不使用任意 sleep。
- [fixture透過 UI建立成本高] → 可用 public/management API準備 isolated data，但 journey assertion必須經 browser觀察最終結果。

## Migration Plan

先實作 runner isolation與一條 journey，再逐條加入其餘三條；每條可獨立執行。此 change不接 root verify，避免將 browser環境要求強制加到 P0 local gate。
