## Why

資料新鮮度目前分散在頁面與來源邏輯中，50 台 Client 無法共享一致門檻，離線時也容易把歷史數值誤示為即時資料。Server 需要以少量資料類別集中判定 freshness，Client 只呈現權威結果並在可信 App Time 下延續年齡。

## What Changes

- 建立 realtime、daily、cumulative、static 四類全域 Freshness Policy，不提供逐 Metric 設定叢林。
- Server 依來源 timestamp 與 App Time 回傳 live、delayed、stale、historical 狀態及完整 source time。
- Readiness 與 Effective Rotation 使用同一 Site-scoped freshness 判定；不相關廠區資料不阻擋播放。
- Client 在線時接受 Server 判定；短暫離線時以最後 Server Time＋monotonic elapsed 推進，time-untrusted 時凍結 age 與 escalation。
- 非 live 狀態停止即時動畫、趨勢暗示與「目前」措辭，並顯示資料延遲／非即時資料／歷史快照語意。
- 管理端可調整四類門檻並預覽影響，不建立 per-device policy。

## Capabilities

### New Capabilities

- server-authoritative-freshness-policy: 定義全域 freshness 類別、權威判定與 UI 語意。

### Modified Capabilities

- display-page-per-metric-freshness: per-metric 狀態改由全域類別政策解析。
- display-readiness-checks: Readiness 使用與 runtime 相同的 Site-scoped freshness 結果。
- sustainability-data-provenance: 歷史數值必須顯示來源時間並停用即時暗示。

## Impact

- Affected specs: server-authoritative-freshness-policy, display-page-per-metric-freshness, display-readiness-checks, sustainability-data-provenance
- Affected code:
  - New: apps/server/src/db/migrations/032_freshness_policy.sql, apps/server/src/services/freshnessPolicyService.ts, apps/server/src/routes/freshness-policy.ts, apps/server/src/routes/freshness-policy.test.ts, packages/shared/src/freshnessPolicy.ts, apps/web/src/hooks/useFreshnessState.ts
  - Modified: apps/server/src/services/displayReadinessService.ts, apps/server/src/services/displayStoryService.ts, apps/server/src/services/sustainabilityStoryService.ts, packages/shared/src/index.ts, apps/web/src/services/api.ts, apps/web/src/pages/Overview/index.tsx, apps/web/src/pages/Solar/index.tsx, apps/web/src/pages/Sustainability/index.tsx
  - Removed: none
