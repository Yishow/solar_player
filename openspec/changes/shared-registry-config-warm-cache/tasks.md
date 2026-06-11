## 1. 建立 shared cache contract

- [x] [P] 1.1 交付 Registry and live config consumers reuse shared warm cache，並落實 Shared registry snapshot reuse：在 apps/web/src/hooks/useDisplayPageRegistry.ts 建立 shared registry pending / settled snapshot contract，並以 hook tests 驗證無 duplicate blocking read。
- [x] [P] 1.2 交付 Registry and live config consumers reuse shared warm cache，並落實 Shared live config envelope reuse：在 apps/web/src/hooks/useDisplayPageConfig.ts 與 apps/web/src/pages/shared/displayPageRouteHost.tsx 收斂 warm config envelope reuse，並以 route-host tests 驗證首屏可先用 warm envelope 顯示。

## 2. 鎖定 no-regression refresh 邊界

- [x] 2.1 交付 Shared cache reuse preserves fallback and refresh semantics，並落實 No-regression cache invalidation boundary：以 focused refresh / fallback tests 驗證 force refresh、display sync、error、fallback 行為不退化，並以 draft-stage tests 驗證 live cache 不污染 draft baseline、dirty、save、conflict semantics，再用 spectra analyze 與 spectra validate 固定 contract。
