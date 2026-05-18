## Context

`PlaybackSettings` 目前只知道播放頁順序與秒數，`ImageManagement` 只知道圖片庫本身，兩者都不知道 display editor 是否有未發布變更、某頁是否因健康狀態而不可播、某素材是否正被正式頁引用。這使管理面仍是分散的工具集合，而不是一致的 display operations workflow。

## Goals / Non-Goals

**Goals:**

- 讓 PlaybackSettings 看見 display rotation 的發布與 skip 狀態。
- 讓 ImageManagement 看見素材對 display pages 與 slideshow 的引用影響。
- 提供跨 surface sync，讓 editor、播放設定與圖片管理可對同一 display operations 狀態達成一致。

**Non-Goals:**

- 不在此 change 內實作 MQTT readiness 或 circuit slot binding。
- 不在此 change 內建立 device-status 的完整觀測中心。
- 不在此 change 內處理 editor 拖曳或 schema-aware inspector。

## Decisions

### Use a shared display operations summary for management surfaces

PlaybackSettings、ImageManagement 與 DisplayPagesEditor 透過同一份 display operations summary 讀取發布、引用、skip 與阻塞資訊，而不是各自拼裝 API。這能避免跨頁解讀不一致。

### Keep playback and image surface actions independent but synchronized

兩個 surface 仍保留各自的主操作，但在完成儲存、發布或引用變更後，透過事件流同步顯示狀態與阻塞提示。

### Surface blockers where operators already work

未發布變更、素材被正式頁引用、某頁已被 skip 等 blocker 應直接出現在操作者本來就在用的頁面，而不是要求額外開 diagnostics 頁。

## Implementation Contract

- Behavior:
  - PlaybackSettings 可看見哪些頁面已發布、哪些頁面會被 skip，以及 skip reason。
  - ImageManagement 可看見某張圖被哪些頁面或 playlist entry 引用，以及 draft/live 差異和刪除風險。
  - editor、PlaybackSettings、ImageManagement 在 display operations 變動後可同步狀態。
- Interface / data shape:
  - display operations summary 至少支援 `publishState`, `skipState`, `skipReason`, `assetReferences`, `draftPending`, `blockingIssues`。
- Failure modes:
  - summary service 異常時各管理頁仍保留既有主功能，但顯示 display operations 狀態不可用。
  - 引用資訊不完整時刪除或切換素材需顯示風險而非靜默成功。
- Acceptance criteria:
  - server tests 覆蓋 summary 聚合與同步事件。
  - web tests 或手動驗證覆蓋 PlaybackSettings 與 ImageManagement 的新狀態區塊。
- Scope boundaries:
  - in scope: playback/image management 與 display operations summary 的整合。
  - out of scope: MQTT/circuit readiness、device-status 完整觀測。

## Risks / Trade-offs

- [Risk] 跨 surface summary 過大 → Mitigation: 先聚焦 publish, skip, references, blockers 四類高價值訊息。
- [Risk] 多頁同步增加即時狀態複雜度 → Mitigation: 以單一事件流與可容忍延遲的重取策略搭配。
- [Risk] 在既有頁面加入過多狀態造成視覺負擔 → Mitigation: 以摘要 banner 和可展開細節層級處理。
