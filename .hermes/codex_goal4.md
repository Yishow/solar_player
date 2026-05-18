嚴格按照以下三個 Spectra changes 完成頁面內容能力：
1. `add-display-monitoring-story-semantic-models`
2. `add-images-playlist-editor`
3. `add-sustainability-period-storytelling`

**工作目錄：** /Users/yishow/prj/solar_player/

⚠️ 重要規則：
1. 絕對不可執行任何 git 操作。你的 sandbox 無法寫入 .git/index，執行會失敗。
2. 絕對不可修改 AGENTS.md 或 CLAUDE.md 檔案。不可在任何檔案中加入 <claude-mem-context> 或 <codex-mem-context> 區塊。
3. 只做程式碼實作與測試驗證，不做 git 操作。tasks.md 的 checkbox 也不需要更新。

**Proposal 摘要：**
- **Change 1 (Monitoring Story):** Overview KPI metric binding + 摘要狀態；Solar flow state + 目標對比；Factory Circuit explicit slot binding + alert reasons；共用 monitoring story model（freshness, alert tone, fallback reason, binding state）。
- **Change 2 (Images Playlist):** Images 改為 playlist domain（排序、啟用、單張停留秒數）；slide metadata（標題、區域、日期、標籤、說明）獨立於 asset file metadata；explicit fallback behavior（缺圖、未同步、尺寸不合）。
- **Change 3 (Sustainability Storytelling):** 期間切換（月/季/年/累積）；資料來源與同步狀態顯示；故事模組（里程碑、專案成果、ESG 摘要）；可配置內容模型 + fallback。

**實作範圍：**
- apps/server/src/services/displayStoryService.ts（新）
- apps/server/src/routes/display-story.ts（新）
- apps/server/src/services/imagePlaylistService.ts（新）
- apps/server/src/routes/image-playlist.ts（新）
- apps/server/src/services/sustainabilityStoryService.ts（新）
- apps/server/src/routes/sustainability-story.ts（新）
- apps/web/src/pages/Overview/viewModel.ts
- apps/web/src/pages/Solar/viewModel.ts
- apps/web/src/pages/FactoryCircuit/viewModel.ts
- apps/web/src/pages/Images/viewModel.ts
- apps/web/src/pages/Images/index.tsx
- apps/web/src/pages/Sustainability/viewModel.ts
- apps/web/src/pages/Sustainability/index.tsx
- packages/shared/src/displayStory.ts（新）
- packages/shared/src/imagePlaylist.ts（新）
- packages/shared/src/sustainabilityStory.ts（新）
- 對應的測試檔案

**Constraints（嚴格遵守）：**
- 只做內容語意、playlist、period/provenance/story modules
- 不修改 AGENTS.md、CLAUDE.md、deploy/、package.json、lockfile
- 不引入新依賴
- 既有 playback shell、offline fallback、live metrics fallback 必須保留
- Existing tests start failing — this is a regression, do not fix by editing tests, adding `.skip`, or weakening assertions
- 所有 .ts/.tsx 檔案不得超過 400 行

**Tasks（18 個 task）：**

**Change 1: add-display-monitoring-story-semantic-models (6 tasks)**
Task 1.1: Shared monitoring story model — freshness, alert tone, fallback reason, binding state. Shared model tests.
Task 1.2: Keep shared monitoring story model diagnosable — preserve fallback/binding reasons. Tests that inspect diagnostic fields.
Task 2.1: Overview declarative story metric binding — configurable KPI bindings, summary states. pnpm --filter @solar-display/web test -- src/pages/Overview/viewModel.test.ts
Task 2.2: Solar flow state storytelling — flow-state + comparison-target semantics. pnpm --filter @solar-display/web test -- src/pages/Solar/viewModel.test.ts
Task 3.1: Factory Circuit explicit slot binding — persist/resolve explicit slot assignments. Shared/server tests + FactoryCircuit/viewModel.test.ts
Task 3.2: Factory Circuit alert reasons — deterministic alert reasons + missing-data states. FactoryCircuit/viewModel.test.ts

**Change 2: add-images-playlist-editor (6 tasks)**
Task 1.1: Images as playlist domain — ordered entries with enabled state. Server tests for playlist reads and reordering.
Task 1.2: Per-entry playback duration — wiring entry duration into management UI and playback selection. Server tests + Images/viewModel.test.ts
Task 2.1: Slide metadata separate from raw file metadata — playlist-level metadata fields. Server tests.
Task 2.2: Metadata-driven info panel — render from active slide metadata with predictable fallbacks. pnpm --filter @solar-display/web test -- src/pages/Images/viewModel.test.ts
Task 3.1: Explicit fallback for missing/pending slides — entry-level fallback modes. Runtime and server tests.
Task 3.2: Diagnosed fallback in management — expose fallback mode and reason. Manual inspection + tests.

**Change 3: add-sustainability-period-storytelling (6 tasks)**
Task 1.1: Sustainability metrics by period key — periodized summary data with consistent selection. Shared model tests + Sustainability/viewModel.test.ts
Task 1.2: Period selection consistency — wire chosen period into highlight, big number, dependent blocks. View model tests.
Task 2.1: Data provenance as first-class — provenance and sync-state fields in story outputs. View model or shared model tests.
Task 2.2: Expose provenance to management/diagnostics — return provenance from APIs. Server tests.
Task 3.1: Compose story modules from configurable content blocks — milestone/ESG summary modules. Content model tests + page rendering checks.
Task 3.2: Compatible with fallback content — readable module fallback when content incomplete. pnpm --filter @solar-display/web test -- src/pages/Sustainability/viewModel.test.ts

**Done when：**
1. 所有 18 個 task 的程式碼完成
2. pnpm --filter @solar-display/web test exit 0
3. pnpm --filter @solar-display/server test exit 0
4. pnpm run build exit 0
