## 1. 先建立部署路徑回歸

- [x] 1.1 在 `scripts/deploy.test.mjs`加入失敗測試，覆蓋「Default deployment uses the canonical runtime root」、「Explicit install root propagates to the installed unit」、「Deployment preserves mutable runtime state」與「Install-root rendering preserves service hardening」；驗證：測試能重現 /opt installer與 /data unit失配，並對 stale root、sentinel overwrite、hardening遺失明確失敗。

## 2. 修正 installer 與 unit contract

- [x] 2.1 依「/data is the canonical default」將 direct deploy default固定為 /data/solar-display，並在任何 mutation前拒絕不合法 absolute root；驗證：default與invalid-root tests分別證明 canonical root與nonzero/no-mutation behavior。
- [x] 2.2 依「Render the service unit at install time」從 `deploy/solar-display.service`渲染 WorkingDirectory、EnvironmentFile、DATA_DIR、LOG_DIR、ReadWritePaths到選定 root，再安全 install unit；驗證：/data與/srv fixtures沒有 stale /opt或/data paths且render failure不執行daemon-reload/enable。
- [x] 2.3 依「Preserve mutable state and service hardening」讓application refresh不覆寫 .env/data/logs/uploads，並保留NoNewPrivileges、ProtectSystem、restart與journal directives；驗證：sentinel與source assertions全通過。

## 3. 文件與 Linux 驗證

- [x] [P] 3.1 依「Documentation follows the executable contract」同步 `README.md`、`deploy.md`、`docs/ops/conventions.md`的 /data default、自訂root與mutable preservation；驗證：全 repo搜尋正式deploy說明不再宣稱 /opt service contract，且文件read-back能回答五個unit paths。
- [x] 3.2 執行 shell syntax、node --test scripts/deploy.test.mjs、production build，並在非production Linux host執行systemd-analyze verify、service health與kiosk verify；驗證：所有自動檢查exit zero且Linux evidence中的install/unit root完全一致。
