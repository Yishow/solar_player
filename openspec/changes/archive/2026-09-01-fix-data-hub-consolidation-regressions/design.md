## Context

目前 `Metrics` 卡片已取得 metric inventory，但展開內容仍以固定字串表示 usage 與 health；repo 內既有 `UsageModel` 與 `DiagnosticsModel` 已提供 usage/provenance API 的正規化入口。`ManagedSourceCard` 的摘要列下方無條件渲染次要 metadata，因此收合時不是單列。MQTT settings 的狀態協調與大型 JSX 分別集中在 `index.tsx` 與 `MqttSettingsContent.tsx`，兩者同時承擔多個可獨立命名的責任。

這是既有規格的回歸修正，不建立新 API、資料模型或產品操作流程。實作必須保留現有 dirty guard、polling、remote-sync、surface variant、selector 與測試可觀察行為。

## Goals / Non-Goals

**Goals:**

- Metric 卡片展開後顯示真實 usage、freshness、evaluation 與 failure 資料，並具有可辨識的 loading、empty、error 狀態。
- Managed Solar adapter 收合時只呈現一列摘要，展開後才顯示 metadata、zones 與 owned metrics。
- 將 MQTT settings 的協調邏輯與畫面區塊拆成具名責任，讓被重構與新建的 source files 各自少於 400 行。
- 以 focused tests 鎖定既有行為與本次回歸邊界。

**Non-Goals:**

- 不修改 server route、response shape、資料庫、MQTT topic 或部署方式。
- 不重設 Data Hub/MQTT 視覺語言，不調整 playback 設定契約。
- 不清理未被本次拆分觸及的既有長檔或相鄰技術債。

## Decisions

### 以現有 usage 與 provenance model 組成 metric 展開內容

`Metrics` workspace 使用既有 model loader，不在 component 內複製 API path 或 response normalization。Usage response 的 row 沒有 resolved `metricScope`，因此 usage 與 provenance/diagnostic 都在卡片首次展開時以可信的 `(metricScope, metricKey)` 查詢，並在 workspace 層以同一 identity 快取；不得先抓全 scope usage 再只依 `metricKey` 配對。卡片本身的 inventory row 提供即時 value、freshness 與 evaluation 基線，API 的 loading、empty 與 error 狀態明確呈現，失敗時不得回退成「Healthy」。

選擇 workspace keyed cache 與按需載入，是為避免重複請求同一 identity，同時避免初始頁面為所有 metric 產生 request fan-out。替代方案是一次預載全部 detail，但會增加初始 request 數，且全量 usage row 缺少 resolved scope，可能把同 key 的 CL/KN consumer 配錯；另一方案是只讀 inventory row，則無法顯示真實 consumer usage。

### 收合狀態只保留 Managed Solar 的摘要列

Managed card 的 header 是唯一的 collapsed surface，包含 health、topic 與 zone count；`SourceRowMeta`、resource details、owned metrics 與操作性內容全部置於 expanded branch。保留既有 button/ARIA expanded state 與資料 selector，讓鍵盤操作與 focused test 不因 DOM 改組失效。

替代方案是用 CSS 隱藏第二列，但仍會讓 accessibility tree 與 DOM contract 保留不應存在的收合內容，因此不採用。

### 依互動責任拆分 MQTT controller 與 content

Root `MqttSettings` 只負責組合 surface 與 domain hooks；broker、topic mapping/card-data、weather、load/polling 與 remote-sync 狀態放入具名 hooks 或 controller modules。`MqttSettingsContent` 只負責組合具名 panels；connection、source mode、topic operations、card data 與 weather view 各自成為 focused component。拆分後保留現有 props/data shape、request helpers、surface rules、DOM selectors 與 callback semantics，不趁機改 API 或互動。

每個新建或本次重構的 MQTT management source file 必須少於 400 行，且不能藉由把同一個巨型函式原樣搬到另一個檔案來達標。替代方案是單純移動 JSX/handlers，雖能降低兩個入口檔行數，卻沒有形成可測試責任邊界，因此不採用。

### 以 focused regression tests 與完整 web gate 驗證

先以 unit/component tests 覆蓋 metric detail 的 success/loading/empty/error、managed card collapsed/expanded DOM，以及 MQTT surface variants 與 selectors；再執行 web tests、typecheck/build，最後執行 repo `pnpm verify`。另以可重現的 line-count check 驗證本次新建與重構的 MQTT source files。

## Implementation Contract

- **Behavior:** Metric usage section 顯示實際 referencing playback pages/cards；diagnostics 顯示實際 freshness age/category、evaluation status、failure code 或無資料狀態。任何 request failure 必須顯示錯誤訊息，不能宣稱健康。
- **Identity / data shape:** Metric detail 一律以可信的 `(metricScope, metricKey)` 配對索引；沿用 `MetricUsageRow`、`MetricInventoryRow` 與 `DataHubDiagnosticsModel`，不新增 server response 欄位。
- **Managed adapter:** `aria-expanded=false` 時，card 只保留一列 summary，summary 可讀出 health、topic、zone count；展開後才出現 metadata、zone resources 與 owned metrics。
- **MQTT surface:** `/settings/mqtt` 與 Data Hub 內嵌的 `connections` / `operations` surfaces 保留相同 API calls、dirty guard、polling interval、remote-sync banner、disabled states、labels 與 `data-mqtt-*` selectors。
- **Failure modes:** Usage/provenance 載入中、無 consumer/diagnostic、request error 分別可辨識；既有可編輯 MQTT 草稿與 request error 行為不因拆分改變。
- **Acceptance:** Focused Data Hub/MQTT tests、web typecheck/build 與 `pnpm verify` 通過；所有本次新建或重構的 MQTT management source files 都少於 400 行；review diff 無 server/API/deployment 變更。
- **Scope boundaries:** 僅處理 proposal 列出的 Data Hub regressions 與 MQTT module boundary；不包含 archived task 清理、shared package deep-import 問題、視覺重設或 kiosk change。

## Risks / Trade-offs

- [Risk] Lazy provenance request 在快速切換卡片時回寫到錯誤 identity → 以 `(metricScope, metricKey)` keyed state/cache 並在 cleanup 後忽略 late response。
- [Risk] 拆分 controller 時 callback dependency 或 polling lifecycle 漂移 → 保留既有 hook dependencies，先鎖現有 tests，再逐責任搬移並重跑 focused tests。
- [Risk] DOM 拆分破壞 CSS 或 test selectors → 保留現有 class/data attributes 與 surface branching，component tests 同時驗證三種 surface。
- [Trade-off] 本次只要求被重構的 MQTT files 達到 400 行邊界；未觸及的既有長檔留待獨立 change，避免擴大範圍。
