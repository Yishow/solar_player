## 1. Signal 與 reducer TDD

- [x] 1.1 先為 Broadcast an ordered Server Time Signal、Derive App Time from monotonic elapsed time、Expose deterministic Time Sync states 寫 failing Fake Socket/reducer table tests；驗證 immediate emit、30 秒、sequence、instance restart 與 90秒/30分鐘 exact boundaries。
- [x] 1.2 實作 Broadcast a process-scoped ordered time signal，使每 process 新 instanceId 且 sequence 嚴格遞增；直跑 serverTimeSignal.test.ts。
- [x] 1.3 實作 Derive App Time from performance monotonic elapsed，使 OS Clock jump 不影響 App Time；直跑 appTime.test.ts 的 duplicate/out-of-order/restart cases。

## 2. Playback、heartbeat 與安全邊界

- [x] 2.1 實作 Freeze absolute logic while time is untrusted 與 Freeze absolute-time behavior when time is untrusted，讓 waiting/time-untrusted 凍結 schedule/freshness age 且 relative rotation 繼續；以 playback controller tests 驗證。
- [x] 2.2 [P] 實作 Report Time Sync State in Device heartbeats，讓四態進入 liveness snapshot；以 heartbeat loop與 Socket tests 驗證。
- [x] 2.3 實作 Drive playback schedules from trusted App Time、Apply recovered absolute-time results at a Safe Playback Boundary 與 Apply recovered absolute results at a safe boundary；以 injected monotonic clock驗證 recovery不腰斬頁面。
- [x] 2.4 [P] 更新 Header 與 runbook，顯示 Asia/Taipei App Time並明示不修改OS Clock；以 Header test與文件 read-back驗證。

## 3. 驗證與 FHD 證據

- [x] 3.1 執行 focused server/shared/web tests、pnpm test、pnpm build、pnpm verify 與 spectra analyze server-authoritative-app-time。
- [x] 3.2 以 pnpm run fhd:witness -- --base-url <url> 產生五頁 fresh screenshots、gap notes與evidence bundle；由使用者驗收 clock/state 呈現。
