# Management Shell — 全站統一 Canvas 縮放設計

**日期：** 2026-05-23
**狀態：** 已定稿，待 spec review

## 問題背景

目前播放頁與管理頁雖然共用 `AppHeader`，但兩者不在同一種縮放模型內：

- 播放頁把 header、content、footer 一起放進固定 1920×1080 畫布，再由外層統一縮放。
- 管理頁目前只有內容框進入縮放容器，header/footer 停留在未縮放的外層 shell。

結果是：在同一個 viewport 下，管理頁 header 會看起來比播放頁更大。這不是字級設定不同，而是殼層結構不同造成的感知尺寸落差。

## 設計決策

採用 **單一管理畫布殼層**：

- 管理頁全面切換到與播放頁同級的 **whole-page canvas** 模型
- header、route content、footer 一起進入同一張固定基準畫布
- 外層 viewport 只負責計算 scale、置中與可視區
- 各管理 route 保持既有 router 結構，不把縮放邏輯分散到頁面內

此設計優先追求整站視覺比例一致，接受一般管理頁在較小視窗中整體縮小。

## 架構

### 1. ManagementShell 成為 canvas owner

`ManagementShell` 改為管理頁唯一的縮放控制點，負責：

- 建立固定基準 canvas（1920×1080）
- 直接複用 `DisplayCanvas` 已在用的 `computeCanvasLayout()` 邏輯計算整體 scale
- 管理 shell 置中與 letterbox/padding 行為
- 在 canvas 內佈局 header、content slot、footer

調整後不再保留「外層 shell 一套尺寸、內層 frame 再算一次 scale」的雙層縮放責任。

### 1.1 基準尺寸與 slot 高度

新的管理 canvas 明確採用播放頁同一組外框尺寸：

- 畫布總尺寸：`1920 × 1080`
- header slot 高度：`110px`（對應現行 `--header-height`）
- footer slot 高度：`72px`（對應現行 `--footer-height`）
- content slot 高度：`898px`

也就是說，現行 `ManagementFixedLayoutFrame` 的 `1920 × 838` 僅代表舊模型中的內容框高度；切到 whole-page canvas 後，這個 `838` 不再是新的外層基準尺寸。

### 2. Header / footer 跟隨同一張畫布

`AppHeader` 與 `AppFooterNav` 儘量維持原本元件與樣式規則，主要改動是掛載位置：

- 從未縮放的 shell 表面移入管理 canvas
- 與內容區共享同一套基準座標與 scale

這讓播放頁與管理頁的 header 差異回到單純內容差異，而不是殼層縮放模型差異。

### 3. Route content 留在 router outlet

管理頁各 route 仍由現有 router outlet 輸出到 content slot：

- route 元件不直接處理 scale
- route 元件不需要知道自己是否是「固定畫布型頁面」
- shell 統一吸收 viewport 變化與比例換算

這讓縮放規則留在 shell 邊界，不散落到頁面實作。

### 4. `hideChrome` 仍保留，但改為 canvas 內行為

`ManagementShellFrame` 現有 `hideChrome` prop 仍保留，因為 `DisplayPagesEditor` edit mode 與對應測試已依賴它。

新模型下：

- `hideChrome = false`：使用 `110 / 898 / 72` 的 header-content-footer 版面
- `hideChrome = true`：canvas 仍存在，但 header/footer slot 直接收斂為 `0px`，內容區取得完整 `1080px` 高度

也就是說，hideChrome 不會讓管理頁退回舊的未縮放 shell；它只是在同一張 canvas 內切換是否顯示 chrome。

## 元件邊界與責任

| 單元 | 責任 |
| --- | --- |
| `ManagementShell` | 擁有整體 canvas、scale、置中與 slot 佈局 |
| `ManagementShellFrame` | 保留為可直接引用的低階 shell primitive，承接 `hideChrome` 與 slot 佈局 |
| `AppHeader` | 既有 header UI，改為在 canvas 內渲染 |
| `AppFooterNav` | 既有 footer UI，改為在 canvas 內渲染 |
| 管理 route outlet | 將管理頁內容渲染到 content slot |
| content scroll container | 承接管理頁內容捲動，不讓 header/footer 與內容脫鉤 |

`ManagementShell`、`ManagementShellFrame`、`ManagementShellRoute` 三個 export 都保留；其中 `ManagementShellFrame` 成為新的 canonical shell primitive，測試可繼續直接引用它。

