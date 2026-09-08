## Context

`indexSamplesByChannel` 產出的每個 channel series 已依 instant 遞增排序且濾掉非有限時間戳。`evaluatePeriod` 卻對它做線性操作：`series = index.filter(sampleMs <= closeCapMs)`、`lastAtOrBefore` 線性走訪、`identitySeries` 與 `contributing` 各再過濾一次。日窗口本身通常只涵蓋少數樣本，但這些操作的成本是整份歷史的長度。

`resolveDailyConsumptionPoints` 對一組日期共用同一份樣本陣列與索引（memo 已在 `fix-energy-history-range-projections` 完成），因此剩下的成本完全來自 `evaluatePeriod` 的逐日全掃描。

## Goals / Non-Goals

**Goals:** 一次多日期計算對樣本集合的掃描成本與日期數脫鉤；所有數值、品質、issues 與邊界判定逐位元不變。

**Non-Goals:** 不改快取架構、不改 API、不改資料模型、不追求微幅常數優化、不重寫時區解析（`periodWindow` 已有快取）。

## Decisions

### 1. 以排序索引的邊界查找取代逐日全陣列過濾

series 已排序，所以每個日期需要的其實是一段連續區間 `[openingIndex, closeIndex)`：

- `closeIndex` = 最後一個 `sampleMs <= closeCapMs` 的位置，二分搜尋取得；`closing` 即該位置的元素。
- `startIndex` = 最後一個 `sampleMs <= window.startMs` 的位置，二分搜尋取得；`globalOpening` 即該位置的元素。
- `opening` 是 `startIndex` 起向前走訪、第一個 identity 相符的元素。一般情況為 O(1)；只有在窗口起點前堆積大量他 identity 樣本時才退化，該情況本來就會判定為 `UNPROVEN_CONTINUITY`。
- `contributing` = `[indexOf(opening) … closeIndex)` 的區間，長度與該窗口實際樣本數成正比。

改動只換取得同一批元素的方式，不改任何 `degrade` 條件、順序或 issue 字串。

### 2. 用索引區間而非具體化中間陣列

目前每個日期都會配置 `series`、`identitySeries`、`contributing` 三個新陣列。改為在原陣列上以 `(start, end)` 索引界線走訪，讓長範圍不再產生與歷史長度成正比的暫時配置。若某段邏輯改寫後可讀性明顯變差，寧可保留具體化並只縮小到窗口區間——正確性核心的可讀性優先於最後一段常數改善。

### 3. 保留 contributing 的具體化，但只到窗口區間

改寫後 `contributing` 仍是一個 `slice`，但邊界已由二分搜尋界定，長度與該窗口實際樣本數成正比而非與整份歷史成正比。免除最後這層具體化需要把索引界線一路傳進累積迴圈，換來的常數改善不值得犧牲正確性核心的可讀性，因此依 Decision 2 的但書保留。

### 4. 回歸以掃描次數驗證，不以牆鐘時間驗證

在測試中包裹樣本存取（例如以計數包裝 `sampleMs` 的呼叫或注入計數用的索引），斷言「日期數加倍時，樣本層級的存取次數不隨之乘上樣本總數」。既有 `a full-year date set loads accepted samples once instead of re-scanning per day` 已示範同型手法（計 DB 查詢次數）。牆鐘時間門檻會隨機器速度浮動，不作為 gate。

## Implementation Contract

- 對任一組 (samples, meterIds, period, profile, asOf, freshnessPolicy)，`resolvePeriodConsumption` 的回傳值與改動前逐欄相同，包含 `valueKwh`、`observedDeltaKwh`、`quality`、`issues` 的內容與順序、`boundaryOffsets`、`baselineSampleIds`、`endSampleIds`、`dailyCoverage`、`provenance`。
- `resolveAccountingSpanConsumption` 與 `resolveReviewPeriodConsumption` 同上。
- 樣本層級存取次數對一組 D 個日期、S 筆樣本，不得為 Θ(D × S)。
- 既有 rollover、interval-energy、來源替換、epoch 變更、`receive-time-estimated`、跨月與跨年案例的既有測試全數維持綠燈，且不得為了通過而修改其期望值。
- 不新增匯出、不改動 `PeriodConsumptionResult` 型別。

## Risks / Trade-offs

- [改到正確性核心] → 這是整個能源功能的計算心臟。先加脫鉤證明測試，再以「行為逐欄相等」的對照測試（同一輸入跑新舊路徑比對）保護，任何既有測試需要改期望值即視為改壞。
- [二分搜尋邊界差一] → 以恰好落在窗口起點／終點、以及恰好落在其前後一毫秒的樣本建立邊界案例；`periodWindow` 的半開區間語意（含 start、不含 end）必須保持。
- [可讀性下降] → Decision 2 明確允許在可讀性明顯受損時保留具體化陣列，只縮小範圍。
- [優化了不是瓶頸的東西] → 實作前後都以同一份基準腳本量測並記錄數字，不以推論宣稱改善。

## Verification Approach

先寫脫鉤測試（掃描次數）與邊界差一測試，確認在現行實作下失敗或不成立。實作後重跑 `packages/shared` 全部測試、`apps/server` 的 `periodConsumptionService`、`metrics-history`、`departmentSharesService`、`energyAuthoringJourney` 與 `pnpm verify`，並附上改動前後同一基準的實測毫秒數。管理頁與播放頁的數值需在隔離資料環境比對修改前後 response 完全一致。

## Migration Plan

無資料或 schema 遷移。回復本 change 只會讓長範圍請求回到較慢的實作，數值不受影響。
