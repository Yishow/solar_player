## Context

此前置為 App Time、version rollout與Freshness Policy。現有 crash recovery與offline routing無正式Device/Profile/Rotation snapshot；此 change補上Browser原生cache，不新增Server或OS高權限服務。

## Goals / Non-Goals

**Goals:**

- 離線與Browser重啟後播放最後成功的Applied Version。
- 保存結構化runtime snapshot與App Shell/素材。
- 背景更新並在Safe Playback Boundary啟用。

**Non-Goals:**

- 不把cache資料標示為live，不以OS Clock推進絕對時間。
- 不快取management mutations、Pairing Token或Device Credential。
- 不新增原生daemon、MQTT離線通道或跨裝置同步。

## Decisions

### Split structured state and immutable assets

IndexedDB stores分開保存Device context summary、Applied Version、Effective Rotation、Freshness Policy與Last-known Metrics；Cache Storage保存versioned App Shell、style、image與published assets。Credential仍僅在HttpOnly Cookie。

### Commit snapshots atomically after successful validation

下載完整version snapshot與asset manifest後驗證schema、version與required assets，再以單一IndexedDB transaction切換candidate為ready。部分下載不得取代last-known-good。

### Let the Service Worker stage but not activate playback updates

Service Worker install/cache在背景完成並通知Client candidate ready；Client controller於Safe Playback Boundary送activate訊號。失敗或page中途不得skipWaiting強制refresh。

### Recover conservatively without trusted time

離線啟動先載入last-known-good App Shell與Applied snapshot。若無Server Time，relative duration繼續，schedule/freshness escalation/age凍結；所有last-known metrics顯示source timestamp與最後可信freshness state。

## Implementation Contract

**Behavior**

- 已成功cache的Client在Server停止且Browser重啟後仍載入shell、rotation、typography styles/images與last-known metrics。
- 未cache完整的Client顯示明確offline unavailable，不拼接不同version。
- 新App Shell只在safe boundary啟用；activate失敗保留舊shell/snapshot。
- reconnect先同步App Time與desired version，再於safe boundary更新畫面。

**Interface / data shape**

- IndexedDB database為solar-playback-runtime，stores含meta、profileSnapshots、rotationSnapshots、freshnessPolicies、metricSnapshots。
- 每個snapshot含schemaVersion、profileVersion、siteScope、savedAtServerEpoch與source timestamps。
- asset manifest以content hash驗證，Cache key包含app release/profile version。

**Failure modes**

- quota、corrupt record、manifest/hash mismatch皆隔離candidate並保留last-known-good。
- Cookie不在IndexedDB/Cache；Pairing Token URL不被Service Worker cache。
- time-untrusted不計算新的age或schedule transition。

**Acceptance criteria**

- unit tests覆蓋atomic commit、corruption、quota與candidate rollback。
- 真實Browser tests覆蓋warm cache後server stop、Browser restart、asset load、relative rotation、time freeze與reconnect。
- pnpm test/build/verify與五頁 fresh FHD witness/evidence bundle通過；offline與update切換由使用者驗收。

**Scope boundaries**

- In scope：Service Worker、IndexedDB/Cache、offline hydration、safe activation、Browser tests。
- Out of scope：management offline edits、OS service、external CDN、new Profile governance。

## Risks / Trade-offs

- [Cache Storage容量不足] → atomic candidate隔離與last-known-good保留，清理未引用舊candidate。
- [Service Worker生命週期複雜] → 禁止自動skipWaiting，所有activation走明確controller contract。
