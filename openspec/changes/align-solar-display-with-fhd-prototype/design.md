## Context

`solar-display` 的 14 條 route 已經對應到完整的展示與管理頁家族，但現有 React UI 還停留在通用 dashboard 風格。`kuozui-green-fhd-html-prototype` 則提供了完整的 FHD kiosk 參考：共享 shell、展示頁 hero/KPI 節奏、設定頁分區、監控頁高密度資訊版型、頁碼與 footer navigation。問題不是「要不要對齊 prototype」，而是「怎麼把對齊工作切成 AI 不會跳步的順序」。

本次 design 的核心輸出，是把原本容易被當成單一大改的視覺整合，改成具備先決條件、風險隔離、逐頁 mapping 與 phase evidence 的 rollout contract。實作者必須先完成 shell primitives 與 page mapping，再做 route-specific migration；高風險頁面必須獨立成批次；每一批都要留下行為驗證與人工視覺證據。

現況限制：
- Prototype 是靜態 HTML/CSS，含示意值、暫用資產與純展示 copy，不能直接當 runtime contract。
- 現有頁面資料來源異質：live socket、REST API、mock/fallback 並存。
- `MqttSettings`、`PlaybackSettings`、`CircuitSettings` 不是單純展示頁，屬於具保存/測試/CRUD 風險的互動頁。
- `OfflineError`、`SlideshowPreview`、`DeviceStatus` 牽涉 routing、rotation、連線恢復與維護操作，不能只當作普通靜態頁改版。

## Goals / Non-Goals

**Goals:**

- 把這個 change 明確定義成 phase-gated rollout，而不是一次性完成 14 頁的大任務。
- 建立共享 FHD shell、page density variants、共享 primitives，讓後續頁面遷移都建立在同一套視覺底座上。
- 依頁面功能風險拆批：播放頁、低風險設定頁、高風險設定頁、監控與維護頁分開驗收。
- 為每一頁建立 prototype-to-runtime mapping，清楚標示資料來源、reference-only content、fallback-only content 與驗證方式。
- 要求每一批次都有 exit criteria、證據保存與未完成缺口紀錄，讓後續 agent 可直接接手。

**Non-Goals:**

- 不允許把這份 change 當成單一 PR、單一 apply session 或單一 commit 的工作包。
- 不重寫 backend API、MQTT schema、SocketService、DB schema 或 playback engine 的核心演算法。
- 不把 prototype 靜態值、示意圖或樣本文案當成新的 API contract。
- 不在本次設計中新增 CMS、權限模型、報表系統或新裝置控制面。

## Decisions

### Freeze the execution order with hard phase gates

決策：明定 Phase 0 到 Phase 9 的順序，任何後續 phase 都不得在前一 phase 未達 exit criteria 時開始。

理由：AI 一旦看見「14 頁對齊 prototype」這種表述，最常見的錯誤就是直接挑最顯眼的頁面開改，略過 shell、mapping、fallback 與 interaction contract。硬性 phase gate 可以把「順序」寫成 contract，而不是靠實作者自律。

替代方案：
- 僅在 tasks 裡用編號暗示順序。拒絕原因：弱約束，容易被忽略。
- 靠 reviewer 口頭提醒不要跳步。拒絕原因：不可持久 handoff。

### Finish shell primitives before any route-specific migration

決策：任何 route-specific visual migration 之前，先完成 `LayoutShell`、`AppHeader`、`AppFooterNav`、`PageScaffold`、`PageContainer`、page number 與 density variants 的統一 contract。

理由：Prototype 的最大共性集中在 shell、頁碼、頁框節奏、標題區、狀態膠囊與 footer navigation。如果先逐頁畫面調整，再回頭動 shell，會造成大面積返工。

替代方案：
- 先做 `/overview` 當樣板，再回頭抽 shell。拒絕原因：樣板頁很容易把臨時結構帶進其他頁，最後反而難抽象。

### Split playback pages by coupling instead of migrating all five together

決策：播放頁拆成三批：`/overview` + `/solar`、`/factory-circuit`、`/images` + `/sustainability`。

理由：`/overview` 與 `/solar` 依賴 KPI、hero、status primitives；`/factory-circuit` 另有 flow diagram 與 circuit 資料映射風險；`/images` 與 `/sustainability` 則依賴 media slot、大圖區、placeholder 與較重的展示文案。這三類並不是同一種版面遷移。

