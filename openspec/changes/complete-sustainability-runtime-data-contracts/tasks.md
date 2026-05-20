## 1. Source model split

- [x] 1.1 實作 `Keep data provenance as first-class presentation data in Sustainability` 的盤點，列出所有可見數值、文案模組與 provenance 欄位。
- [x] 1.2 定義 numeric aggregates、editorial modules 與 provenance metadata 的正式 payload 邊界，落實 `separate numeric runtime from editorial modules`。

## 2. Runtime contract

- [x] 2.1 擴充 `sustainabilityStoryService` 與相關 shared payload，實作 `Model Sustainability metrics by period key` 與 `Compose Sustainability story modules from configurable content blocks`。
- [x] 2.2 移除 page-local 靜態數值與 silent mocks，改為 explicit degraded or missing state，落實 `remove silent page-local mocks`。

## 3. Coverage and verification

- [x] 3.1 調整 readiness coverage，落實 `readiness should track rendered sustainability indicators`。
- [x] 3.2 補 server/web tests，覆蓋 period switch、module missing、aggregate missing 與 provenance stale 情境。
