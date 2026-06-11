## 1. 建立 period cache 與 refresh boundary

- [x] [P] 1.1 交付 Sustainability reuses a warm payload for the selected period，並落實 Per-period warm cache：在 apps/web/src/hooks/useSustainabilityStoryRuntime.ts 建立 period-scoped warm cache，並以 period-switch tests 驗證 switch back 無 cold flash。
- [x] [P] 1.2 交付 Sustainability keeps selected-period content stable during refresh，並落實 Selected-period refresh boundary：在 apps/web/src/pages/Sustainability/index.tsx 收斂 selectedPeriod 綁定的 highlight / stat / household-equivalent content，並以 refresh tests 驗證 visible content 穩定。

## 2. 鎖定 period 與 fallback 語意

- [x] 2.1 交付 Sustainability keeps selected-period content stable during refresh，並落實 No-regression visible period semantics：以 fallback / selected-period focused tests、spectra analyze、與 spectra validate 驗證 button state、visible stat output、error semantics 不退化。
