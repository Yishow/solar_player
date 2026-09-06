# Design｜集中草稿保存、影響檢查與安全發布

## Context

regionTree包含save/publish動作，publishingStatus顯示另一組validation/fallback；existing hooks與publishing service已有版本/草稿機制，本change要求沿用並補足整體流程，不從UI聲稱裝置收到即等於套用。

## Goals / Non-Goals

**In scope**：「檢查並發布」導向一個集中抽屜：先保存確定草稿、建立精確版本preflight、顯示差異與影響、定位修復，使用者確認後才發布；server於寫入前再次驗證版本与阻擋條件。

**Out of scope**：不自動發布所有頁、不新增分散式全站交易、不透過一次page save包辦broker/source/shell變更、不因装置online就宣稱applied、不跳過人工FHD acceptance。

## Dependencies

U2 / add-guided-data-source-onboarding、U3 / refactor-display-editor-workspace、U4 / add-unsaved-binding-preview

所有新介面都必須在 shared 型別、server 驗證、呼叫端與測試之間一致。未知現場單位、採樣頻率與既有來源身分不可靠名稱猜測。

## Decisions

### D1. 狀態機

editing-dirty→saving-draft→saved→checking→review-ready/blocked→publishing→server-published。save/validate失敗回可編輯狀態且保留draft。點入口不直接publish；只有review-ready並明確確認才進publishing。

### D2. 版本契約

preflight包含pageId、draftVersion/configFingerprint、schema/catalog/source-definition/shared-shell/asset revisions、diff、impact、findings及短期token。建議token有效120秒；live數值每更新不讓token永遠失效，但publish前重新計算freshness/readiness。

### D3. 防TOCTOU

publish request附expectedDraftVersion與preflight token；server在同一受控寫入流程檢查版本及最新blocking validation，任一設定revision改變即409/needs-recheck。cannot trust browser checklist。

### D4. 驗證與修復

缺asset、invalid binding、unit mismatch、ownership conflict屬blocker；stale/partial資料依既有fallback policy與卡片需求分warning/blocker。每個finding有中文message、page/itemId、field、修正action與technical code（details）。點修正定位到item，修改後舊preflight失效。

### D5. 共享影響

使用U2 source impact能力列draft/live/derived引用；只顯示授權範圍，不能讀的範圍標unknown而不是0。共用header/footer与broker/source有各自明確套用流程，review page不能假裝它們都未生效。

### D6. 裝置狀態

server-published之後只有實際per-page/per-version裝置回報可顯示applied。現有runtime無此回報時顯示「伺服器已發布；裝置套用狀態未知」，不可用socket連上/online/送出event推論。離線装置保留last-ack/time，頁面成功發布不倒退成假失敗。

### D7. 復原

發布失敗保持前一live版本，允許重試同一有效操作id避免重複。若產品已有正式版回復能力就明確review後套用；不自動重設全部頁面。

## API / Data / State Contracts

管理端新增preflight read/review契約與帶expectedDraftVersion的publish；回傳serverPublishedVersion、perDeviceApplicationState(applied/pending/offline/unknown)及proof來源。既有save與publish endpoints維持相容，舊client不能繞過server必要驗證。

錯誤回應保留既有管理／播放權限邊界；新增錯誤提供穩定 code、可理解訊息與可定位的欄位或 item。缺資料用 null＋品質，不以空字串、NaN 或 0 掩蓋。未識別的 scope、meter、page 或 item 不自動改成 CL。

## Migration and Rollout

先server preflight/version tests，再重組publish UI；舊路徑亦須相同server validation。UI收斂後才移除重複的發布入口。回退UI不回退server版本與授權保護。

改動採 additive 相容策略；migration 編號與既有型別細節於 apply 對照最新 main，不能依文件預占流水號。任何重算須以副本 dry-run 和差異報告先驗證，正式資料套用另行授權。

## Risks / Trade-offs

review與publish間的資料變更、共享asset影響、dirty local config尚未送server及裝置狀態過度樂觀最危險。將proof缺失顯示unknown，是誠實狀態，不是錯誤。

## Verification Strategy

同目錄 test-plan 是 requirement-to-scenario 驗證對照；具體觀測條件以 specs 的 WHEN / THEN 為準。先寫失敗測試，再實作，再跑 regression。不得只修改 test expectation 讓既有錯誤數字通過。

## Source of Progress and Closeout

只有同目錄 tasks.md 的 checkbox 表示本 change 的實作進度。本包全部未勾選；格式檢查或公式 fixture 通過不代表應用程式測試通過。待實作後保存實際命令輸出、review findings 與必要 FHD witness；使用者驗收及 archive/commit 規則依 repo 現行 workflow。

## V2 Site-Setup Contract

Publish preflight SHALL identify site-profile references and whether source changes have already become active. U6 profile activation SHALL never be mislabeled as page publication, and an unpublished page draft SHALL not be claimed to protect live profile-following consumers from a shared accounting change. Unknown impacts and conflicting versions SHALL require resolution.

規劃中的來源定義唯一放在E6 profile；操作入口由U6承接。詳見 `add-site-energy-accounting-profiles` 與 `add-guided-site-energy-setup` change。新增需求：U5-R7。
