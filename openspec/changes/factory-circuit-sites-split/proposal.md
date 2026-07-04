## Why

為了解決中壢廠與觀音廠用電迴路展示需求的不同（中壢廠 6 個工程，觀音廠 8 個工程），我們需要將原本固定的單一 `/factory-circuit` 頁面擴展為多廠區支援。這不僅能準確呈現各廠區的實際用電配置，還能保留系統在 Full HD (FHD) 展示下的視覺完整度。

## What Changes

- **雙廠區頁面註冊**：在 `display_page_registry` 中註冊兩個獨立的 `/factory-circuit` 範本實例：
  - 中壢廠：路由為 `/factory-circuit`，文案為「中壢廠區用電迴路」，僅啟用 6 個工程（沖壓、車身、塗裝、裝配、原動力、事務系）。
  - 觀音廠：路由為 `/factory-circuit-guanyin`，文案為「觀音廠區用電迴路」，啟用 8 個工程（除中壢廠 6 個外，新增大車工程與ED電著）。
- **迴路 Slots 擴充**：原本固定 6 個 slots 的機制將擴充為 8 個 slots：
  - 新增 `heavy_vehicle` (大車工程，MQTT: `factory/power/heavy_vehicle`) 與 `ed_coating` (ED電著，MQTT: `factory/power/ed_coating`)，並變更/重構現有 slots 的 Key 命名，使其與實際工程名稱（`stamping`, `body`, `painting`, `assembly`, `utility`, `office`）保持一致。
- **動態 SVG 線路排線**：前端 SVG 總線的渲染改為根據當前頁面「可見工程」卡片的實際 top 和 height 坐標，動態計算與拼裝貝氏曲線 path 與端點 circle，以保證 6 條或 8 條線在 1080p 畫布下皆完美黏合，不穿幫。

## Non-Goals

- 本次變更不涉及修改前端路由框架的切換動畫、資料庫底層的 SQLite 架構，也不會為其他播放頁面（Overview, Solar）導入多廠區切換機制。

## Capabilities

### New Capabilities

- `factory-circuit-multi-site-split`: 支援中壢廠（6個工程）與觀音廠（8個工程）的用電迴路分流，包括 Slot Key 重構與擴充、動態 SVG 連接線繪製以及多頁面實例註冊。

### Modified Capabilities

(none)

## Impact

- Affected specs: `specs/factory-circuit-multi-site-split/spec.md`
- Affected code:
  - Modified:
    - `packages/shared/src/displayReadiness.ts`
    - `apps/server/src/services/displayStoryService.ts`
    - `apps/server/src/db/seed.ts`
    - `apps/web/src/pages/FactoryCircuit/displayPageConfig.ts`
    - `apps/web/src/pages/FactoryCircuit/index.tsx`
    - `apps/web/src/pages/FactoryCircuit/viewModel.ts`
    - `apps/web/src/pages/FactoryCircuit/layout.ts`
    - `apps/web/src/pages/CircuitSettings/viewModel.ts`