`ManagementFixedLayoutFrame` 不再負責管理頁頂層縮放。此 change 會把它收斂為內容區工具，或在沒有剩餘用途時直接移除；無論採哪種落點，都不能再讓它與 `ManagementShellFrame` 同時各算一份頂層 scale。

## Route metadata 遷移

目前 `routeMeta.managementFrame === "fixed-fhd"` 只影響部分管理頁進入固定縮放內容框。新的 whole-page canvas 模型下，這個旗標不再負責 shell 佈局分流。

此次變更的預期是：

- **全部 management routes**（包含 `/brand`、`/display-pages/editor`、既有 fixed-fhd routes）都進入同一套 whole-page canvas shell
- `managementFrame` 從 `routeMeta` 與對應 witness tests 一起移除
- `shellFoundation.test.ts` 等結構測試改為保護「所有 management routes 共享同一 shell 模型」，不再保護「部分 route 用 fixed frame、部分不用」的舊分流

## Runtime 行為

### 成功條件

- 同一 viewport 下，管理頁 header 與播放頁 header 的感知比例一致
- 管理頁整體維持 whole-page canvas 模型
- 各 route 不必自行監聽視窗尺寸或自行補 scale

### 視窗變化

- 視窗尺寸改變時，由 `ManagementShell` 重新計算 scale
- canvas 以固定基準尺寸重新套用 transform
- header、content、footer 一起跟隨更新
- scale 規則跟播放頁一致：**不額外 clamp 到 1**

也就是說，當 viewport 大於 1920×1080 時，管理 shell 允許放大；當 viewport 較小時，則依較短邊比例縮小。這點刻意對齊 `DisplayCanvas` 現有 `computeCanvasLayout()` 的行為，而不是沿用 `computeManagementFixedLayoutScale()` 目前的 `Math.min(..., 1)` 上限。

### 捲動模型

- 捲動責任放在 canvas 內的內容區
- header/footer 保持在畫布結構中的固定位置
- 高內容頁面以內容區滾動為主，不讓外層 viewport 因內容增高而破壞整體比例

## 邊界情況

### 小螢幕 / 窄視窗

- 允許整頁縮小
- 保留明確的內容區捲動容器
- 不為了維持目前後台可讀性而回退成「只縮內容、不縮 header/footer」的模型

### 既有管理頁差異

- 若某些管理頁依賴未縮放外層尺寸，補償優先放在 shell 或內容容器邊界
- 避免把 viewport-specific 修補散到各 route 頁面
- `/brand` 與 `/display-pages/editor` 也一併進入全頁 canvas；它們不是例外路由

## 驗證策略

### 結構保護

新增或更新 layout/source tests，保護以下不變條件：

- 管理頁 header、content、footer 位於同一個縮放畫布內
- 管理 shell 不再保留舊的 split model（外層 header/footer + 內層縮放內容）
- `hideChrome=true` 時仍維持 canvas 結構，只是 content slot 改吃滿 `1080px`
- route witness tests 直接斷言 DOM shell primitives 關係與 route metadata 遷移，不使用 snapshot 當主要保護手段

### Browser 驗證

在相同 viewport 下確認：

- 管理頁與播放頁 header 視覺比例一致
- 管理頁內容仍可捲動與操作
- 視窗改變時整體縮放與互動仍正常

### 測試原則

- 優先保護殼層結構與版面關係
- 避免只靠 magic number 驗單一字級或單一像素值
- 讓之後品牌文案或 header 細節調整時，不容易把縮放錯位帶回來

## 不在此次範圍

- 播放頁 shell 重構
- 額外新增新的管理頁視覺主題
- 為小螢幕提供第二套專用後台版面
- 大規模重寫各管理 route 內部 UI

## 受影響的檔案

- `apps/web/src/layouts/ManagementShell.tsx`
- `apps/web/src/components/ManagementFixedLayoutFrame.tsx`
- `apps/web/src/app/routeMeta.ts`
- `apps/web/src/components/shellFoundation.test.ts`
- `apps/web/src/components/AppHeader.tsx`（僅需確認移入 canvas 後仍相容，預期不做內部樣式重寫）
- `apps/web/src/components/AppFooterNav.tsx`（僅需確認移入 canvas 後仍相容，預期不做內部樣式重寫）
- `apps/web/src/layouts/` 相關測試
- 需要的 browser/layout regression 測試檔
