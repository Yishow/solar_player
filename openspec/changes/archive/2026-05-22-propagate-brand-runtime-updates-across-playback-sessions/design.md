## Context

品牌資產目前已能在 server 端更新與切換 active profile，但實際 playback header 只在初次 render 時透過 `getBrandProfiles()` 拉一次資料，之後只靠同分頁 `solar-display:brand-changed` window event 重新載入。server 雖已發出 `display:sync` brand 事件，卻沒有任何 runtime hook 消費，因此跨 session 的播放頁會長時間顯示 stale logo 與標語。這在 kiosk / 顯示牆環境下尤其明顯，因為播放端往往不會手動重整。

## Goals / Non-Goals

**Goals:**

- 讓 brand 更新對所有已連線 playback session 都能自動生效。
- 讓 runtime 改用 active-brand-only contract，而不是依賴完整 management profile list。
- 只刷新 header brand view，不中斷既有播放頁內容與輪播狀態。

**Non-Goals:**

- 不新增 brand 排程、版本比較或 rollback 功能。
- 不在這個 change 內處理 management read boundary hardening 本身；那由前一個 change 提供前置 contract。
- 不把 brand 更新擴大成 full playback reload。

## Decisions

### Decision: Reuse the existing `display:sync` brand scope as the cross-session invalidation signal

server 已在 brand mutation 後送出 `scope: "brand"` 的 `display:sync` 事件，因此這個 change SHALL 直接讓 runtime brand hook 訂閱同一個 signal，而不是再新增第二條 brand-only socket channel。這可維持單一 invalidation vocabulary，也能減少事件來源分裂。

替代方案是新增 `brand:updated` socket event。那會讓同一個 runtime refresh domain 同時存在兩套訊號，後續也更難維護，因此不採用。

### Decision: Hydrate playback brand state from the active brand contract only

playback runtime 只需要 active brand view，不需要完整 profile list。這個 change SHALL 讓 `useBrandAssets` 專注於 active brand payload，避免播放端再次依賴 management list route。這也讓後續 brand hardening 與 caching boundary 更清楚。

替代方案是繼續抓 `getBrandProfiles()` 再在前端挑 active。那會把 management payload 暴露到播放端，而且 refresh 成本更高，不採用。

### Decision: Refresh brand view in place instead of reloading the whole playback shell

品牌更新只影響 header / title block，因此 runtime SHALL 在收到 brand invalidation 時重新抓 brand view 並更新本地 state，不透過 `window.location.reload()` 或整頁 controller reload。這樣可以保留當前輪播位置與其他 runtime state。

替代方案是把 brand scope 納入 `displaySyncPlaybackReload` 全域 reload。這雖然實作快，但會讓單純 logo 更新也打斷播放節奏，因此不採用。

## Implementation Contract

- Behavior:
  - Active brand 的文字、logo、active 切換與 logo 刪除都會觸發相同的 cross-session invalidation。
  - 已連線 playback session 收到 brand invalidation 後，會重新抓取 active brand view 並更新 header。
  - 同分頁管理操作仍可透過本地 event 立即回饋，但最終 state 以 server refresh 為準。
- Interface / data shape:
  - playback runtime 讀取 contract 需回傳單一 active brand payload，供 `profileToView` 或等價轉換使用。
  - `display:sync` 的 `scope: "brand"` 需被 `useBrandAssets` 或 brand refresh helper 視為 relevant event。
- Failure modes:
  - brand refresh fetch 失敗時，runtime 保留上一個可用 brand view，避免 header 閃回空白。
  - 若 active brand 不存在，runtime 退回既有 `defaultBrandView`。
- Acceptance criteria:
  - web tests 覆蓋 brand signal 觸發 refresh、fetch failure fallback 與不整頁 reload 的行為。
  - server tests 覆蓋 brand mutation 都會送出 brand scope invalidation。
  - `spectra analyze`、`pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test` 通過。
- Scope boundaries:
  - In scope: brand invalidation wiring、active-brand runtime hydration、cross-session playback refresh。
  - Out of scope: brand history/versioning、full playback reload policy、management auth redesign。

## Risks / Trade-offs

- [Risk] brand signal 與 management local event 同時觸發，可能造成 double fetch。 → Mitigation: 在 hook 內做 in-flight coalescing 或單一 refresh entrypoint。
- [Risk] runtime 仍有地方讀取完整 profile list，導致 contract 再次混用。 → Mitigation: 明確限定 playback hook 只走 active-brand route，management page 才保留完整 list route。
- [Risk] brand refresh 失敗時 header 退回 default 造成閃爍。 → Mitigation: 失敗時保留上一個成功 view，而不是直接清空成 default。
