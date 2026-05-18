繼續完成 `add-display-page-asset-governance` 剩餘 5 個 tasks。

工作目錄：/Users/yishow/prj/solar_player/

⚠️ 絕對不可修改 AGENTS.md 或 CLAUDE.md。不可加入 <claude-mem-context> 或 <codex-mem-context> 區塊。如發現 AGENTS.md 被修改，立即 git checkout AGENTS.md。

**已完成：Task 1.1**（managed asset reference 綁定與解析，已 commit）

**待完成 Tasks：**

**Task 1.2:** Protect managed asset references from silent breakage
- 新增 server tests：當 asset 被刪除或無法解析時，management API 回傳 missing/unresolved findings
- 可新增 GET /api/display-pages/:pageId/asset-health 或在現有 route 中整合
- 測試：刪除一個被引用的 asset → API 回傳 unhealthy finding

**Task 2.1:** Provide per-binding media placement controls
- Shared types：在 DisplayPageMediaBinding 加入 focal point (focusX, focusY)、fit behavior (fitMode: "contain" | "cover")、alignment (alignX, alignY)
- Editor：在 DisplayPagesEditor 中可編輯這些 placement controls
- Runtime：playback 頁使用這些 placement 設定渲染圖片
- 驗證：web test 或 manual preview 至少一個 hero 和一個 stage image

**Task 2.2:** Keep media placement controls within safe bounds
- Validation：focusX/focusY 必須在 0-1 之間，fitMode 必須是 "contain" 或 "cover"，alignX/alignY 必須是有效數字
- Server API 拒絕或正規化無效值
- 測試：提交無效 placement payload → 回傳 400 或正規化後的值

**Task 3.1:** Report asset health for display page references
- Server-side health computation：掃描所有 display page 的 media bindings，檢查每個 assetId 是否存在於 image_assets table 且檔案存在於 uploads/images/
- 回傳 affected pages 和 reasons（missing-asset、missing-file）
- 測試：建立一個引用不存在的 asset → health API 回傳 unhealthy

**Task 3.2:** Show asset health reporting in DisplayPagesEditor and ImageManagement
- Web UI：在 DisplayPagesEditor 和 ImageManagement 顯示 asset health findings
- 測試：web tests for rendered status states（healthy/unhealthy 狀態的 UI 顯示）

**現有程式碼狀態：**
- displayPageAssetService.ts 已有：normalizeDisplayPageRegionsForStorage、resolveDisplayPageRegions、collectDisplayPageAssetFindings
- displayPagePublishingService.ts 已整合 asset findings 到 validation
- shared types 已有：DisplayPageMediaBinding、DisplayPageAssetFinding、isDisplayPageMediaBinding
- routes/display-pages.ts 已有 resolveEnvelope 包裝

**Constraints：**
- 不修改 AGENTS.md、CLAUDE.md、deploy/、package.json、lockfile
- 不引入新依賴
- 測試失敗不可用 .skip 或 disabled
- 所有 .ts 檔案不得超過 400 行

**執行步驟：**
1. 逐 task 實作（1.2 → 2.1 → 2.2 → 3.1 → 3.2）
2. 每個 task 完成後：code review、fix bugs、git commit（Traditional Chinese）
3. 確認 AGENTS.md 未變更
4. 最終驗證：
   - pnpm --filter @solar-display/server exec tsx --test src/routes/display-pages.test.ts src/routes/display-pages-asset-governance.test.ts（exit 0）
   - pnpm --filter @solar-display/web test（exit 0）
   - pnpm run build（exit 0）
5. 更新 tasks.md 所有 checkbox 為 - [x]
6. 最終 summary
