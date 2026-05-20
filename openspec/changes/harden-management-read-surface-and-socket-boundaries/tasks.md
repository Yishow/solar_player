## 1. Trusted management read boundary primitives

- [ ] 1.1 擴充 `apps/server/src/plugins/managementAuth.ts` 與共用型別，重用既有 trusted-origin / access-token model 來同時服務 HTTP read gating 與 mutation gating，落實 `Restrict management-only read routes to trusted operator callers`。對應 design topic: decision: reuse the existing trusted-origin and access-token model for read gating.
- [ ] 1.2 新增 playback-safe runtime brand / mqtt bootstrap contract，並把 `apps/web/src/hooks/useBrandAssets.ts`、`apps/web/src/hooks/useMqttStatus.ts` 改接最小安全 payload，落實 `Preserve playback-safe runtime reads under hardened management boundaries`。對應 design topic: decision: split public runtime reads from management reads.

## 2. Route and socket isolation

- [ ] 2.1 對 `apps/server/src/routes/device.ts`、`apps/server/src/routes/device-display-ops.ts`、`apps/server/src/routes/display-ops.ts`、`apps/server/src/routes/display-readiness.ts`、`apps/server/src/routes/settings-mqtt.ts` 與完整 brand management reads 套用 management-only read boundary，讓 `Provide ESM-safe Device Status log access`、`Extend Device Status with display operations summary` 與 `Keep Device Status diagnostics bounded to safe read and refresh actions` 都回傳明確 denied semantics，而不是 silent empty state。
- [ ] 2.2 調整 `apps/server/src/realtime/SocketService.ts` 與 `apps/web/src/services/socket.ts`，把 socket session 分成 `playback-safe` 與 `management-trusted`，直接落實 `Classify socket sessions as playback-safe or management-trusted` 與 `Keep management-only socket events scoped to trusted sessions`。對應 design topic: decision: gate sensitive socket.io channels by session class instead of shutting off socket bootstrap entirely.

## 3. Management UI denied handling and verification

- [ ] 3.1 更新 `apps/web/src/pages/DeviceStatus/index.tsx`、`apps/web/src/hooks/useDeviceDisplayOpsSummary.ts`、`apps/web/src/hooks/useDisplayReadiness.ts` 與相關 API helpers，讓管理頁能分辨 denied state 與真正的 empty/error state。對應 design topic: decision: device diagnostics routes return explicit denied envelopes instead of silent empty payloads.
- [ ] 3.2 補齊 server / web tests，覆蓋 trusted vs untrusted read paths、runtime bootstrap route、socket event visibility 與 `Device Status` denied UX；執行 `pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test` 與 `spectra analyze harden-management-read-surface-and-socket-boundaries`。
