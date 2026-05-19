## Why

目前 editor 中的 `Image Source` / `Fallback Src` 實際上只是字串欄位，操作員必須自行理解這是 managed asset、相對路徑、brand fallback，還是 `Images` main stage 的缺圖備援。這種 opaque path input 難以驗證、難以教學，也讓 preview 與 runtime 的媒體來源語義不夠明確。

## What Changes

- 為 `Overview`、`Solar`、`Sustainability`、`Images` 的 persisted media binding 新增明確的 source mode controls，而不是只保留 raw string `src` 欄位。
- 支援至少三種 media source mode：managed asset reference、direct path/URL、page seed fallback；並在 editor 內呈現對應欄位、validation 與 health message。
- 讓 `Images` main stage 的 source contract 明確區分「playlist active asset」與「editor-configured fallback source」，避免操作員誤以為會直接覆蓋輪播來源。
- 讓 preview、draft save、publish 後的 playback route 使用同一個 media source resolver，同時保留既有 placement controls。

## Non-Goals

- 不重做 image playlist runtime、圖片治理流程或 asset upload 後台。
- 不處理 icon source、card typography 或 page chrome 樣式。
- 不把 `FactoryCircuit` 納入，因為它目前沒有對應的 persisted media binding。
- 不改 draft/live publishing 流程與 asset health panel 範圍。

## Capabilities

### New Capabilities

- `display-editor-media-source-controls`: 讓 display editor 為 persisted media binding 提供明確的 source mode controls、validation 與 preview/runtime parity。

### Modified Capabilities

- `display-page-asset-library-binding`: 將媒體欄位的 persisted contract 從單一隱式 asset/path string 擴充為顯式 source mode 與 source payload。

## Impact

- Affected specs: `display-editor-media-source-controls`, `display-page-asset-library-binding`
- Affected code:
  - Modified:
    - packages/shared/src/displayPageConfig.ts
    - packages/shared/src/index.ts
    - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
    - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
    - apps/web/src/pages/displayPageMediaStyle.ts
    - apps/web/src/pages/Overview/displayPageConfig.ts
    - apps/web/src/pages/Overview/index.tsx
    - apps/web/src/pages/Solar/displayPageConfig.ts
    - apps/web/src/pages/Solar/index.tsx
    - apps/web/src/pages/Sustainability/displayPageConfig.ts
    - apps/web/src/pages/Sustainability/index.tsx
    - apps/web/src/pages/Images/displayPageConfig.ts
    - apps/web/src/pages/Images/index.tsx
    - apps/web/src/components/displayPageAssetHealthPanels.tsx
  - New:
    - apps/web/src/pages/shared/displayMediaSourceConfig.ts
    - apps/web/src/components/displayPageMediaResolver.ts
  - Removed: (none)
