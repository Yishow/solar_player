## Context

此 change 是 Phase 1 最後 gate，前置為 Default Profile、Device／Group、pairing、device-scoped playback、identity liveness、fleet UI 與 App Time 全部完成。它不補產品功能，而以公開 seam、load harness、deployment read-back 與文件證明單一 Server 支援約 50 Client。

## Goals / Non-Goals

**Goals:**

- 建立可重跑的 50-client contract/load harness。
- 驗證 CL／KN 隔離、pairing lifecycle、heartbeat/time broadcast 與 bounded resource behavior。
- 完成 Windows Server／Pi thin kiosk runbook 與故障排除證據。

**Non-Goals:**

- 不以 benchmark 掩蓋 correctness failure。
- 不新增 canary、外部 NTP、full repo deployment 或 Device Agent write capability。
- 不代替使用者的 launch acceptance。

## Decisions

### Exercise public seams instead of private containers

Harness 使用 Management API 建 Group/Device、Pairing exchange、authenticated Story/Rotation、Socket heartbeat/time。不得直接呼叫私有 service 或斷言 SQL/container 結構。

### Model fifty clients with shared profile-site cohorts

至少 25 CL 與 25 KN Device 共用少量 Group/Profile，建立 50 sockets、10 秒 heartbeat、30 秒 time broadcast，並在同一輪執行 reconnect、profile sync 與 rotation request。以 counter/profiling hook 證明 evaluator 次數跟 cohort revision 成長，不跟 Device 數量等比例成長。

### Keep acceptance thresholds explicit

steady-state 每 Client heartbeat rate 為每 10 秒最多 1 次；time signal 每連線立即 1 次後每 30 秒最多 1 次；同一 Profile＋Site revision 完整 rotation evaluation 每 cohort 最多 1 次。10 分鐘 run 不得出現 unhandled rejection、event storm 或持續上升的 retained Device connection count。

### Verify installed thin-kiosk behavior by read-back

verify script 檢查專用 Firefox Profile、launcher 非 private mode、Cookie 跨 Browser restart、Server reachability、Time Signal 與 heartbeat fields。不得只檢查檔案存在。

## Implementation Contract

**Behavior**

- 50 Client 可同時配對、連線、輪播並回報狀態。
- 同 Profile 的 CL／KN responses 僅在 site-sensitive content 不同，互不改動設定。
- revoked/disabled/unpaired Device fail closed；重新配對恢復。
- reconnect 不造成無界 connection entry 或 duplicate false positive。

**Interface / data shape**

- load command 為 pnpm run verify:device-scoped-playback。
- 輸出固定包含 clients、heartbeats、timeSignals、rotationEvaluations、reconnects、failures 與 peakConnections。
- 非零 failures 或任何 threshold 超標使 command 非零退出。

**Failure modes**

- Server 未啟動、fixture 建立失敗或驗證無法觀測 metric 時 fail closed，不標示 pass。
- load fixture 使用獨立 temporary SQLite，不修改 operator data。
- deployment read-back 缺任一條件即列出精確 failed check。

**Acceptance criteria**

- harness 自測、真實 50-client run、deploy verification、pnpm test/build/verify 全通過。
- 文件由 fresh read-back 驗證能完成配對、recovery 與 clock troubleshooting。
- launch acceptance 由使用者簽核後才可 archive。

**Scope boundaries**

- In scope：test harness、verify script、docs、root verification entry。
- Out of scope：新 runtime feature、Phase 2 profiles/freshness/offline cache。

## Risks / Trade-offs

- [單機 load harness 不能等同現場網路] → 明列環境與 threshold，另保留現場 launch acceptance。
- [10 分鐘 run 增加驗證時間] → 不併入快速 pnpm test，只納入明確 acceptance command。
