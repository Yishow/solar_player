## 1. 公開 seam 與負載 harness

- [x] 1.1 先為 Verify fifty paired Clients through public seams 與 Prove Site isolation and identity lifecycle end to end 建立 failing harness self-tests；以 temporary SQLite 驗證 Management API→Pairing→Story/Rotation/Socket 完整路徑。
- [x] 1.2 實作 Exercise public seams instead of private containers 與 Model fifty clients with shared profile-site cohorts，使至少25 CL＋25 KN Clients可重跑；以 pnpm run verify:device-scoped-playback 的 clients=50、failures=0 驗證。
- [x] 1.3 實作 Keep acceptance thresholds explicit 與 Enforce bounded heartbeat, Time Signal, and rotation evaluation rates；以10分鐘run輸出 heartbeats、timeSignals、rotationEvaluations、peakConnections並在超標時非零退出。

## 2. 部署與文件驗收

- [x] 2.1 實作 Verify installed thin-kiosk behavior by read-back 與 Verify the installed thin-kiosk identity and time path，使 verify script 檢查 Profile、Cookie restart、URL、Time Signal、heartbeat fields；以 controlled install fixture 驗證每個 named failure。
- [x] 2.2 [P] 完成 Produce durable Phase 1 handoff documentation，涵蓋 architecture、migration、compatibility、pairing、Site isolation、time、Windows/Pi、troubleshooting與50-client matrix；以 fresh operator read-back 驗證。
- [x] 2.3 [P] 將 acceptance command 接入明確 root script但不拖慢快速 pnpm test；以 package script test與 scripts/verify.test.mjs 驗證 stage routing。

## 3. 最終 gate

- [x] 3.1 執行 harness self-tests、真實50-client run、deploy verification、pnpm test、pnpm build、pnpm verify 與 spectra analyze phase1-multisite-playback-acceptance。
- [x] 3.2 整理Phase 1 acceptance evidence並交由使用者判定launch readiness；未取得人工 acceptance不得archive。
