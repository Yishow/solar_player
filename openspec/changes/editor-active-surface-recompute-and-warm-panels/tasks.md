## 1. 建立 active-surface recompute 邊界

- [x] [P] 1.1 交付 Display editor recomputes only active surfaces，並落實 decision 1: active surface graph only：在 apps/web/src/pages/DisplayPagesEditor/index.tsx 固定 active workspace / page / selection graph，並以 canvas、inspector tests 驗證非 active surface 不重算完整 graph。
- [x] [P] 1.2 交付 Display editor support panels reuse warm state and isolate failures，並落實 decision 2: warm support panels first：在 apps/web/src/pages/DisplayPagesEditor/index.tsx 與 apps/web/src/pages/DisplayPagesEditor/publishing.ts 固定 asset、publishing、health panel 的 warm-data reuse，並以 panel tests 驗證 tab switch 不清空 draft。

## 2. 鎖定 selection / panel 行為

- [x] 2.1 交付 Display editor support panels reuse warm state and isolate failures，並落實 decision 3: no-regression selection and panel behavior：以 selection、preview、publish、health、asset panel focused tests、spectra analyze、與 spectra validate 驗證 failure isolation 不退化。
