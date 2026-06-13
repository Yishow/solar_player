## 1. 建立 Image Management targeted refresh 邊界

- [x] [P] 1.1 交付 Image Management keeps the selected baseline while mutation diagnostics refresh，並落實 Selected-entity refresh first：在 apps/web/src/pages/ImageManagement/index.tsx 收斂 selected image、selected playlist row、library baseline 的 mutation follow-up path，並以 save / upload / set-cover / playlist-governance tests 驗證無 full cold bootstrap。
- [x] [P] 1.2 交付 Image Management keeps the selected baseline while mutation diagnostics refresh，並落實 Background diagnostics stay outside the editable lane：在 apps/web/src/pages/ImageManagement/loadModel.ts 與頁面診斷 lane 測試中固定 asset health / asset references refresh 邊界，驗證 diagnostics failure 不清空 baseline。

## 2. 鎖定 selection / fallback 行為

- [x] 2.1 交付 Image Management keeps the selected baseline while mutation diagnostics refresh，並落實 No-regression selection and fallback behavior：以 selection / fallback focused tests、spectra analyze、與 spectra validate 驗證可見行為等價。
