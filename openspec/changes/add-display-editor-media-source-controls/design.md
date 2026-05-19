## Context

`Overview`、`Solar`、`Sustainability`、`Images` 都有 persisted media binding，但 editor 中的 `Image Source` / `Fallback Src` 目前只是 raw string input。雖然 shared type `DisplayPageMediaBinding` 已有 `assetId` 與 `src`，實際 UX 仍缺乏顯式 source mode，操作員無法清楚知道是要綁 managed asset、輸入相對路徑，還是回退到 seed default。`Images` main stage 還同時混有 playlist active asset 與 config fallback source，語意更模糊。

本 change 目標是把 persisted media binding 的來源語義講清楚，並在 editor 中用可理解的 controls 呈現，而不是重新設計媒體 placement 或治理系統。

## Goals / Non-Goals

**Goals:**

- 為 `Overview`、`Solar`、`Sustainability`、`Images` 的 persisted media binding 建立顯式 source mode contract。
- 讓 editor inspector 依 source mode 顯示正確欄位、validation 與 health message。
- 讓 preview、save、publish 與 playback 使用同一個 media source resolver。
- 釐清 `Images` main stage 的 playlist active asset 與 editor fallback source 邊界。

**Non-Goals:**

- 不修改 image playlist runtime、asset upload、asset library 後台流程。
- 不處理 icon source、card style、page chrome、Factory Circuit。
- 不重做現有 placement controls（fit/focus/align），只確保它們與 source mode 共存。
- 不變更 publish workflow 或 asset health panel 的整體頁面架構。

## Decisions

### Extend DisplayPageMediaBinding with explicit sourceMode instead of opaque field inference

`DisplayPageMediaBinding` SHALL 新增顯式 `sourceMode`，並沿用既有 `assetId` / `src` 作為 mode-specific payload，而不是繼續從欄位有無去推斷來源。建議 mode 至少包含 `managed-asset`、`direct-src`、`seed-default`。這讓 existing stored shape 可較平滑遷移，也能讓 editor/preview/runtime 用同一組條件解析。

替代方案是建立巢狀 `source` object。那會更純粹，但需要更大 migration surface，也會讓現有 config merge/fallback 路徑一次大改，因此這輪不採用。

### Keep Images playlist active asset outside persisted fallback source controls

`Images` 頁的 active 顯示來源優先級 SHALL 維持 runtime playlist active asset 優先，editor-configured `mainStage` source 只在 playlist 缺圖、缺 metadata 或 fallback policy 觸發時生效。editor 文案與欄位命名必須明確表達這是 fallback source，而不是直接覆蓋輪播來源。

替代方案是讓 editor source 直接接管 `Images` main stage。這會破壞既有 playlist runtime contract，因此不採用。

### Reuse existing asset health and placement controls around resolved media source

既有 asset health reporting 與 placement controls 已經存在，因此本 change 只新增 source mode 與 resolver，不重做 health pipeline。health panel 與 editor field issue 只需要根據 resolved sourceMode/payload 呈現更精準的訊息。

替代方案是連 asset health 一起重寫。這會把 scope 擴到另一條已完成能力線，不採用。

## Implementation Contract

- **Behavior**: 當操作員在 editor 編輯 hero/main-stage media region 時，inspector SHALL 顯示 source mode selector 與對應欄位。改動後 preview SHALL 立即根據 mode/payload 解析圖片來源；儲存與發布後，playback SHALL 使用相同解析規則。
- **Interface / data shape**: `DisplayPageMediaBinding` SHALL 擴充 `sourceMode`，並讓 `assetId` / `src` 成為 mode-specific payload。editor schema SHALL 對應顯示 mode selector、managed asset reference 欄位、direct src 欄位，並保留 `alt` 與 placement controls。`Images` main stage SHALL 額外保留「playlist active asset 優先、config fallback 次之」的 resolver contract。
- **Failure modes**: 當 `managed-asset` 缺 `assetId`、`direct-src` 缺 `src`、或 source 不可解析時，editor SHALL 顯示 validation issue，preview/runtime SHALL 根據 fallback policy 回退到 seed default 或 placeholder，而不是拋出 exception。`Images` 不得因 fallback source 設定而覆蓋有效的 playlist active asset。
- **Acceptance criteria**:
  - 四個有 persisted media binding 的頁面都可在 editor 切換 source mode。
  - 已存在的 placement controls 在不同 source mode 下仍生效。
  - `Images` main stage 在 playlist active asset 存在時忽略 fallback src，在 fallback 條件觸發時才使用 editor source。
  - `display-page-asset-library-binding` 的 spec 與行為更新後，health/reporting 不再把 direct-src 模式誤判為缺 asset。
- **Scope boundaries**:
  - In scope: shared media binding type、editor field UX、media source resolver、Overview/Solar/Sustainability/Images wiring、spec delta for asset library binding。
  - Out of scope: playlist runtime redesign、asset upload/governance backend、Factory Circuit、page chrome/card style/icon source。

## Risks / Trade-offs

- [Risk] `sourceMode` migration 與既有 stored config 相容性不足。 → Mitigation: loader 對舊 config 做 field-inference fallback，save 後再寫回新 shape。
- [Risk] `Images` fallback 規則若命名不清會讓操作員誤解。 → Mitigation: inspector label 明確使用 `Fallback Source`，並補 preview/runtime regression examples。
- [Risk] health panel 現有邏輯把沒有 `assetId` 的 direct-src 一律視為 unhealthy。 → Mitigation: 依 `sourceMode` 區分需要 asset health 的 binding。
