# Design｜重整展示編輯工作台、常駐工具列與情境面板

## Context

DisplayPagesEditor/index 使用220px_1fr_260px固定grid；regionTree左側有regions/objects/actions，actions才顯示保存和發布；右側有inspector/data/source/health/publish。現有undo/redo與shared schema應沿用。

## Goals / Non-Goals

**In scope**：改成清楚頁面選擇＋常駐工具列＋可收合/調寬面板；選到什麼就顯示相關內容、資料與外觀。素材picker在目前context內開啟，共用頁首頁尾明確提示影響範圍。

**Out of scope**：不是任意自由設計器、不增加所有像素可拖、不重寫各頁模板、不刪除原有專業能力、不假裝共享殼層與單頁草稿是同一交易。

## Dependencies

無；可以先開始。

所有新介面都必須在 shared 型別、server 驗證、呼叫端與測試之間一致。未知現場單位、採樣頻率與既有來源身分不可靠名稱猜測。

## Decisions

### D1. 資訊分層

頁面picker顯示page label與縮圖/草稿狀態；資產庫、共用頁首/頁尾是工具不是頁面tab。保留region tree/freeform能力，但不要求使用者先分辨內部model才能選物件。

### D2. 常駐頂列

目前page/context、未儲存狀態、undo/redo、儲存草稿、預覽、檢查並發布常駐。U3先整合既有handlers；U5後續提供統一檢查/發布流程，不能先假裝已做版本鎖定。

### D3. 情境inspector

數值物件顯示內容/資料/格式，圖片顯示素材/裁切，固定模板區域顯示可修改能力與不能拖曳原因。技術id移至details；幾何/特殊效果可展開。完全移除「資料」tab會造成可發現性問題，因此context不支援時明確說明。

### D4. 畫布與尺寸

保持16:9 authoring coordinate及zoom換算，不因panel resize變更物件geometry。建議left240/right320可調，狹窄視窗先收左側，再用inspector drawer；中央保留fit-to-view。所有拖曳resize有鍵盤/數值替代。

### D5. 素材與共用內容

asset picker側邊打開，選完返回原page/item/zoom，預覽不中斷；殼層工作區顯示「影響使用此共用頁首/頁尾的頁面」，保存狀態獨立。共用素材替换不誤導為只影響當前item。

### D6. 草稿與錯誤

切page/workspace保留per-page draft session或確認捨棄，不任意localStorage寫敏感內容。保存失敗保留dirty。remote config版本變更提示保留編輯/比較/重載，不自動覆蓋。

## API / Data / State Contracts

新toolbar/sidepanels僅接既有useDisplayPageConfig、selected stable item id與capability model；不擴任意schema。資產選擇使用selection transaction確認後才寫該draft path。

錯誤回應保留既有管理／播放權限邊界；新增錯誤提供穩定 code、可理解訊息與可定位的欄位或 item。缺資料用 null＋品質，不以空字串、NaN 或 0 掩蓋。未識別的 scope、meter、page 或 item 不自動改成 CL。

## Migration and Rollout

先layout及toolbar component tests，再移動既有actions；保留原hook與route。測試頁型逐一覆蓋，不寫死只有五個page instance。回退layout不更動保存的page config。

改動採 additive 相容策略；migration 編號與既有型別細節於 apply 對照最新 main，不能依文件預占流水號。任何重算須以副本 dry-run 和差異報告先驗證，正式資料套用另行授權。

## Risks / Trade-offs

畫布座標受panel/zoom影響或picker返回失去選取會惡化效率，列為強制回歸。新工作台不能讓播放頁退化為settings-like工具面板。

## Verification Strategy

同目錄 test-plan 是 requirement-to-scenario 驗證對照；具體觀測條件以 specs 的 WHEN / THEN 為準。先寫失敗測試，再實作，再跑 regression。不得只修改 test expectation 讓既有錯誤數字通過。

## Source of Progress and Closeout

只有同目錄 tasks.md 的 checkbox 表示本 change 的實作進度。本包全部未勾選；格式檢查或公式 fixture 通過不代表應用程式測試通過。待實作後保存實際命令輸出、review findings 與必要 FHD witness；使用者驗收及 archive/commit 規則依 repo 現行 workflow。

## V2 Site-Setup Contract

The workspace SHALL expose supported object-context tasks for data, image, text and display settings, plus the common publish action. Site energy source editing SHALL open the shared U6 setup and preserve page draft/selection. It SHALL not expose duplicate profile-owned numerator/denominator inputs in generic inspector fields.

規劃中的來源定義唯一放在E6 profile；操作入口由U6承接。詳見 `add-site-energy-accounting-profiles` 與 `add-guided-site-energy-setup` change。新增需求：U3-R7。
