<!--
Each task description MUST state:
- the behavior or contract being delivered (what is observably true when the
  task is complete), and
- the verification target that proves completion (test, CLI invocation,
  analyzer check, manual assertion, or content review).

File paths are supporting context for locating the work, never the task
itself. "Edit file X" is not a valid task — it is missing both behavior and
verification.
-->

## 1. 滿版單卡與動態側邊欄重構

- [x] 1.1 單一卡片與雙分欄結構重構：修改 apps/web/src/pages/ImageManagement/ImageManagementContent.tsx，將原本的左卡 im-card-library 與右卡 im-card-editor 合併為單一卡片 im-card-full，內部使用 .im-main-content 容器包裝左側網格區與右側側邊欄區。驗證方式：執行 pnpm --filter @solar-display/web test 確保 React 元件能正確渲染，無結構性 runtime 錯誤。
- [x] 1.2 動態側邊欄全域與局部設定模式切換：修改 apps/web/src/pages/ImageManagement/ImageManagementContent.tsx，在右側側邊欄內判斷，當未選取圖片時呈現全域播放治理與統計（包含統計條、隨機播放、播放時間套用、素材健康），當選取圖片時呈現該圖片編輯表單，且頂部提供返回全域設定的按鈕。驗證方式：點選圖片確認側邊欄切換為單圖編輯，點擊「返回全域設定」按鈕確認切回全域資訊。
- [x] 1.3 側邊欄樣式與 FHD 版面適配：修改 apps/web/src/pages/ImageManagement/imageManagement.css，設定 .im-card-full 滿版座標與寬高（1820px × 740px），並新增左右分欄的 Flex 排版，使左側縮圖區與右側側邊欄高度拉滿。驗證方式：在 FHD 播放機（1920×1080）畫布下目測縮圖網格高度有獲得完全釋放，且沒有任何垂直滾動條溢出大卡片。
- [x] 1.4 返回機制與交互保留驗證：確認當點擊圖片選取與「返回全域設定」時，原有的儲存、設為封面與刪除等操作邏輯依然正常運作。驗證方式：人工點擊儲存與設為封面，並執行 pnpm --filter @solar-display/server test 確保無 regression。
- [x] 1.5 整體整合測試通過：執行 pnpm --filter @solar-display/web test 驗證所有前端測試順利 Pass。
