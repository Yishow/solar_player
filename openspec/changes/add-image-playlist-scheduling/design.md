## Context

Playlist runtime currently resolves enabled/assets/fallback and web autoplay controls per-entry duration/shuffle. Playback shell已有 server-authoritative app time與 time-untrusted handling，可重用於 schedule。Schedule不應只存在 web UI，否則 offline/restart/多 display容易各自判斷不同。

## Goals / Non-Goals

**Goals:**

- entry能設定一次性日期範圍與每週/每日重複時段。
- server/shared resolver對同一 timestamp產生 deterministic eligibility。
- schedule edge在 slide boundary套用，不出現突然空白。
- 管理者可 preview未來時點的有效清單。
- offline time不可信時採明確安全語意。

**Non-Goals:**

- 不支援任意 RRULE/外部 Calendar同步第一版。
- 不做秒級排程；分鐘精度足夠。

## Decisions

### Schedule model 採有限欄位而非自由文字 RRULE

Entry新增 nullable `startsAt`, `endsAt`, `repeatDays`, `dailyStart`, `dailyEnd`, `scheduleTimezone`（第一版固定/預設 server playback timezone）。一次性期間先判斷，再套 weekly/daily window。Overnight daily window（如 22:00–02:00）需明確支援並測試。

### Eligibility 在 shared pure resolver 計算

建立 `isImagePlaylistEntryScheduleEligible(entry, epoch, timezone)`，server runtime與web/offline共用。Resolved entry增加 schedule state/reason，但不改 asset fallback reason欄位；兩種 exclusion來源保持可區分。

### Schedule 更新於安全 slide boundary 生效

如果目前 entry在顯示期間到期，讓本次 duration完成；下一次 `next`/timer boundary重新取得/套用 eligible order。若 management update使 current entry被停用，同樣走安全 boundary，除非既有 emergency/fallback規則另有要求。

### Time-untrusted fail closed only for scheduled entries

Offline app time狀態為 waiting/time-untrusted時，沒有 schedule的 entries仍 eligible；需要 absolute-time判斷的 entries視為 temporarily ineligible並標 `time-untrusted`，直到時間恢復。這比用裝置可能錯誤的 wall clock播放期間限定內容安全。

## Implementation Contract

- start/end外的 entry不進播放 order。
- repeat day與 daily window同時指定時必須都符合；overnight window跨日判斷一致。
- schedule在 active slide中途到期不立刻切圖，下個 boundary不得再選它。
- future preview使用指定 server-timezone timestamp且不改正式 runtime state。
- offline time-untrusted不會啟動 scheduled-only素材。

## Migration Plan

新增 nullable columns；existing rows全部 schedule null，因此行為完全相容。Offline snapshot schema版本若需提升，先讓新 reader兼容舊 snapshot缺少 schedule fields。Rollback忽略新 columns即可維持原 always-eligible行為。

## Risks / Trade-offs

- [Risk] timezone/DST語意複雜 → 使用既有 server playback timezone helper，測跨午夜；台灣現場無 DST但 pure resolver仍避免本地 JS隱式 timezone。
- [Risk] schedule更新和 shuffle cycle交錯 → eligibility signature納入 schedule-active entry ids，變動時重建 cycle。
