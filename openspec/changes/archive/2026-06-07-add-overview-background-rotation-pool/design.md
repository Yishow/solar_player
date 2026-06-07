## Context

`displayPageRouteHost.tsx` 以 `key={page.pageKey}` 包 route frame，使每次 playback rotation 切到某頁時該 page component remount。因此「rotation 進入 Overview」等價於 Overview component mount，隨機選圖可在 mount 時做一次。Overview 既有 hero media 走 `resolveDisplayPageMediaSource` + media binding；asset/media source 機制已存在可重用。Overview config 為 `OverviewDisplayPageConfig`，editor inspector region 由 `overviewDisplayPageEditorRegions` 驅動。

## Goals / Non-Goals

**Goals:**

- Overview 可繫結一組背景候選圖（清單），渲染為滿版背景；widget 疊其上。
- 每次進入 Overview（mount）隨機選一張；池為空回退既有 hero media。
- 候選池由 editor 維護，沿用既有 asset/media source 機制。

**Non-Goals:**

- 不碰 server/SQLite/MQTT、nav/route、rotation 排程本身、其他四頁、背景轉場動畫。

## Decisions

1. **背景池存於 Overview config**：在 `OverviewDisplayPageConfig` 新增 `backgroundPool: { sources: DisplayPageMediaBinding[] }`（或等價的 source ref 清單），由 seed 提供 `overview_bg-1~4` 預設，可由 editor 增刪。
2. **隨機選圖在 mount 時做一次**：Overview component 以 `useMemo(() => pickRandom(pool), [poolSignature])` 在 mount 選一張；因 route host 的 `key` 機制，每次 rotation 進入會 remount → 重新隨機。純函式 `pickOverviewBackground(pool, randomFn)` 抽到 `backgroundPool.ts` 以利測試。
3. **空池 fallback**：池為空或選出的 source 無法解析時，回退既有 `heroMedia`，行為與現況一致（不破版）。
4. **滿版渲染**：背景以 fit cover 鋪滿 1920x1080 畫布，z-index 低於所有 widget；hero copy 與既有 widget 疊其上。
5. **editor 維護**：在 inspector 暴露背景池的 source 清單編輯（沿用既有 media/asset field 機制），不新增資料源。

## Implementation Contract

**Behavior（可觀察）:**
- 進入 `/overview`（runtime）時，若背景池非空，畫布以池中隨機一張圖滿版鋪底，KPI/天氣/三相/趨勢 widget 與 hero copy 疊其上。
- 每次 rotation 重新進入 Overview（component remount）時，重新隨機選一張背景（可能與上次不同；單張池則恆為該張）。
- 背景池為空時，畫面回退既有 hero media 呈現，無破版、無空白背景殘影。
- 於 editor 可新增/移除 Overview 背景候選圖，存 draft 並 publish 後 runtime 生效。

**Interface / 資料形狀:**
- `OverviewDisplayPageConfig` 新增 `backgroundPool` 欄位（source binding 清單）。
- 新純函式 `pickOverviewBackground(pool, randomFn = Math.random)`：回傳選中的 source 或 null（空池）。
- seed config 提供 `overview_bg-1~4` 作為預設池。
- inspector region 暴露背景池清單編輯欄位。

**Failure modes:**
- 空池 / source 解析失敗 → 回退既有 heroMedia，靜默不破版。
- `randomFn` 回傳越界值 → `pickOverviewBackground` 以索引夾擠（clamp / modulo）確保落在池範圍內。

**Acceptance criteria:**
- `pickOverviewBackground` 單元測試：空池回 null；單張池恆回該張；多張池在注入確定 randomFn 下回對應索引；randomFn 越界值被安全夾擠。
- Overview config 測試：seed 池含 4 張預設、可由 config 增刪、merge fallback 正確。
- Overview render 測試：池非空時背景元素存在且滿版（class/style 斷言）；空池時回退 hero。
- inspector 測試：背景池編輯欄位存在且綁正確 path。
- `pnpm --filter @solar-display/web test` 與 `pnpm run build` 全綠。
- agent-browser 1920x1080 擷取 `/overview`，witness 顯示滿版背景 + widget 疊放，記入 change artifact。

**Scope boundaries:**
- In scope：Overview config backgroundPool、隨機選圖純函式、滿版背景渲染、editor 清單編輯、seed 預設、fallback、測試、witness。
- Out of scope：server/SQLite/MQTT、其他四頁、rotation 排程、轉場動畫、nav/route。

## Risks / Trade-offs

- **大圖效能**：4 張 2.5MB 背景在低階機載入較慢。取捨：沿用既有 uploads 管道與瀏覽器快取；本輪不做預載最佳化。
- **隨機性可測性**：`Math.random` 不可測 → 以可注入 `randomFn` 解決，runtime 用預設。
- **mount 重隨機依賴 route host key**：若未來 route host 移除 `key` remount 行為，隨機時機需改寫；design 已記錄此依賴。
