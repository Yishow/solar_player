## Context

display-ops 管理面現在有兩條主線：一條是 `/display-pages/editor` 內的 page/asset/shell authoring，另一條是 `/settings/playback`、`/settings/images`、`/settings/mqtt`、`/settings/circuits`、`/slideshow-preview` 這些營運與預覽頁。前者剛完成整合，後者若不一起對齊 design tokens 與 page role，整體會出現「editor 像一套產品，settings 又像另一套產品」的斷裂。

## Goals

- 讓 display-ops 相關 settings/preview pages 使用一致的 semantic tokens 與 shared management/reference primitives。
- 重新定義 `/settings/images` 在 asset-library-integrated 之後的頁面角色，聚焦 playlist/runtime governance 與 editor handoff。
- 保留 MQTT 與 circuits 這類高風險 settings 的交互與 display-state contract。

## Non-Goals

- 不把所有 management routes 都納入本 change；只處理 display-ops 相關 settings/preview surfaces。
- 不重新引入 `/settings/assets` 作為主要資產庫頁，也不把 `/shell-decorations/editor` 拉回 footer 主導航。
- 不重寫 backend API、playlist governance contract、MQTT/circuit payload shape。

## Decisions

### Scope the display-ops settings family explicitly

本 change 僅涵蓋 `/settings/playback`、`/settings/images`、`/settings/mqtt`、`/settings/circuits`、`/slideshow-preview`。`/settings/assets` 已轉為 editor workspace redirect，`/shell-decorations/editor` 也已是整合入口，兩者不再作為主要 settings surface 重新設計。

### Reposition image management around governance and editor handoff

`/settings/images` 不再扮演主要圖庫頁，而是顯示播放清單、runtime 狀態、素材健康、選中素材治理資訊，以及前往 `/display-pages/editor?workspace=assets` 的清楚 handoff。這樣能避免「同一套資產流程有兩個半成品主頁」。

### Reuse shared reference-management primitives and semantic tokens

display-ops settings 頁面的 panel、banner、form row、stat card、preview frame、CTA 區塊應共用 tokenized management/reference primitives；若某頁需要 page-local layout，差異應來自資訊結構，而不是重新畫一套 palette。

## Implementation Contract

**Behavior**

- `/settings/playback` 與 `/slideshow-preview` 的 preview/status/actions 需呈現同一套 surface family。
- `/settings/images` 需清楚區分「素材治理與播放清單管理」和「進 editor 換素材」兩種動作。
- `/settings/mqtt` 與 `/settings/circuits` 在 token 對齊後，仍保留清楚的 loading/error/success/validation/display-state mapping。

**Styling**

- page sections、boards、banners、inputs、preview cards、CTA areas 需以 semantic tokens 與 shared management/reference primitives 驅動。
- 不允許這批頁面各自再長一套與 editor 無關的硬編碼視覺語言。

**Failure modes**

- 若 `/settings/images` 仍看起來像被掏空的舊圖庫頁，視為未完成。
- 若 design-token 對齊破壞 MQTT/circuits 的狀態可讀性或交互，視為重大 regression。
- 若 playback/slideshow preview 仍無法讀成同一個 surface family，視為未完成。

## Verification

- `apps/web/src/pages/PlaybackSettings/index.test.ts` 與相關 render tests 驗證 playback actions 未退化。
- `apps/web/src/pages/ImageManagement/index.test.tsx` 與 `viewModel.test.ts` 驗證治理資訊與 handoff role。
- `apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts`、`CircuitSettingsContent.test.ts` 驗證高風險頁狀態仍清晰。
- `apps/web/src/pages/SlideshowPreview/index.test.ts` 與 `liveManagementPreviewSurfaces.test.ts` 驗證 preview surface alignment。

## Risks / Trade-offs

- [把太多 settings 頁混成一次視覺改版] -> 明確只收 display-ops family，不擴到其他 monitoring 或 system 頁。
- [image management 定位不清] -> 在 spec 中把 governance 與 editor handoff 寫成硬需求。
- [高風險頁只換皮不顧狀態] -> 保留 explicit display-state mapping 與狀態可讀性做驗證 gate。
