## Context

既有 repo 已有 image uploads、ImageManagement、brand assets 與 page media asset references，但它們分別服務不同管理面與資料流，沒有一個明確的 display asset catalog 來描述資產屬性、用途範圍與引用關係。隨著 shell decorations 與 page freeform objects 需要引用上傳素材與 icon 類型，單靠既有 image management 已不足以表示「這是一個背景圖、這是一個裝飾物件、這是一個 ICON，且可供哪些 surface 使用」。

這個 change 的責任是建立一個分類式資產庫管理能力，以及讓 managed asset reference contract 擴大到 shell/page objects。

## Goals / Non-Goals

**Goals:**

- 建立 dedicated asset library management surface，至少提供 `背景`、`物件`、`ICON` 分類分頁。
- 讓新上傳資產可在進入 catalog 時直接完成 category 與 usage-scope 指派。
- 為 managed assets 建立 category 與 usage-scope metadata。
- 讓 page media、shell decorations、page freeform objects 共用同一套 asset reference 與 missing-asset 診斷。
- 新增引用檢查與刪除保護，避免破壞正在使用中的 live/draft config。

**Non-Goals:**

- 不在這個 change 內提供向量 icon 編輯器。
- 不在這個 change 內處理文字物件資產。
- 不在這個 change 內改寫 image playlist governance 本身的播放排序邏輯。
- 不在這個 change 內重做 brand assets 全部 UI。

## Decisions

### Model one managed asset catalog with category and usage-scope metadata

managed assets SHALL 進入同一個 display asset catalog，並以 `category` 與 `usageScope` 描述用途，而不是由不同 surface 各自附會。`category` 第一波至少包含 `background`、`object`、`icon`；`usageScope` 至少包含 `shell-only`、`page-only`、`both`。

替代方案是用檔名規則或資料夾命名來推斷用途。那無法穩定支援管理面篩選與刪除保護。

### Provide a dedicated asset library management surface separate from image playlist governance

asset library management SHALL 使用獨立管理面，而不是把分類資產庫塞進既有 ImageManagement 的 playlist workflow。ImageManagement 主要處理 slideshow/playlist 治理；asset library 管理的是跨 shell/page 的通用資產目錄，兩者意圖不同。

替代方案是把所有功能都放進 ImageManagement。那會讓 playlist authoring 與 global asset catalog 混成一頁。

### Reuse managed asset references across page media, shell decorations, and page objects

shell decorations 與 page freeform objects 的 asset-backed payload SHALL 使用與 page media 一致的 managed asset reference 思路，讓 runtime、editor、asset health、delete guards 可以共用 resolver 與 diagnostics。

替代方案是為 shell/page objects 再做一套 asset reference。那會讓 asset health 與 delete guards 必須維護雙軌邏輯。

### Assign category and usage scope at upload time

資產上傳流程 SHALL 在 ingest 當下要求或提供明確的 category 與 usageScope 指派，而不是先以無分類資產落地再手動補救。這能讓 asset picker 在第一時間就知道哪些資產可供 shell/page 使用，也避免 catalog 累積大量未分類素材。

替代方案是先全部進同一個 uploads bucket 再靠後續整理。那會讓 picker 和 delete guard 一開始就面對低品質 metadata。

### Prevent destructive deletes when assets are still referenced

管理面刪除資產前 SHALL 檢查 shell decoration config、display page draft/live config 與其他 relevant usage records，對仍被引用的資產提供 usage reporting 與 delete guard。第一波不應允許靜默刪除後再等 runtime fallback 才暴露破壞。

替代方案是允許刪除並依賴 runtime fallback。那雖然簡單，但對管理者來說風險太高。

## Implementation Contract

**Behavior**

- 管理面提供 dedicated asset library page，具備 `背景`、`物件`、`ICON` 分頁與搜尋/篩選能力。
- 每個 managed asset 可保存 category、usageScope、display name 與 usage summary。
- 新上傳資產可在同一個管理流程中完成 category 與 usageScope 指派。
- page media、shell decorations 與 page freeform objects 可共用同一種 managed asset reference 與 missing-asset diagnostics。
- 刪除資產前若仍被 live 或 draft shell/page config 引用，管理面會明確阻擋或要求處理引用，而不是靜默成功。

**Interface / data shape**

- asset catalog API 至少回傳：asset id、filename、category、usageScope、dimensions 或 mime summary、usage references。
- upload 或 metadata update API 至少接受 category 與 usageScope，且不得讓資產以無分類狀態靜默進 catalog。
- asset reference payload 與既有 page media binding 保持相容，讓 shell/page object assets 可使用同一 resolver family。
- management UI 至少支援 category tabs、search/filter、usage summary、delete action 與 delete blocker feedback。

**Failure modes**

- 無法解析的引用資產仍需回報 missing-asset findings，不能只在管理頁隱藏。
- delete guard 若發現 live 或 draft references， SHALL 阻擋刪除並列出引用位置。
- metadata 更新失敗時， SHALL 保留既有資產記錄，不可造成分類資訊半更新。
- upload 後若 category 或 usageScope 指派失敗， SHALL 回報錯誤並避免留下半初始化 catalog entry。

**Acceptance criteria**

- server tests 可驗證 asset catalog metadata、usage reporting、delete guards 與 cross-surface references。
- web tests 可驗證 category tabs、search/filter、usage summaries 與 blocked delete feedback。
- `pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test`、`pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json` 通過。
- `spectra validate --strict --changes add-display-asset-library-management` 通過。

**Scope boundaries**

- In scope: asset catalog metadata、management page、cross-surface asset references、delete guards。
- Out of scope: icon vector editor、文字物件資產、playlist playback sequencing 重寫。

## Risks / Trade-offs

- [風險] asset catalog 與 playlist/image management 職責重疊，UI 可能讓人困惑。 → Mitigation：將 asset library 明確定義為跨 shell/page 的通用資產目錄，而不是 slideshow playlist 編輯頁。
- [風險] cross-surface reference 掃描會增加 delete 流程成本。 → Mitigation：先用 deterministic usage reporting，避免不必要的 runtime 深度解析。
- [風險] 若 category 或 usageScope 過於僵硬，後續會擴充不易。 → Mitigation：第一波先鎖三個 category 與三種 scope，但保留 shared enum 擴充點。
