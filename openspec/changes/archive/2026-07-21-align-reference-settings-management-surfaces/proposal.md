## Why

全站 audit 已確認 settings / management 類頁面的主要問題不是功能不存在，而是它們仍維持 dashboard-style panel grid，與 reference prototype 的 dense form board、table board、asset control board 結構差距明顯。但這一批頁面的風險比 display pages 高得多，因為它們包含 save/test/CRUD/upload 等互動契約，若直接追求視覺像 prototype，很容易把既有操作行為弄壞。

## What Changes

- 只處理 `docs/reference-match/all-pages-audit.md` 中的 settings / management form-heavy pages：`/settings/playback`、`/settings/images`、`/settings/mqtt`、`/settings/circuits`。
- 讓這些頁面根據 reference prototype 決定採用 shared management shell、reference panels、reference cards、reference status pills、reference form rows，而不是 generic dashboard cards。
- 為高風險頁面建立 display-state mapping，特別是 MQTT settings 與 circuit settings，避免 JSX 中 loading/disabled/error/success 分支爆炸。
- 保留現有 interaction contract：playback settings 的保存與排序、image management 的上傳/選取/預覽、MQTT settings 的 load/save/test/topic mapping、circuit settings 的 list/save/update/validation。

## Non-Goals

- 不處理 playback/display surfaces，例如 `/overview`、`/solar`、`/images`、`/trends`、`/history`、`/slideshow-preview`、`/device-status`。
- 不重寫 backend API shape、MQTT contract、image import pipeline 或 circuits CRUD contract。
- 不將 save/test/upload/action buttons 降級成純裝飾。
- 不追求所有 settings 頁都強行使用 playback canvas；management shell 與 reference panels 仍可保留較高可操作性。

## Capabilities

### New Capabilities

- `reference-settings-management-surface-alignment`: 定義 settings / management form-heavy pages 的 reference-aligned panel hierarchy、display-state mapping、interaction-contract preservation 與 high-risk verification。

### Modified Capabilities

(none)

## Impact

- Affected specs: `reference-settings-management-surface-alignment`
- Affected code:
  - Modified:
    - `apps/web/src/pages/PlaybackSettings/index.tsx`
    - `apps/web/src/pages/ImageManagement/index.tsx`
    - `apps/web/src/pages/MqttSettings/index.tsx`
    - `apps/web/src/pages/CircuitSettings/index.tsx`
    - `apps/web/src/pages/PlaybackSettings/viewModel.ts`
    - `apps/web/src/pages/ImageManagement/viewModel.ts`
    - `apps/web/src/pages/MqttSettings/viewModel.ts`
    - `apps/web/src/pages/CircuitSettings/viewModel.ts`
  - New:
    - `apps/web/src/referenceLayout/` 下對應 settings pages 的 layout constants、display-state mapping 與 asset mapping 檔案
    - `openspec/changes/align-reference-settings-management-surfaces/specs/`
  - Removed:
    - (none)