替代方案：
- 五頁一次搬。拒絕原因：問題定位困難，且播放頁 fallback 行為無法逐批驗證。

### Split management pages by operational risk, not by route count

決策：管理頁拆成四批：`/settings/playback` + `/settings/images`、`/settings/mqtt`、`/settings/circuits`、`/trends` + `/history` + `/offline` + `/slideshow-preview` + `/device-status`。

理由：`PlaybackSettings` 與 `ImageManagement` 雖有操作，但風險相對可控；`MqttSettings` 牽涉 topic mapping、保存與 test connection，是最高風險頁；`CircuitSettings` 有 CRUD；監控與維護頁則偏 read-heavy 與 runtime-behavior-sensitive。以「一頁幾行 JSX」來拆不準，必須按互動風險拆。

替代方案：
- 按頁數平均分兩批。拒絕原因：會把高風險與低風險頁混在一起，驗證失焦。

### Isolate MQTT settings as a dedicated high-risk phase

決策：`/settings/mqtt` 獨立成單獨 phase，且視覺切版、狀態顯示、topic mapping、save/test 行為都要有專屬驗證。

理由：目前 `MqttSettings/index.tsx` 是整個前端中最重、最有狀態流的頁面之一。若把它夾在其他 settings 頁一起做，AI 很容易先改版面、漏掉狀態或錯誤流。

替代方案：
- 與 `CircuitSettings` 同 phase 處理。拒絕原因：兩者都是高風險互動頁，合併後過大。

### Bind runtime data through page-local adapters

決策：頁面資料仍由現有 hooks / REST / socket 提供，但 route component 應透過 page-local adapter 或 view-model 組裝到 prototype 所需的區塊結構。

理由：Prototype 區塊與現有資料 shape 不一樣。若直接在 JSX 中混 layout 與 mapping 邏輯，後續會很難維護，也不利於逐頁檢查 reference-only 與 runtime-bound content。

替代方案：
- 直接在頁面 component 裡面就地 mapping。拒絕原因：視覺與資料耦合過深，難以做 durable handoff。

### Preserve runtime contracts while allowing bootstrap-only prototype alignment

決策：Prototype 僅支配 layout、visual grouping、temporary asset slots、bilingual copy pattern；所有 runtime 行為仍以現有 route、API、hook、socket、MQTT status 為準。

理由：此專案已經有真實的保存、重試、離線、輪播、裝置狀態流程。視覺整合不能反向決定系統 contract。

替代方案：
- 把 prototype 的欄位與文案直接升格為執行契約。拒絕原因：會讓示意資料污染產品真相來源。

### Require evidence bundles at every phase boundary

決策：每一個 phase 完成時都要保存四類證據：受影響 route 清單、prototype 對照 screenshot、執行過的命令、仍未解決的 reference/runtime gap。

理由：沒有證據 bundle，就等於下一位 agent 只能重新探索。這正是「跳步」與「漏東漏西」的根源之一。

替代方案：
- 只在最終收尾時整理證據。拒絕原因：太晚，無法支持中途 handoff。

## Execution Order

1. **Phase 0 - Inventory and verification matrix**
   - 逐頁建立 `01-14` prototype 到 route 的 mapping 表。
   - 標記每頁的 shared primitives、runtime data source、reference-only content、fallback-only content。
   - 定義每一批次要跑的 build/test/manual review matrix。
2. **Phase 1 - Shared shell foundation**
   - 重構 shell、header、footer、page scaffold、page number、density variants。
   - 建立 title block、section wrapper、status pill、action cluster、media slot 等共享 primitives。
3. **Phase 2 - Playback batch A**
   - `/overview`
   - `/solar`
4. **Phase 3 - Playback batch B**
   - `/factory-circuit`
5. **Phase 4 - Playback batch C**
   - `/images`
   - `/sustainability`
6. **Phase 5 - Management batch A**
   - `/settings/playback`
   - `/settings/images`
7. **Phase 6 - Management batch B**
   - `/settings/mqtt`
8. **Phase 7 - Management batch C**
   - `/settings/circuits`
9. **Phase 8 - Monitoring and maintenance batch**
   - `/trends`
   - `/history`
   - `/offline`
   - `/slideshow-preview`
   - `/device-status`
10. **Phase 9 - Cross-route verification and handoff**
   - 14 頁 shell consistency、page number、navigation、offline behavior、smoke verification、evidence bundle 收尾。

