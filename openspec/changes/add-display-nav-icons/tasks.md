## 1. Route metadata 帶 icon

- [x] 1.1 在 apps/web/src/app/routeMeta.ts 為 5 條 playback route 各定義一個導覽圖示（優先重用既有 display 圖示資源／resolver，缺則補與 chrome 一致的最小 inline glyph），並讓 `RouteMeta` 帶該 icon 欄位。
- [x] 1.2 在 apps/web/src/app/playbackRouteMeta.ts 讓 `PlaybackFooterEntry` 帶上對應 route icon，使 playback footer 取得 icon。

## 2. Footer 渲染 icon（spec：Playback footer navigation renders a route icon beside each label）

- [x] 2.1 在 apps/web/src/components/AppFooterNav.icons.test.tsx 先寫失敗測試：playback 模式每個導覽項目同時渲染 route icon 與既有文字 label；route 路徑、順序、數量、label 文字不變。
- [x] 2.2 在 apps/web/src/components/AppFooterNav.tsx 的 playback 模式於文字 label 前渲染對應 icon，使測試通過；active 底線、間距、route 連結維持不變。滿足 spec requirement「Playback footer navigation renders a route icon beside each label」。

## 3. Management 模式不受影響（spec：Management footer navigation is unaffected by route icons）

- [x] 3.1 在 AppFooterNav.icons.test.tsx 補測試：management 模式 footer 不渲染 route icon、項目維持原樣；確認 management 渲染路徑未加 icon。滿足 spec requirement「Management footer navigation is unaffected by route icons」。

## 4. 驗收

- [x] 4.1 執行 `pnpm --filter @solar-display/web test` 與 `pnpm run build`，確認全綠、exit 0；playback 導覽呈現圖示＋文字、route 結構與標籤未變。
