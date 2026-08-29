## 1. 結構與樣式系統 (HTML & CSS System)

- [x] [P] 1.1 實作 Dual Visual Theme Support、Decision: Native CSS Design Tokens and Theme Switching 與 Decision: Responsive Layout Modes with Factory Tabs and Split Grid，並符合各檔案小於 400 行。
- [x] [P] 1.2 實作 Real-Time Summary KPI Metrics 與 Comprehensive 8-Column Zone Grid with Dynamic Discovery 的組件樣式，檔案小於 400 行。
- [x] 1.3 重構 `index.html` 語意結構，整合 Dual Layout Mode Support、Dual Visual Theme Support、Real-Time Summary KPI Metrics、Comprehensive 8-Column Zone Grid with Dynamic Discovery 與維運 Drawer；驗證檔案小於 400 行（依 Implementation Contract）。

## 2. JavaScript 模組化與資料流 (ES Modules & Telemetry View)

- [x] [P] 2.1 實作 Decision: Reactive 8-Column Zone Grid with Dynamic Key Discovery 與 Real-Time Summary KPI Metrics 的 `js/factory-view.js`，並以安全 DOM API 渲染。
- [x] [P] 2.2 實作 Decision: ES Module Modularization Preserving Security Contracts (<400 Lines per File) 的 `js/mqtt-manager.js`，以單一 `factoryDataTopics` 來源驅動訂閱、可見狀態與 memory-only credentials。
- [x] [P] 2.3 實作 Hardened Security and Control Contract Preservation 的 `js/config-view.js`，包含 `cmd/get-config`／`cmd/set` 與 bounded result correlation。
- [x] [P] 2.4 實作 Interactive Config JSON Viewer and Editor：格式化 `state/config`、表單／JSON 編輯切換、JSON 驗證與 allowlisted `cmd/set` 提交。
- [x] 2.5 實作 ES module `js/app.js` 入口，協調各模組、主題／版面與 `localStorage`。

## 3. 整合與合規驗證 (Integration & Verification)

- [x] 3.1 執行 `go test -v ./internal/webui`，覆蓋 control envelope 欄位、result correlation、credential isolation、可見訂閱與安全 DOM 渲染。
- [x] 3.2 驗證所有 `index.html`、`styles/*.css`、`js/*.js` 單檔皆小於 400 行，並執行 node module syntax checks、strict validate/analyze。
