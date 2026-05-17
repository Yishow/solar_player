# Progress

## 2026-05-18

- 盤點 5 個 playback/display routes 與 management routes。
- 確認 router 在 `apps/web/src/app/router.tsx`，group metadata 在 `apps/web/src/app/routeMeta.ts`。
- 盤點 5 個 display page 的 layout 型態：
  - overview: hero + KPI row
  - solar: hero + flow nodes/connectors + KPI row
  - factory-circuit: node/connector/load panel
  - images: main media + info + thumb grid
  - sustainability: hero + KPI/stat rows
- 形成初步方案：
  - 獨立 display maintenance 後台入口
  - shared editor shell + page-specific editors
  - runtime pages 改讀 persisted config
- 依使用者補充需求，將方案收斂成「管理後台內的頁面畫布式 editor」，不是純表單，也不是直接把 editor 常駐到正式播放頁。
- 建立 Spectra change `add-display-pages-maintenance-editor`。
- 完成 proposal / design / specs / tasks 起草，並將範圍改為：
  - 五個 display 頁全部納入同一份規畫
  - 但 apply tasks 明確拆成 foundation → overview → solar → factory-circuit → images → sustainability 的 phased rollout
