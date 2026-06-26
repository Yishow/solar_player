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

## 1. 圖片管理佈局密度的優化與整併

- [x] 1.1 移出並精簡 Handoff 區塊：修改 apps/web/src/pages/ImageManagement/ImageManagementContent.tsx，移除原有的 .im-handoff 區塊，並於卡片標題列 .settings-card__title 右側以 inline 方式加入前往展示頁編輯器的 Link 連結。驗證方式：確認畫面上原本巨大的 .im-handoff 提示框已消失，標題右側有可用的小連結，點擊可成功跳轉。
- [x] 1.2 合併播放設定控制項為單行：修改 apps/web/src/pages/ImageManagement/ImageManagementContent.tsx 及其 CSS 檔案 apps/web/src/pages/ImageManagement/imageManagement.css，將「隨機播放 (Switch)」與「全部播放時間 (Set All Duration)」這兩個控制項排列在同一行（使用 Flex/Grid 左右並排），減少垂直空間。驗證方式：開啟網頁目測兩個控制項是否成功並排，且 Switch 切換與套用時間功能仍正常運作。
- [x] 1.3 移除庫內大上傳區 .im-uploader：修改 apps/web/src/pages/ImageManagement/ImageManagementContent.tsx，移除 .im-uploader 區塊，以右上角的「上傳圖片」按鈕作為唯一上傳入口。驗證方式：確認卡片內大虛線拖曳框已消失，右上角按鈕仍可正常點擊並選取檔案上傳。
- [x] 1.4 精簡與緊湊化統計數據：修改 apps/web/src/pages/ImageManagement/ImageManagementContent.tsx，將原本的 .im-stats 區塊改用共用的 .mgmt-stat-strip 與 .mgmt-stat 樣式並調整 margin-bottom 減少高度。驗證方式：確認統計數字依然正確顯示，且樣式對齊系統其他的統計列（如 /settings/circuits）。
- [x] 1.5 驗證圖片縮圖顯示高度與測試通過：執行 pnpm --filter @solar-display/web test 確保無 regression，並驗證圖片縮圖區 .im-grid-wrap 獲得高度釋放（至少 550px 以上），可容納多排縮圖。
