## 1. 收斂 FactoryCircuit runtime 邊界

- [x] [P] 1.1 交付 Factory Circuit preserves last-known usable runtime state during refresh，並落實 Preserve last-known usable runtime state：在 apps/web/src/pages/FactoryCircuit/index.tsx 固定 refresh failure 下的 last-known visible state，並以 focused page tests 驗證失敗不清空 circuits-derived output。
- [x] [P] 1.2 交付 Factory Circuit separates circuits refresh from story refresh，並落實 Separate circuits source from story refresh：在同一檔案收斂 circuits source 與 story source 的 runtime boundary，並以 targeted tests 驗證 story refresh 不會重建 circuits source。

## 2. 鎖定 display sync 邊界

- [x] 2.1 交付 Factory Circuit preserves last-known usable runtime state during refresh，並落實 No-regression display sync boundary：以 display sync / fallback tests、spectra analyze、與 spectra validate 驗證 KPI、fallback、refresh semantics 不退化。
