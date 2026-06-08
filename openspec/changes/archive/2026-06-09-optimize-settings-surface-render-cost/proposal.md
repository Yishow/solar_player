## Summary

降低三個 settings 頁 PlaybackSettings / MqttSettings / CircuitSettings 的 render 成本：為缺少 memo 的 viewModel 建構加上 `useMemo`、為列表 row 元件加上 `React.memo`、把傳給子元件的 handler 以 `useCallback` 穩定化，使 polling、每秒 tick 與表單打字不再觸發整頁重算與整表重繪，且不改任何畫面輸出與既有 save/test/CRUD 行為。

## Motivation

三頁各有獨立的高頻重算來源：

- **MqttSettings**：`apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx` 在 component body 直接呼叫 `buildMqttSettingsViewModel(...)`，無 `useMemo`；`index.tsx` 有 5 秒 topic polling（`window.setInterval` → `loadTopics`），每次 polling 的 `setTopics`/`setStatus` 觸發整頁 re-render → viewModel 完整重建（多次 topic map/filter/coverage 計算）→ `TopicWorkspaceRow`（`apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx`，無 `React.memo`）全列重繪。`index.tsx` 的多個 handler（如 `handleSettingChange`、`handleTopicChange`、`testConnection`、`saveTopicMappings`、`reloadTopics`、`addTopicMapping`、`removeTopicMapping`、`saveSettings`）皆無 `useCallback`，使任何 child memo 失效。
- **CircuitSettings**：`apps/web/src/pages/CircuitSettings/index.tsx` 的 viewModel 已正確包在 `useMemo`，但 `apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx` 將整張迴路表以單一 `rows.map(...)` 渲染、無 row-level 元件且無 `React.memo`，每列含多個 input；編輯任一格觸發 `setCircuits` → 整表重繪。
- **PlaybackSettings**：`apps/web/src/pages/PlaybackSettings/index.tsx` 在 component body 呼叫 `buildPlaybackSettingsViewModel(...)`，無 `useMemo`；頁面以 `usePlaybackController({ tickMs: 1000 })` 每秒更新 runtime（countdown/progress），導致 viewModel 每秒重建，`PlaybackSettingsFormSections` 與 `LiveRotationPreviewList` 每秒重繪。

這些都是 management surface，本 change 維持其既有 API、draft、save/test/CRUD 行為與畫面輸出，只調整 render 路徑。

## Proposed Solution

1. **MqttSettings**：把 `buildMqttSettingsViewModel(...)` 包進 `useMemo`（dependency 為實際輸入 props）；為 `MqttSettingsContent` 與 `TopicWorkspaceRow` 加 `React.memo`；把 `index.tsx` 傳給 content 的 handler 全部 `useCallback` 化，使 5 秒 polling 進來時僅變動的 row 重繪。
2. **CircuitSettings**：抽出 `React.memo` 的 row 元件承載單列迴路欄位，`handleFieldChange`/`handleDelete` 等以 `useCallback` 穩定化，使編輯一格只重繪該列；viewModel 既有 `useMemo` 維持不動。
3. **PlaybackSettings**：把 `buildPlaybackSettingsViewModel(...)` 包進 `useMemo`；將每秒變動的 runtime 值與不變的 form 資料分離，使 `LiveRotationPreviewList`（加 `React.memo`）承接每秒值、而 form sections 不因 tick 重繪；穩定傳入子元件的 handler/prop。

驗證以三頁既有 web tests 全綠為基準（不得修改既有斷言），並以 `agent-browser` 確認 save / test connection / topic 與 circuit 的 CRUD、draft dirty 標示行為與現狀一致。

## Non-Goals

- 不改三頁的 API、序列化（含 MQTT 密碼回傳 `****` 行為）、draft/save 契約或資料模型。
- 不改畫面輸出（DOM/style/文字不變）。
- 不改 polling 間隔或新增/移除 polling。
- 不處理 playback 五頁、editor、其他 management 頁（各自獨立 change）。

## Alternatives Considered

- **只加 `React.memo` 不做 `useCallback`**：MqttSettings 的 handler 每 render 重建會使 row memo 立即失效，polling 時仍全列重繪；兩者必須一起做。
- **CircuitSettings 改用 debounce/useDeferredValue 取代抽 row 元件**：能降低打字重算，但無法消除整表重繪的根因（單一大 map）；抽 row + memo 更直接。

## Capabilities

### New Capabilities

- `settings-surface-render-invariance`: 釘住「settings 頁 render 效能優化必須維持畫面與行為不變」的契約——memoization、row 元件化與 handler 穩定化不得改變 DOM/style/文字輸出，且 save / test connection / topic 與 circuit CRUD / draft dirty 標示行為與既有一致；以既有 web tests 與瀏覽器 witness 為驗證門檻。

### Modified Capabilities

(none)

## Impact

- Affected specs: `settings-surface-render-invariance`（新增；描述 settings 效能優化的零行為變動契約）。
- Affected code:
  - Modified:
    - apps/web/src/pages/MqttSettings/index.tsx
    - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
    - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
    - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
    - apps/web/src/pages/PlaybackSettings/index.tsx
    - apps/web/src/pages/PlaybackSettings/LiveRotationPreviewList.tsx
  - New:
    - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
  - Removed: 無
