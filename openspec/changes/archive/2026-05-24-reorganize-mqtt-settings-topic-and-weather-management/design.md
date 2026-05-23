## Context

`MQTT Settings` 目前右側有 `即時 Topic 清單`、`Topic Mapping`、`即時資料預覽` 三張卡，但三者都建立在同一批 `mappedTopics` 之上，導致 runtime 狀態、topic 字串與最後收值被分散重覆顯示。現在又要加入 weather 設定卡，如果不先整理 topic 區塊，畫面只會再多出一個孤立設定區。

使用者已明確指定：topic 區塊要整合、weather card 要獨立、weather 啟用/停用優先收在 card 內，header 顯示方式採「預設組合，可自訂欄位」，地點可在設定頁切換縣市/測站。這個 change 的責任是把這些 authoring 工作整理到 `MQTT Settings` 同一頁內完成。

## Goals / Non-Goals

**Goals:**

- 把 live topic 與 topic mapping 合併成偏編輯的 topic 總覽卡。
- 在同一張 topic 卡內保留 runtime summary 與 coverage findings，不讓 operator 來回切卡。
- 新增 weather 設定卡，支援啟用/停用、縣市/測站切換、preset/custom 欄位與 header preview。
- 維持 broker 設定卡與主要 action flow，不把 weather 設定拆成另一個管理頁。

**Non-Goals:**

- 不建立 CWA provider 或 weather persistence API。
- 不改變 broker 基本欄位與 `Save Settings` / `Test Connection` 行為定義。
- 不修改播放頁或管理頁 header 最終排版，只提供設定與預覽。

## Decisions

### Merge live topic status into editable overview rows

新的 topic 主卡以「可編輯總覽」為中心，每列同時承載 metric 名稱、topic input、unit input、enabled toggle、最新值、runtime 狀態與最後更新時間。這樣 operator 在看見 mapping gap 或 idle runtime 時，可以直接在同列修正，而不必在 `即時 Topic 清單` 與 `Topic Mapping` 間切換。

替代方案是保留兩張卡，只把其中一張縮小。這仍然無法解決資訊重覆與編輯動線割裂，因此不採用。

### Keep coverage and runtime summary at the top of the editable topic workspace

coverage findings 與 runtime summary 仍然重要，但不再獨立占一整張卡。它們會保留在 topic 總覽卡頂部，形成「先看狀態，再直接編輯」的工作流。這也讓 `mqtt-settings-runtime-preview-streaming` 與 `mqtt-settings-display-coverage` 的可觀測性保留在主要工作區內。

替代方案是把 coverage 移到 weather 卡或底部訊息區。這會讓 mapping 問題脫離編輯上下文，因此不採用。

### Put weather enable and field presets inside the weather card

weather card 自己承擔啟用/停用、preset/custom、location 選擇與 preview。這比把 toggle 另外放在 `Test Connection` 左邊更一致，因為 weather 是長期設定，不是臨時 action。若版面夠用，就不在 action bar 額外加入同義控制。

替代方案是在 action bar 放 `顯示天氣` switch，再把其餘設定收進現有卡。這會把設定語意分散在頁面不同區域，因此不採用。

### Model presets as first-class options with custom fallback

weather 欄位選擇採 `精簡 / 標準 / 完整 / 自訂` 四種模式。前三者是穩定 preset，`自訂` 才顯示可勾選欄位。這樣使用者可以快速切換常見組合，也能在需要時細調欄位。

替代方案是只有大量 checkbox。這會讓常見情境操作成本過高，也不利於 header preview 與後續測試，因此不採用。

## Implementation Contract

此 change 完成後，`MQTT Settings` 需要提供以下可觀測行為：

- topic 工作區改為單一主卡，至少包含：
  - runtime/coverage summary 區
  - 可編輯的 topic rows
  - `新增 mapping`、`Reload topics`、`Save mappings` 操作
- 每個 topic row 至少可直接編輯：
  - `topic`
  - `unit`
  - `enabled`
- 每個 topic row 至少可直接觀察：
  - `latest value`
  - `runtime status`
  - `last updated`
- weather card 至少包含：
  - `enabled`
  - `locationMode`
  - `countyName`
  - `stationId`
  - `preset`
  - `fieldKeys`（只在 `preset=custom` 時顯示欄位選擇）
  - header preview
- header preview 必須反映目前表單狀態，而不是等待真正儲存後才改變。
- weather card 若無法載入站點 options 或 current weather preview，必須顯示可讀錯誤或 unavailable 狀態，不可讓整張卡變空白。

失敗模式與 fallback：

- 若 topic rows 為空，topic 主卡仍需保留空狀態與新增 mapping 操作。
- 若 runtime stream 不可用，topic 主卡仍要顯示 fallback/polling 狀態，不可偽裝成 fully live。
- 若 weather `preset` 從 custom 切回預設組合，UI 要明確以 preset 欄位集覆寫 preview，不可留下舊的 custom 組合殘影。
- 若縣市切換後原本測站不再屬於該縣市，UI 需要求重選或清空測站，而不是靜默保留無效 station。

驗收條件：

- viewModel / component tests 覆蓋 topic 合併卡、coverage summary、weather preset/custom、header preview、空狀態與錯誤狀態。
- `spectra analyze reorganize-mqtt-settings-topic-and-weather-management --json` 無 Critical/Warning。
- `spectra validate reorganize-mqtt-settings-topic-and-weather-management` 通過。

明確 scope：

- In scope：`MQTT Settings` 右側資訊架構、topic 總覽編輯、weather 設定 card、preview 與相關 view model/tests。
- Out of scope：server provider、header 最終 render component、其他 management 頁面重構。

## Risks / Trade-offs

- [Risk] 單一卡片承載編輯與 runtime 資訊後，密度可能仍偏高。 → Mitigation：把 runtime summary 聚合到卡片頂部，row 內只保留最直接的可編輯/可觀察欄位。
- [Risk] weather card 與 topic card 同頁會增加 local state 複雜度。 → Mitigation：把 weather preset 與 preview 組裝抽成獨立 helper，避免 topic 與 weather 邏輯混在同一個大 viewModel 區塊。
- [Risk] 新增 `weather` sync scope 後，`MQTT Settings` 會同時監聽多種遠端刷新。 → Mitigation：在頁面與 sync tests 中明確列出 `mqtt` / `weather` 兩種 relevant scopes，其餘 scope 繼續忽略。
