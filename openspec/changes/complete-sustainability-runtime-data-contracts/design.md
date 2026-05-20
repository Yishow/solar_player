## Context

`Sustainability` 畫面目前的值分成四種來源：

- `storyRuntime.payload`：period-based big numbers、highlights、provenance
- `sustainabilitySummary` / `sustainabilityHighlights` mocks：在 story 缺值時補上
- page-local hardcoded presentation：`NT$ 60 M+`、固定 ESG bullets、`較去年成長 2.1%`
- readiness coverage：只看 `consumptionEnergy`、`selfConsumptionEnergy`

這四條鏈彼此並不對齊，所以頁面雖然可播放，但使用者無法知道哪些數值真正接到後端、哪些仍是臨時故事值。

## Goals / Non-Goals

**Goals**

- 讓 `Sustainability` 的大數值、highlight 與 editorial modules 都有正式來源類型。
- 將 manual story content 與 derived numeric content 分層管理。
- 讓 readiness coverage 對齊實際渲染的 sustainability cards。

**Non-Goals**

- 不更改 FHD 卡片布局。
- 不做新的 management rich text editor。

## Decisions

### Separate numeric runtime from editorial modules

決策：`Sustainability` 必須把 numeric runtime 與 editorial story modules 分開建模。

理由：綠色採購、ESG bullets、里程碑屬於可編輯內容；發電量、減碳量、節能成效屬於 numeric contract。混在一起時，任何一邊缺值都會被另一邊掩蓋。

### Remove silent page-local mocks

決策：保留 explicit fallback state，但移除 page-local 無來源 mock 值作為 production 預設。

理由：目前最大的治理缺口不是畫面空白，而是錯把 placeholder 當正式內容。

### Readiness should track rendered sustainability indicators

決策：readiness 應追蹤這個頁面真正在顯示的 derived indicators 與 required upstream counters。

理由：只追 `consumptionEnergy` 與 `selfConsumptionEnergy` 無法說明 `累積發電量`、`累積減碳量`、`植樹等效` 是否可信。

## Implementation Contract

1. `Sustainability` big numbers MUST 來自明確 server-side aggregate or rollup payload。
2. editorial modules 例如 ESG summary、milestone、procurement note SHALL 以可持久化 module contract 提供，不再硬寫在 page view model。
3. fallback MAY 顯示缺值或待配置狀態，但 MUST 不隱性回退到未標示來源的 mock number。
4. readiness MUST 對齊這個頁面實際顯示的 sustainability indicators 與其 upstream dependencies。

## Risks / Trade-offs

- 若把所有內容都算成 runtime metrics，管理者會失去編輯永續敘事的能力。
- 若 manual modules 不帶 provenance，頁面仍會有「哪段是人工輸入」不可見的問題。
- 若 readiness 只做到 server 端、不在頁面顯示 degraded copy，demo 現場仍難以判讀問題。
