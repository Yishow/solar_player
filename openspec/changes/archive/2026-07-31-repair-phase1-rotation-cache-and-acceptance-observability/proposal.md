## Problem

Phase 1 的 50-Client 驗收宣稱三件事成立，但目前程式碼都不支持：

1. **Published Profile Version 讓 rotation 每個 request 重算一次。** `apps/server/src/routes/playback.ts` 的 `/api/playback/runtime` 一旦 `readDeviceProfileRollout()` 回傳非 null 的 desired version，就改走 `evaluatePlaybackSnapshot()`，完全繞過 `readEffectiveDisplayRotationSnapshot()` 與 `EffectiveRotationCache`。50 台 Device 各自輪詢時，`evaluateResolvedDisplayRotation()` 與 `readDisplayReadinessReport()` 變成每 request 每 Device 執行一次，違反 `phase1-multisite-playback-acceptance` 的「An unchanged Profile and Site cohort SHALL cause at most one full Effective Rotation evaluation per revision」。
2. **該路徑的重算完全觀測不到。** 繞過快取代表 `EffectiveRotationCache` 的 `evaluationCount` 不增加，`readEffectiveRotationEvaluationCount()` 與 `x-solar-rotation-evaluations` header 因此持平，acceptance harness 看不到成長。
3. **acceptance harness 的通過條件有數個恆真或取樣不足的檢查。** `scripts/device-scoped-playback-load.mjs` 以單一共用 closure 累加 `timeSignals` 與 `heartbeats`，只斷言聚合值，無法證明「每一台 Client 都收到」；`rotationEvaluations` 只在開場 sweep 取樣一次，publish 版本後與 10 分鐘穩態結束後都沒有再讀；heartbeat 上限寫成不透明的 `3 + floor(D / 10000)`，與 `docs/ops/device-scoped-playback-test-matrix.md` 記載的 `C x (1 + floor(D / 10000))` 對不起來。實作期查證後確認程式的數值是對的——多出的兩次是 harness 驅動 waiting 到 applied Profile rollout 時每台各送的心跳，與 spec 的 cadence 上界無關——錯的是文件與該常數缺乏說明。

附帶一個較小的缺陷：acceptance metrics header 寫在 304 分支之後，條件式請求命中時永遠不會帶出該 header；且該旗標直接讀 `process.env`，繞過 `apps/server/src/config.ts` 的設定邊界。

## Root Cause

`versioned-playback-profile-governance` 引入 published Profile Version 時，在 runtime route 內就地展開了一條新的求值分支，而沒有把它接回既有的 `EffectiveRotationCache` seam。快取只認得「profileId + siteScope」的 key 形狀，沒有能表達 profile version 的 key，於是新分支選擇直接呼叫底層求值函式。

harness 這一側，metrics 是在「harness 自己送出」的位置累加，而不是從 Server 的公開讀回面觀測，因此上限檢查衡量的是 harness 自己的 `setInterval` 節奏，不是受測系統的行為。`rotationEvaluations` 的取樣點寫在建立 cohort 的 sweep 裡，後續步驟沒有再取樣。

## Proposed Solution

- 在 `apps/server/src/services/displayRotationService.ts` 新增一個走 `EffectiveRotationCache` 的 published-version 求值入口，cache key 納入 profile version 識別、site scope、readiness 與 freshness revision，使同一 cohort 在 revision 不變時只完整求值一次，並讓 `evaluationCount` 正確累加。
- 改寫 `apps/server/src/routes/playback.ts`，讓 desired-version 與 default-profile 兩條路徑都經過快取入口；把 acceptance metrics header 移到 304 回應之前，使條件式請求也帶出；旗標改由 `apps/server/src/config.ts` 提供。
- 改寫 `scripts/device-scoped-playback-load.mjs`：Time Signal 與 heartbeat 改為逐一 Client 歸戶並斷言涵蓋率達全部 Client；`rotationEvaluations` 在 publish 之後與穩態視窗結束後重新取樣，並以「不隨 Device 數成長」為判準；heartbeat 上限拆成 spec cadence 上界加上具名的 rollout lifecycle 額度，數值維持不變但每一項都可被說明。
- 同步 `docs/ops/device-scoped-playback-test-matrix.md` 的 JSON 欄位清單、門檻公式與 playwright 前置條件，並補上 `docs/ops/conventions.md` 指令表缺少的兩個 root script。

## Non-Goals

- 不改動 heartbeat 或 Time Signal 的實際節奏、rotation 求值演算法本身，或 published Profile Version 的語意。
- 不重構 review 中列為判斷題的程式碼氣味（各 route 重複的 `parseId` 與 `sendError`、Socket 認證的測試相容分支、liveness registry 的未使用欄位）。
- 不重跑或改寫已歸檔 change 的 acceptance-evidence 內容；本 change 只修正程式與現行文件。
- 不新增 Phase 2 能力，不觸碰 FHD playback 視覺面。

## Success Criteria

- 對同一個 published Profile Version 與同一 site scope 連續發出 50 次 `/api/playback/runtime` 請求後，`readEffectiveRotationEvaluationCount()` 相對請求前只增加 1。
- 條件式請求（`if-none-match` 命中而回 304）在 acceptance metrics 開啟時仍帶出 `x-solar-rotation-evaluations` header。
- `node --test scripts/device-scoped-playback-load.test.mjs` 全數通過，且新增的 self-test 能證明：Time Signal 或 heartbeat 未涵蓋全部 Client 時驗收失敗；publish 後 rotation 求值隨 Device 數成長時驗收失敗。
- heartbeat 上限與 `docs/ops/device-scoped-playback-test-matrix.md` 記載的公式一致。
- `pnpm verify` 全 stage 通過。

## Impact

- Affected code:
  - Modified: apps/server/src/routes/playback.ts, apps/server/src/services/displayRotationService.ts, apps/server/src/services/effectiveRotationCache.ts, apps/server/src/config.ts, apps/server/src/routes/device-context-playback.test.ts, apps/server/src/config.test.ts, scripts/device-scoped-playback-load.mjs, scripts/device-scoped-playback-load.test.mjs, docs/ops/device-scoped-playback-test-matrix.md, docs/ops/conventions.md
  - New: (none)
  - Removed: (none)
