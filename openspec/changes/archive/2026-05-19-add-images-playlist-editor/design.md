## Context

`Images` 頁與 `ImageManagement` 目前仍以素材檔案為中心，而不是以播放清單為中心。這導致主舞台、縮圖、停留秒數與資訊面板雖有部分資料，卻還沒有一個可被排序、啟停、補 metadata 與定義 fallback 的內容編排模型。

## Goals / Non-Goals

**Goals:**

- 建立 Images playlist management，讓 slide 順序、啟用與停留時間可被編輯。
- 補齊 slide metadata，讓 info panel 可顯示真正內容資訊。
- 定義 Images playback fallback behavior，處理缺圖、未同步與不適配素材。

**Non-Goals:**

- 不在此 change 內處理共用 asset library 的所有治理欄位。
- 不在此 change 內處理展示頁整體輪播順序。
- 不在此 change 內處理永續頁或監控頁的內容模型。

## Decisions

### Treat Images as a playlist domain, not only an asset repository

Images 頁的主真相改為 playlist entry，而不是單純圖片資產。asset 仍存在，但播放順序、停留時間與 metadata 必須附著在 playlist entry 才能穩定驅動展示頁。

### Keep slide metadata separate from raw file metadata

檔案尺寸、mime type 等是資產層資料；標題、區域、日期、標籤與說明是 slide 敘事層資料，需獨立保存，避免檔案替換時丟失編排內容。

### Make fallback behavior explicit for missing or pending slides

缺圖、未同步與尺寸不合不應只在頁面上隱性顯示 placeholder，而應有可配置且可測試的 fallback 行為，例如保留版面、替代圖或跳過該 slide。

## Implementation Contract

- Behavior:
  - 維運人員可編排 Images 播放清單順序、啟用狀態與單張停留秒數。
  - 每張 slide 可保存標題、區域、日期、標籤與說明，並在 info panel 顯示。
  - 缺圖或待同步 slide 依定義好的 fallback behavior 顯示或略過。
- Interface / data shape:
  - shared playlist model 需支援 `entryId`, `assetId`, `enabled`, `displayOrder`, `durationSeconds`, `title`, `area`, `capturedAt`, `tags`, `description`, `fallbackMode` 或等價欄位。
- Failure modes:
  - asset 缺失時 playlist entry 不應讓整頁崩潰。
  - metadata 不完整時仍可播放，但需有可診斷 fallback 呈現。
- Acceptance criteria:
  - server tests 覆蓋 playlist persistence、排序與 fallback 計算。
  - web tests 覆蓋 view model 與 images/info panel 的 metadata 呈現。
- Scope boundaries:
  - in scope: playlist entry、metadata、slide fallback。
  - out of scope: asset library 全域治理、展示頁總輪播。

## Risks / Trade-offs

- [Risk] 舊資料只存在 asset 層欄位 → Mitigation: 提供從既有 image assets 生成初始 playlist entries 的兼容策略。
- [Risk] metadata 與 asset 層資料分離造成同步成本 → Mitigation: 明確區分責任邊界並提供共用查詢 API。
- [Risk] fallback 模式過多 → Mitigation: 先支援少量明確模式，如 placeholder、skip、fallback asset。
