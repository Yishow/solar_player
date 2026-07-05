## Why

Overview、Solar、FactoryCircuit 目前仍以頁面層級消費完整 live metrics snapshot。雖然既有 memoization 已降低部分重算成本，但每次 `liveMetrics:update` 仍會帶動過大的 render 範圍，讓播放頁在長時間執行或較弱硬體上承受不必要的 CPU 與重繪壓力。現在需要把更新邊界收斂到真正承載即時數值的 subtree，同時維持既有播放行為、fallback contract 與 FHD 視覺不變。

## What Changes

- 在 web runtime 引入共享 live metrics 訂閱邊界，讓 playback consumers 可依 metric 或 connection state 做細粒度訂閱，而不是每次讀取完整 snapshot。
- 保留既有 `useLiveMetrics()` 相容入口，避免一次推倒其他頁面或管理面呼叫端；新的細粒度訂閱將先套用在 `Overview`、`Solar`、`FactoryCircuit`。
- 將 `Overview`、`Solar`、`FactoryCircuit` 的 static shell 與 value-bearing subtree 拆開，使無關的 live metric 更新不再重建 hero、ornament、layout、connector 或 card shell。
- 補上 selector/store 行為測試與三頁 runtime regression coverage，確認 value refresh、story fallback、loading guard、circuit fallback 與 visual guardrails 全部維持既有契約。

## Capabilities

### New Capabilities

- `playback-live-metrics-subscription-isolation`: 定義 playback live metrics 共享訂閱邊界，讓 consumers 只在選取到的 live metric 或連線狀態實際變動時更新。

### Modified Capabilities

- `playback-overview-solar-value-refresh-isolation`: 將 Overview / Solar 的 value-only refresh isolation 擴展到共享 live metrics 訂閱邊界，確保 static subtree 在無關 metric 更新下維持穩定。
- `playback-factory-circuit-runtime-boundary`: 擴充 Factory Circuit 的 runtime boundary，讓 live metric-only refresh 不會重建不相關的 static shell 或破壞既有 fallback 可見狀態。
- `display-runtime-render-invariance`: 將 render-output invariance 契約涵蓋到 selector-based live metrics optimization，要求相同 snapshot 序列下維持相同輸出與 witness 結果。

## Impact

- Affected specs: playback-live-metrics-subscription-isolation, playback-overview-solar-value-refresh-isolation, playback-factory-circuit-runtime-boundary, display-runtime-render-invariance
- Affected code:
  - New: apps/web/src/hooks/liveMetricsStore.ts, apps/web/src/hooks/liveMetricsStore.test.ts
  - Modified: apps/web/src/services/socket.ts, apps/web/src/hooks/useLiveMetrics.ts, apps/web/src/pages/Overview/index.tsx, apps/web/src/pages/Solar/index.tsx, apps/web/src/pages/FactoryCircuit/index.tsx, apps/web/src/pages/Overview/configRender.test.tsx, apps/web/src/pages/Solar/configRender.test.ts, apps/web/src/pages/FactoryCircuit/index.test.tsx, apps/web/src/components/Sparkline.test.ts
  - Removed: none
