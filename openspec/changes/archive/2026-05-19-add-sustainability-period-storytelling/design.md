## Context

Sustainability 頁現有內容以單一摘要快照為主，highlight rail、big numbers 與 stat cards 已有基本畫面，但缺少期間切換、來源透明度與故事模組，因此無法穩定承接持續更新的永續成果。若不先把內容模型切乾淨，後續資料一多就會再度回到硬編碼文字與數字。

## Goals / Non-Goals

**Goals:**

- 提供 Sustainability 的期間切換與多期間比較模型。
- 顯示資料來源、更新時間與同步狀態。
- 提供里程碑、專案成果與 ESG 摘要的故事模組。

**Non-Goals:**

- 不在此 change 內定義全站共用圖表系統。
- 不在此 change 內重做監控頁或 Images 頁的故事層。
- 不在此 change 內建立設備層觀測中心。

## Decisions

### Model Sustainability metrics by period key

永續頁數值以 period key 驅動，例如 `month`, `quarter`, `year`, `lifetime`。這讓 highlight、big numbers 與模組可以共用同一組期間切換狀態。

### Keep data provenance as first-class presentation data

來源、最後更新時間與同步狀態不是除錯資訊，而是 Sustainability 頁內容的一部分，因此需成為 story model 的一級欄位。

### Compose story modules instead of hardcoding one fixed bottom layout

故事模組以可配置列表呈現，讓里程碑、專案成果與 ESG 摘要可增減，而不是再把更多內容硬塞進固定三張 stat cards。

## Implementation Contract

- Behavior:
  - 使用者或維運人員可在 Sustainability 頁切換不同期間視角。
  - 頁面可顯示每項指標的資料來源、更新時間與同步狀態。
  - 頁面可呈現多個故事模組，例如里程碑、專案成果與 ESG 摘要。
- Interface / data shape:
  - shared story model 至少支援 `periodKey`, `availablePeriods`, `provenance`, `updatedAt`, `syncState`, `storyModules`。
- Failure modes:
  - 某期間資料缺失時仍保留其他期間與安全 fallback。
  - provenance 缺失時不可使頁面崩潰，需顯示明確未提供狀態。
- Acceptance criteria:
  - view model tests 覆蓋 period switch、provenance 顯示與故事模組 fallback。
  - management 或 runtime 測試覆蓋資料模型序列化。
- Scope boundaries:
  - in scope: period comparison、data provenance、story modules。
  - out of scope: 全站圖表平台、其他頁 story model。

## Risks / Trade-offs

- [Risk] 期間切換需要更多資料來源契約 → Mitigation: 先支援固定 period key，逐步擴充。
- [Risk] 故事模組太自由造成 layout drift → Mitigation: 模組化但仍限制在既定版位家族內。
- [Risk] provenance 資訊過多影響視覺 → Mitigation: 以摘要標記與細節展開區分層級。
