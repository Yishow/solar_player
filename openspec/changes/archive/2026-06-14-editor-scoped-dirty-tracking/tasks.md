## 1. 建立 editor dirty contract

- [x] [P] 1.1 交付 Display editor derives dirty state from scoped operations，並落實 decision 1: operation-scoped dirty tracking：在 apps/web/src/hooks/useDisplayPageConfig.ts 與 apps/web/src/hooks/displayPageDraftSession.ts 建立 scoped dirty marker，並以 hook tests 驗證 field edit、drag、resize 後 dirty state 正確。
- [x] [P] 1.2 交付 Display editor derives dirty state from scoped operations，並落實 decision 2: baseline-aware dirty reconciliation：以 undo、redo、reset、reload、save conflict tests 驗證 baseline 變更後 dirty state 可正確 reconcile。

## 2. 鎖定 save / conflict 行為

- [x] 2.1 交付 Display editor derives dirty state from scoped operations，並落實 decision 3: no-regression save and conflict behavior：在 apps/web/src/pages/DisplayPagesEditor/index.tsx 連接 dirty badge、save、publish、reload 流程，並以 focused interaction tests、spectra analyze、與 spectra validate 驗證既有行為不退化。
