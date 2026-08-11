## 1. Event model and health rules

- [ ] 1.1 新增 monitoring/health event schema、indexes、retention與 shared types。
- [ ] 1.2 實作 stale/missing、cumulative-reset、jump、opt-in stuck rule evaluation。
- [ ] 1.3 實作 deterministic fingerprint、open/ongoing/recovered lifecycle與去重。
- [ ] 1.4 把 MQTT/device/freshness/readiness既有訊號接入 event layer，保留安全 details。

## 2. Operator Alert Center

- [ ] 2.1 新增 active/recent alerts API、filters、acknowledge/mute mutations與 auth tests。
- [ ] 2.2 新增 management Alert Center 頁/區塊與 source deep-link。
- [ ] 2.3 定義 outbound delivery adapter/preferences/receipt contract；未設定 provider 明確顯示 unavailable。

## 3. Trend annotations

- [ ] 3.1 新增 time-range monitoring event query。
- [ ] 3.2 Energy Trend/History 顯示 MQTT、reset、reboot、health event annotations 與 detail popover。
- [ ] 3.3 補 annotation timezone/range/filter tests。

## 4. Verification

- [ ] 4.1 新增 night-zero suppression、dedupe、recovery、reset edge、jump threshold tests。
- [ ] 4.2 跑 management/browser critical journeys for alert center and trend annotations。
- [ ] 4.3 跑 root `pnpm test`、`pnpm build`、`pnpm verify`。
