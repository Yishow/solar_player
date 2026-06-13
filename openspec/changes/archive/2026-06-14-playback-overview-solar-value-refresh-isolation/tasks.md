## 1. 建立 static / value subtree 邊界

- [x] [P] 1.1 交付 Overview and Solar keep static subtree output stable during value-only refresh，並落實 Stable static subtree boundaries：在 apps/web/src/pages/Overview/index.tsx 固定 static layout、hero media、ornament、KPI shell 的輸出邊界，並以 render tests 驗證 value-only refresh 不改變 static output。
- [x] [P] 1.2 交付 Overview and Solar keep static subtree output stable during value-only refresh，並落實 Value-bearing runtime subtree only：在 apps/web/src/pages/Solar/index.tsx 固定 connector、flow-node geometry 與 hero layout 的輸出邊界，並以 render tests 驗證 runtime value 更新不重建 static geometry。

## 2. 鎖定 no-regression 行為

- [x] 2.1 交付 Overview and Solar keep static subtree output stable during value-only refresh，並落實 No-regression fallback and KPI behavior：以 fallback / KPI focused tests、spectra analyze、與 spectra validate 驗證 hero、connector、KPI、error semantics 不退化。
