## 1. 背景池 schema 與隨機選圖純函式：Maintain an editor-managed Overview background pool / Pick a random background on each rotation entry

- [x] 1.1 在 `apps/web/src/pages/Overview/displayPageConfig.ts` 的 `OverviewDisplayPageConfig` 新增 `backgroundPool`（背景候選 source binding 清單），並在 `createOverviewDisplayPageSeedConfig` 以 `overview_bg-1~4` 作為 seed 預設；確認 `resolveOverviewModernDefaultConfig` 對缺 `backgroundPool` 的舊 config 回退 seed 池。
- [x] 1.2 新增 `apps/web/src/pages/Overview/backgroundPool.ts`，匯出純函式 `pickOverviewBackground(pool, randomFn = Math.random)`：空池回 null、單張恆回該張、多張依注入 randomFn 選對應索引、randomFn 越界值以 modulo/clamp 夾擠落入池範圍。
- [x] 1.3 新增 `apps/web/src/pages/Overview/backgroundPool.test.ts`，依 spec Example 表（pool 4/random 0.0→idx0、0.5→idx2、pool 1/random 0.99→idx0）與空池/越界案例斷言。

## 2. 滿版背景渲染與 fallback：Pick a random background on each rotation entry / Fall back to hero media when the pool is empty

- [x] 2.1 在 `apps/web/src/pages/Overview/index.tsx` 以 `useMemo(() => pickOverviewBackground(pool), [poolSignature])` 在 mount 選一張背景；池非空時渲染滿版背景元素（fit cover、z-index 低於 widget），池空或解析失敗時回退既有 `heroMedia`。
- [x] 2.2 在 `apps/web/src/pages/Overview/overview.css` 新增滿版背景 class（鋪滿 1920x1080、object-fit cover、z-index 低於所有 widget 與 hero copy）。
- [x] 2.3 新增/更新 Overview render 測試：池非空時背景元素存在且帶滿版 class；空池時不渲染背景、回退 hero。

## 3. Editor 背景池管理：Maintain an editor-managed Overview background pool

- [x] 3.1 在 `apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx`（或 Overview region schema）暴露背景池候選清單的新增/移除編輯欄位，沿用既有 media/asset field 機制並綁 `backgroundPool` path。
- [x] 3.2 補/更新 inspector 對應測試，驗證背景池編輯欄位存在且綁正確 path。

## 4. 驗證與 witness

- [x] 4.1 執行 `pnpm --filter @solar-display/web test` 與 `pnpm run build`，全綠。
- [x] 4.2 以 agent-browser 在 1920x1080 擷取 `/overview`，確認滿版背景 + widget 疊放成形、空池 fallback 正確，witness 記入本 change artifact。

## 5. Scope 守護：Preserve architecture and Overview-only scope

- [x] 5.1 以 `git diff --name-only` 確認未碰 server/SQLite/MQTT/nav/route/rotation 排程，且背景池僅作用於 Overview、無 page-local hardcode 繞過 editor。
