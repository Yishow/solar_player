# Findings

## 2026-05-18

### 現有 playback/display routes
- `/overview`
- `/solar`
- `/factory-circuit`
- `/images`
- `/sustainability`

來源：
- `apps/web/src/app/router.tsx`
- `apps/web/src/app/routeMeta.ts`

### 現有 management routes
- `/trends`
- `/brand`
- `/settings/playback`
- `/settings/images`
- `/settings/mqtt`
- `/settings/circuits`
- `/history`
- `/offline`
- `/slideshow-preview`
- `/device-status`

### 各頁 layout 型態差異

#### Overview
- hero 容器 + title + leaf/gold decoration + 5 張 KPI cards
- 目前最適合抽成：hero settings、KPI row settings、copy settings、asset settings

#### Solar
- title + hero + 4 個 flow nodes + 3 條 connectors + KPI row
- 目前最適合抽成：hero settings、flow node settings、connector settings、KPI row、asset bindings

#### Factory Circuit
- title/copy/status + 3 個 node + 2 條 connectors + load panel / 6 rows
- page-specific 結構較強，不適合硬套 generic hero editor

#### Images
- title/copy + main media frame + info panel + thumb grid + arrows
- 明顯需要 page-specific media gallery editor

#### Sustainability
- title/copy + large hero + 6 張底部數據卡（3 KPI + 3 stat）+ highlight rail
- 可與 overview/solar 共用 hero/KPI row 類 editor，但仍需支援 highlight rail

### 現有後台頁模式
- `BrandAssets` 走 profile + asset 維護
- `ImageManagement` 走 library + editor panel
- 兩者都比 system settings 更接近未來 display page editor 的交互模型

### 推薦資訊架構
- 建立獨立「Display Pages」或「Display Content」入口
- 不與 `settings/playback`、`settings/mqtt`、`settings/circuits` 混在同一分類語意
- 採單一 editor shell + page tabs/sidebar，頁面內再做 page-specific inspector panels

### 已確認的交互方向
- 不是純表單式後台
- 也不是在正式 display route 常駐 editor
- 採 management shell 內的獨立 editor route
- editor route 內支援頁面畫布、`E` 鍵切換 edit mode、區塊選取與 inspector
- 五頁全部納入同一份規畫，但 apply 必須分 phase 逐頁完成
