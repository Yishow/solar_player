## 1. Spectra Artifact Gates

- [x] 1.1 確認 make-factory-circuit-routing-editable-svg artifact 與 proposal/design/spec/tasks 一致，交付可實作的 narrow change；完成後以 spectra analyze make-factory-circuit-routing-editable-svg --json 與 spectra validate make-factory-circuit-routing-editable-svg --strict 驗證無 Critical。

## 2. Connector Treatment Schema And Inspector

- [x] 2.1 針對 Connector treatments SHALL include editable stroke color 先寫 RED 測試，交付 strokeColor 預設 #4ade80、既有 strokeWidth/opacity/radius/lineCap default 不變、inspector exposes stroke color for connector treatment regions 的失敗覆蓋；完成後以 pnpm --filter @solar-display/web test -- src/pages/FactoryCircuit/configRender.test.ts src/pages/DisplayPagesEditor/inspectorFields.test.tsx 驗證測試因缺少 strokeColor 行為而失敗。
- [x] 2.2 實作 Add strokeColor to shared connector treatment config，交付 FlowConnectorTreatmentConfig.strokeColor: string、CSS color string fallback default #4ade80、以及 inspector strokeColor 欄位；完成後以 pnpm --filter @solar-display/web test -- src/pages/FactoryCircuit/configRender.test.ts src/pages/DisplayPagesEditor/inspectorFields.test.tsx 驗證通過。

## 3. Factory Circuit SVG Routing

- [x] 3.1 針對 Factory Circuit SHALL render routing as editable SVG strokes 與 Factory Circuit SVG routing SHALL derive endpoints from config geometry 先寫 RED 測試，交付 SVG overlay render、無 factory-circuit-routing-reference img、stroke-width/stroke/opacity 來自 connectorTreatments、path coordinates 來自 nodes/loadRows 的失敗覆蓋；完成後以 pnpm --filter @solar-display/web test -- src/pages/FactoryCircuit/svgRouting.test.ts 驗證測試因 PNG routing/runtime 尚未改為 SVG 而失敗。
- [x] 3.2 實作 Derive SVG routing from Factory geometry config、Use one absolute SVG overlay inside the circuit layout、Keep Factory routing source-like，交付 Factory Circuit SVG routing SHALL preserve playback circuit language、PV→inverter→switchboard 與 switchboard→6 load rows 的 inline SVG routing，且移除 Factory Circuit runtime 對四個 routing PNG imports 的使用；完成後以 pnpm --filter @solar-display/web test -- src/pages/FactoryCircuit/svgRouting.test.ts src/pages/FactoryCircuit/configRender.test.ts 驗證通過，並以內容審查確認未修改 shared header/footer、server、route shell、API 或資料模型。

## 4. Full Verification And Graph Refresh

- [x] 4.1 完整驗證本 change 沒有破壞既有產品行為，交付 web tests、server tests、build、Spectra strict validation 與 graphify AST refresh 全部通過；完成後以 pnpm --filter @solar-display/web test、pnpm --filter @solar-display/server test、pnpm run build、spectra validate make-factory-circuit-routing-editable-svg --strict、graphify update . 驗證 exit 0。
