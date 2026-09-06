# Design｜未儲存綁定即時預覽、資料挑選與來源到展示接續

## Context

displayDataPreviewService 的readPreviewRequest只接受context/stage，binding plan由readStageConfig取得；dataInspector明確提示未儲存時需先存。既有compileEffectiveBindingPlan與catalog授權應共用，不能在browser另外繞過。

## Goals / Non-Goals

**In scope**：新增授權的唯讀 ephemeral preview，接受當前草稿binding/config與preview context，在記憶體驗證並套用相同compiler/resolver；資料picker顯示中文名、scope、單位、值、freshness與相容原因，並承接U2的source identity。

**Out of scope**：不儲存、不發布、不寫live metric、不更改裝置scope、不允許任意expression/script；不因預覽而降低既有binding constraints，也不讓raw counter塞入period-energy欄位。

## Dependencies

E3 / repair-consumption-history-projections、U2 / add-guided-data-source-onboarding、U3 / refactor-display-editor-workspace

所有新介面都必須在 shared 型別、server 驗證、呼叫端與測試之間一致。未知現場單位、採樣頻率與既有來源身分不可靠名稱猜測。

## Decisions

### D1. 請求契約

新增 POST /api/display-pages/:pageId/data-preview/ephemeral，body:{baseDraftVersion,clientEditRevision,context,draftConfig}。只允許既有page schema內的綁定/format/config，不接受自定JS或URL執行；body上限256KiB、受管理授權與請求頻率限制。

### D2. 同一解析器

server以page template schema、effective metric catalog、scope permissions及compileEffectiveBindingPlan驗證unsaved config，再讀E3 canonical period metrics/既有readings。raw register與period-energy分開value semantics，不可僅看都是number就讓綁定通過。

### D3. 明確state

response回clientEditRevision、resolvedContext、catalogRevision、configFingerprint、period window、actual value、freshness、quality、issues及previewOnly=true。binding錯誤回itemId和可理解原因。baseDraftVersion過舊可409並保留本地草稿，避免以舊schema製造錯誤预覽。

### D4. 防競態

UI debounce 300ms；新context/綁定變更立即顯示pending，不保留舊值假裝新結果；AbortController與revision檢查雙重丟棄舊回應。UI顯示「未儲存草稿預覽」，切到正式比較時label不同。

### D5. 共用preview context

選site/group/device只改变workspace preview context，各元件明確顯示inherit或fixed。固定CL的卡片不因preview選KN就被偷偷改binding。受權限支持的預覽不發裝置憑證、不模擬裝置上線。

### D6. 資料挑選與handoff

MetricPicker優先顯示compatible options但提供查看不可用原因；顯示中文label、scope、measurement kind、unit、latest value、age。U2帶入source identity後列相容page/item；使用者選擇才寫draft，不自动發布。維持origin資訊可返回DataHub並保留filter與草稿。

### D7. 資料與素材分清

「資料」只控制metric binding，「素材」只控制asset。預覽失敗或缺baseline提供定位來源/基準問題的動作，不能自動改成測試值；sample-only必須加明顯標記且不能進正式計算。

## API / Data / State Contracts

新增ephemeral response與request TS型別，legacy saved-stage preview保持不變。cache鍵含授權範圍、page/template、context、config fingerprint、catalog/source definition revisions；有界容量64，讀值不無期限cache。無需從datahub攜帶密碼/原始payload。

錯誤回應保留既有管理／播放權限邊界；新增錯誤提供穩定 code、可理解訊息與可定位的欄位或 item。缺資料用 null＋品質，不以空字串、NaN 或 0 掩蓋。未識別的 scope、meter、page 或 item 不自動改成 CL。

## Migration and Rollout

先以API測試證明DB寫入數與MQTTpublish數為0，再加入MetricPicker與client revision handling。最後打通U2→editor→DataHub返回；未完成U4前U3保持「已儲存草稿預覽」標記。

改動採 additive 相容策略；migration 編號與既有型別細節於 apply 對照最新 main，不能依文件預占流水號。任何重算須以副本 dry-run 和差異報告先驗證，正式資料套用另行授權。

## Risks / Trade-offs

最危險的是預覽走到write path、不同context快取串廠及舊response覆蓋新綁定。列為阻擋缺陷；新自訂source不一定已在effective catalog，需顯示不相容而非強行綁定。

## Verification Strategy

同目錄 test-plan 是 requirement-to-scenario 驗證對照；具體觀測條件以 specs 的 WHEN / THEN 為準。先寫失敗測試，再實作，再跑 regression。不得只修改 test expectation 讓既有錯誤數字通過。

## Source of Progress and Closeout

只有同目錄 tasks.md 的 checkbox 表示本 change 的實作進度。本包全部未勾選；格式檢查或公式 fixture 通過不代表應用程式測試通過。待實作後保存實際命令輸出、review findings 與必要 FHD witness；使用者驗收及 archive/commit 規則依 repo 現行 workflow。

## V2 Site-Setup Contract

Energy-related data selection and unsaved page preview SHALL resolve E6 profile metrics or stable site/department identities for standard flows. When the editor launches U6, the page draft, selected item, preview context and return action SHALL remain. The editor SHALL not store raw main/submeter membership as a second denominator definition.

來源身分/讀值由E1及來源registry保存；總量/部門/比較基準由E6 profile唯一保存；操作入口由U6承接。詳見 `add-site-energy-accounting-profiles` 與 `add-guided-site-energy-setup` change。新增需求：U4-R8。
