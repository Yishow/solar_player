## 1. 建立 history shared cache

- [x] [P] 1.1 交付 Energy Trend and Energy History reuse warm history payloads by range，並落實 Shared range-aware warm cache：在 apps/web/src/pages/EnergyTrend/index.tsx 與 apps/web/src/pages/EnergyHistory/index.tsx 建立 shared range key warm cache，並以 cross-page tests 驗證同 range 不重做 cold visible reset。
- [x] [P] 1.2 交付 Energy History keeps partial-source semantics while using shared cache，並落實 Preserve partial-source semantics：以 Energy History source-level tests 驗證 degraded source 只影響自己的 lane。

## 2. 鎖定 chart / counter 行為

- [x] 2.1 交付 Energy Trend and Energy History reuse warm history payloads by range，並落實 No-regression chart and counter behavior：以 chart / counter focused tests、spectra analyze、與 spectra validate 驗證 range、chart、counter 行為不退化。