**Gate rule:** 實作者 MUST NOT 啟動下一個 phase，除非前一個 phase 的 route 清單、命令驗證、人工視覺檢查與 gap note 已完成並記錄。

## Phase Exit Criteria

- **Phase 0 exit**
  - `01-14` 每頁都有 prototype source、route、主要元件、資料來源、reference-only / runtime-bound / fallback-only 標記。
  - build/test/manual matrix 已對應到每個後續 phase。
- **Phase 1 exit**
  - `/overview` 與 `/settings/playback` 已能共享同一套 shell contract。
  - shell 相關變更通過 `pnpm --filter @solar-display/web build`、`pnpm --filter @solar-display/web test -- src/layouts/offlineRouting.test.ts src/hooks/playbackRouteNavigation.test.ts src/hooks/playbackRouteSync.test.ts`。
- **Playback phase exit**
  - 該批 route 的 prototype 對位完成。
  - 既有 route path、rotation、offline、fallback 行為未回歸。
- **Settings phase exit**
  - 該批 route 的保存、測試、重排、CRUD、錯誤顯示仍使用原 contract。
  - 對應 server tests 或 manual smoke 已跑。
- **Monitoring phase exit**
  - 高密度內容在 FHD 下可讀。
  - 離線/輪播/裝置狀態等 runtime-sensitive 行為未回歸。
- **Final exit**
  - `spectra analyze align-solar-display-with-fhd-prototype --json` 與 `spectra validate align-solar-display-with-fhd-prototype` 通過。
  - evidence bundle 完整，未完成項目被明確列為 out-of-scope 或 follow-up。

## Implementation Contract

**Behavior**

- AI MUST treat this change as a phase-gated rollout contract, not a one-shot visual rewrite.
- AI MUST finish shared shell and shared primitives before route-specific migration.
- AI MUST migrate routes in the declared phase order and record evidence at every phase boundary.
- AI MUST keep all existing route paths, playback rotation behavior, offline redirect behavior, REST payloads, MQTT status semantics, and save/test interaction contracts intact unless a later change explicitly modifies them.

**Interface / data shape**

- 每一頁仍沿用現有 route path：`/overview`、`/solar`、`/factory-circuit`、`/images`、`/sustainability`、`/trends`、`/settings/playback`、`/settings/images`、`/settings/mqtt`、`/settings/circuits`、`/history`、`/offline`、`/slideshow-preview`、`/device-status`。
- `useLiveMetrics`、`useMqttStatus`、`usePageRotation`、`requestJson`、現有 server routes 與 socket contract 不得因純視覺整合而改 shape。
- 每一頁若新增 page-local adapter，必須聲明輸入資料來源、輸出展示欄位、fallback 策略與 reference-only 欄位。

**Failure modes**

- 若資料來源不存在，頁面應使用既有 fallback/mock/placeholder，不可因新版面而空白或破版。
- 若保存或測試請求失敗，頁面仍應顯示現有錯誤狀態與恢復路徑，不可被新 layout 吞掉。
- 若前一 phase 驗證未完成，不得聲稱後一 phase 可開始。

**Acceptance criteria**

- 每一批次至少有一組 build/test 命令與人工 prototype 對照結果。
- 每一頁都能指出其 prototype source、主要元件與主要資料來源。
- 高風險頁 `MqttSettings` 必須有獨立的 save/test/error 驗證。
- 最終 14 頁 route walkthrough 必須檢查 shell consistency、page number、footer navigation、offline behavior 與 page-group readability。

**Scope boundaries**

- In scope：phase order、shared shell、共享 primitives、頁面分批遷移、page-local adapters、mapping artifacts、phase evidence bundle。
- Out of scope：後端 schema 重構、MQTT contract redesign、新 analytics、新權限系統、新媒體管線。

## Risks / Trade-offs

- [如果 phase 太粗，AI 還是會跳步] → 以 route family 與 interaction risk 再切細，並寫出 hard gate。
- [如果 tasks 只有 file path，後續 agent 會不知道完成條件] → 每個 task 都要描述可觀察行為與驗證命令。
- [如果 `MqttSettings` 不獨立處理，最容易在版面切換時漏掉狀態與錯誤流] → 把它獨立成單獨高風險 phase。
- [如果只做最終總驗收，中途 drift 會累積] → 每個 phase 都保留 evidence bundle 與 gap note。
