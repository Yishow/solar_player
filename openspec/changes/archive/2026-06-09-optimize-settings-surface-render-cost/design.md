## Context

三個 settings 頁的高頻重算來源各異：MqttSettings 有 5 秒 topic polling（`index.tsx` 的 `window.setInterval` → `loadTopics`），且 `MqttSettingsContent.tsx` 的 `buildMqttSettingsViewModel` 無 `useMemo`、`TopicWorkspaceRow.tsx` 無 `React.memo`、`index.tsx` 的 handler 無 `useCallback`；CircuitSettings 的 viewModel 已正確 `useMemo`，但 `CircuitSettingsContent.tsx` 以單一 `rows.map(...)` 渲染整表、無 row 元件與 memo；PlaybackSettings 的 `buildPlaybackSettingsViewModel` 無 `useMemo`，且 `usePlaybackController({ tickMs: 1000 })` 每秒更新 runtime 使 viewModel 每秒重建。三頁皆為 management surface，須保留 API/draft/save/test/CRUD 行為與畫面輸出。

## Goals / Non-Goals

**Goals:**

- 為缺 memo 的 viewModel（Mqtt、Playback）加 `useMemo`；CircuitSettings 維持既有 viewModel memo。
- 列表/表單 row 元件化並加 `React.memo`，handler 以 `useCallback` 穩定化，使 polling、每秒 tick、打字只重繪受影響子樹。
- 畫面輸出與 save/test/CRUD/draft 行為零變動。

**Non-Goals:**

- 不改 API、序列化（含 MQTT 密碼 `****`）、draft/save 契約、資料模型。
- 不改 polling 間隔或數量。
- 不改畫面輸出。
- 不處理 playback 五頁、editor、其他 management 頁。

## Decisions

### Memoize MqttSettings viewModel and stabilize content handlers

把 `buildMqttSettingsViewModel(...)` 包進 `useMemo`（dependency 為實際輸入 props），為 `MqttSettingsContent` 加 `React.memo`，並把 `index.tsx` 傳入的 handler（settingChange、topicChange、testConnection、saveTopicMappings、reloadTopics、addTopicMapping、removeTopicMapping、saveSettings）全部 `useCallback` 化。理由：5 秒 polling 的 `setTopics`/`setStatus` 是高頻 re-render 來源；memo + 穩定 handler 才能讓 polling 只重繪變動部分。

### Memoize TopicWorkspaceRow

為 `TopicWorkspaceRow` 加 `React.memo`，並把其內的 `renderInputGroup` 巢狀函式提取為穩定形式（移出 render 或 useCallback）。理由：polling 後僅變動的 topic row 應重繪，而非全列。

### Extract memoized CircuitRow component

將 `CircuitSettingsContent.tsx` 的單列迴路欄位抽成 `apps/web/src/pages/CircuitSettings/CircuitRow.tsx`，以 `React.memo` 包裝，`handleFieldChange`/`handleDelete` 等以 `useCallback` 穩定化並以 row id 為參數。理由：目前整表共用一個 map，編輯一格 `setCircuits` 即整表重繪；row 元件化使「改一格只重繪一列」。CircuitSettings viewModel 既有 `useMemo` 不動。

### Memoize PlaybackSettings viewModel and isolate per-second runtime

把 `buildPlaybackSettingsViewModel(...)` 包進 `useMemo`，並將每秒變動的 runtime 值（countdown/progress）與不變的 form 資料分離：每秒值只餵給加了 `React.memo` 的 `LiveRotationPreviewList`，form sections 不因 tick 重繪。理由：`tickMs:1000` 每秒重建整個 viewModel 使整個 form 每秒重繪。

## Implementation Contract

**Behavior（對使用者而言）：** 三頁畫面（欄位、版面、文字、dirty 標示）在優化前後一致。MqttSettings：5 秒 topic polling 仍更新狀態與 topic 列，save settings / test connection / topic mapping 的新增/刪除/儲存、密碼以 `****` 呈現等行為不變。CircuitSettings：新增/刪除/編輯迴路、儲存、dirty count 行為不變；編輯一格只重繪該列。PlaybackSettings：rotation 預覽每秒更新如常，儲存與表單編輯行為不變。

**Interface / data shape：** 不新增或變更 API、socket、序列化、draft/save 契約或資料模型。`buildMqttSettingsViewModel` / `buildPlaybackSettingsViewModel` / `buildCircuitSettingsViewModel` 的輸入與回傳 shape 不變。新增的 `CircuitRow` 元件承接既有單列欄位的相同 props 語意（row 資料 + 穩定 handler），不改變對外行為。子元件以 `React.memo` 包裝、handler 以 `useCallback` 提供，props 介面不變。

**Failure modes：** memo dependency 漏列實際輸入 → 表現為「資料/狀態更新但畫面未更新」（例如 polling 來了但 topic 列不變、儲存後 dirty 未清），由既有測試與瀏覽器 witness 捕捉並修正。`useCallback` dependency 漏列 → handler 用到過期 closure（例如儲存送出舊值），同樣以測試/witness 把關。memo dependency 多列最壞退化為現狀，正確性不受影響。

**Acceptance criteria：**

- `pnpm --filter @solar-display/web test` 全綠；三頁既有測試（含 `MqttSettingsContent`、`TopicWorkspaceRow`、`CircuitSettingsContent`、PlaybackSettings 相關）不需修改即通過。
- 以 `agent-browser` 驗證：MqttSettings 觀察 5 秒 polling 更新、執行 test connection 與 topic mapping save；CircuitSettings 新增/編輯/刪除迴路並儲存、確認 dirty count；PlaybackSettings 觀察 rotation 預覽每秒更新並儲存——皆與現狀一致。

**Scope boundaries：**

- In scope：上述六個既有檔案的 memoization/handler 穩定化，與新增 `CircuitRow.tsx`。
- Out of scope：viewModel 演算法改寫、API/序列化/draft 契約、polling 間隔、其他頁面、任何畫面調整。

## Risks / Trade-offs

- [MqttSettings handler 漏列 useCallback dependency 導致儲存舊值] → 以既有 `MqttSettingsContent.test` 與瀏覽器 witness（實際 save/test）驗證。
- [CircuitRow 抽離時不慎改動欄位 DOM/style 造成畫面變動] → 以既有 `CircuitSettingsContent.test` 與 witness 對照，畫面輸出不變為門檻。
- [PlaybackSettings runtime 值分離後，預覽每秒更新與儲存資料耦合不當] → 確保 form 儲存讀取的是 form state、預覽讀取 runtime，兩者來源分明；witness 驗證儲存正確且預覽如常。
- [TopicWorkspaceRow memo 後 props 含每次新建物件使 memo 失效] → 連同上游 prop 穩定化一起處理，否則僅效益打折、正確性不受影響。
