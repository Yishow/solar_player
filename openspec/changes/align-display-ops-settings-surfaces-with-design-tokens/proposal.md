## Why

display editor 與 integrated workspaces 進化後，相關的 display-ops settings/preview pages 若還停在舊 dashboard 或半 reference 拼裝態，就會讓整個管理流程前後落差很大。尤其 `/settings/images` 原本兼任圖庫角色，但資產庫已整合進 editor 後，它應回到 playlist/runtime governance 與 handoff 頁，而不是繼續像一個空心 asset page。

## What Changes

- 對齊 display-ops 相關 settings/preview surfaces 的 design tokens 與 shared management/reference primitives，範圍包含 `/settings/playback`、`/settings/images`、`/settings/mqtt`、`/settings/circuits`、`/slideshow-preview`。
- 強化 `/settings/images` 作為 playlist/runtime governance 與 editor handoff 頁的定位，避免與整合後資產庫重複。
- 讓 playback settings 與 slideshow preview 的 live preview 區、狀態區、actions 區使用同一套 tokenized surface language。
- 保留高風險頁 MQTT / circuits 的既有交互契約與顯式狀態映射，不因 design-token 對齊而退回 generic panel soup。

## Capabilities

### New Capabilities

- `display-ops-settings-design-token-alignment`: 定義 display-ops settings 與 preview surfaces 的 token 對齊、page role differentiation、以及 editor handoff contract。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-ops-settings-design-token-alignment`
- Affected code:
  - Modified:
    - `apps/web/src/pages/PlaybackSettings/index.tsx`
    - `apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx`
    - `apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx`
    - `apps/web/src/pages/ImageManagement/index.tsx`
    - `apps/web/src/pages/ImageManagement/ImageManagementContent.tsx`
    - `apps/web/src/pages/MqttSettings/index.tsx`
    - `apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx`
    - `apps/web/src/pages/CircuitSettings/index.tsx`
    - `apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx`
    - `apps/web/src/pages/SlideshowPreview/index.tsx`
    - `apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx`
    - `apps/web/src/components/reference/referenceManagement.css`
    - `apps/web/src/styles/tokens.css`
    - `apps/web/src/app/router.tsx`
    - `apps/web/src/components/AppFooterNav.tsx`
  - New:
    - `openspec/changes/align-display-ops-settings-surfaces-with-design-tokens/specs/display-ops-settings-design-token-alignment/spec.md`
  - Removed:
    - (none)
