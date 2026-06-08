## 1. 樣式修復

- [x] 1.1 編輯 `apps/web/src/styles/management.css`，在 `.mgmt-interactive-card` 後方加入對 `.settings-card.mgmt-interactive-card` 結合類別的 `position: absolute` 定義，以防相對定位覆蓋。

## 2. 驗證

- [x] 2.1 執行 `pnpm run build` 與測試，確保修復不會產生任何 regression。
