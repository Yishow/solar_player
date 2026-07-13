## 1. 鎖定漏洞解析範圍

- [x] 1.1 記錄 fresh production audit 與 recursive dependency reasons，建立「Production dependency graph is free of known advisories」及「Patched transitive resolutions are inspectable」的失敗基線；驗證：保存 pnpm audit --prod、pnpm why ws -r、pnpm why react-router -r 的 advisory IDs、parent paths與 vulnerable resolutions。
- [x] 1.2 依「Targeted lock refresh before scoped overrides」只刷新命中 package family；parent range無法產生 patched resolution時才加入有移除條件的 scoped override；驗證：重跑 audit/why為零 finding，並檢查 `package.json`、workspace manifests與 `pnpm-lock.yaml` diff沒有無關 major/churn。

## 2. 回歸與交付驗證

- [x] 2.1 依「Advisory evidence and regression gates」證明「Advisory remediation preserves runtime integration behavior」：執行 MQTT connect/publish、Socket.IO connect/reconnect與 router loader targeted tests；驗證：所有 targeted commands exit zero且沒有新增 skipped failure。
- [x] 2.2 執行完整 server/web/deploy tests與 production build，再重跑 audit/why並審查最終 diff；驗證：所有 commands exit zero、audit無任何 severity advisory、每條 ws/react-router production path皆為 patched resolution。
