## Context

`deploy/deploy.sh` 接受 positional install root 並預設 /opt/solar-display，但複製的 `deploy/solar-display.service` 固定使用 /data/solar-display。現行 one-key、readonly root、verify scripts 與 Pi handoff 已以 /data/solar-display 為正式 runtime boundary；generic deploy 必須對齊，同時不能讓自訂 install root 繼續產生失配 unit。

## Goals / Non-Goals

**Goals:**

- 預設 install root 與現行 Pi contract 對齊到 /data/solar-display。
- 自訂 absolute root 能一致渲染所有 systemd paths。
- update 保留 mutable state，且 service hardening 不變。
- 文件只描述同一正式路徑。

**Non-Goals:**

- 不重寫 one-key 或 kiosk installer。
- 不加入 backup、network policy 或 live deployment。
- 不抽出只服務此次修改的新 renderer framework。

## Decisions

### /data is the canonical default

generic deploy 的預設改為 /data/solar-display。`deploy/solar-display.service` 保留 /data 的可直接閱讀 canonical values，讓 source unit、one-key 與 direct-default deploy 的文件一致。

替代方案是把 service 改回 /opt，會違反 readonly data volume 與現行 Pi scripts；把 generic deploy 標成 legacy 則會留下仍被 README 宣傳的失效入口，因此排除。

### Render the service unit at install time

`deploy/deploy.sh` 無論預設或自訂 root 都先把 canonical unit 渲染到 mktemp file，再以 install 命令寫入 /etc/systemd/system。替換欄位固定為 User 以外的 path-sensitive fields：WorkingDirectory、EnvironmentFile、DATA_DIR、LOG_DIR、ReadWritePaths；現有 direct deploy 的 User 行為不在此 change 改動。

install root 必須是 absolute path且不得包含換行或 sed delimiter；不合法時在 build、copy、systemd mutation 前 fail。採與 `deploy/install-kiosk.sh` 相同的明確替換集合，不另建共用 abstraction。

### Preserve mutable state and service hardening

direct deploy 只刷新 application bundle files，不刪除或覆寫 .env、data、logs、uploads。temp-root tests 先建立 sentinel content，再執行可測的 copy/render path並確認 sentinel 不變。

render 後以 source assertions 比對 NoNewPrivileges、ProtectSystem、Restart、StandardOutput、StandardError 與四個 writable paths；Linux rehearsal 再跑 systemd-analyze verify。

### Documentation follows the executable contract

`README.md`、`deploy.md` 與 `docs/ops/conventions.md` 統一說明 /data default、自訂 root propagation、mutable path preservation 與 Linux verification，不再描述 /opt service contract。

## Implementation Contract

- Behavior：default deploy 安裝與啟動同一 /data root；custom deploy 的 unit完全指向 operator 指定 root。
- Interface：deploy positional root 保留；省略時值為 /data/solar-display。不合法 root 回傳非零且不做部署 mutation。
- Failure modes：render 或 install unit 失敗時不得 daemon-reload／enable；mutable sentinel不得被覆寫。
- Acceptance：deploy regression tests、shell syntax、temp-root assertions、Linux systemd-analyze verify、service health與 kiosk verify通過。
- In scope：direct deploy default/copy/unit rendering、canonical service paths、部署文件。
- Out of scope：backup、restore、readonly-root implementation、network access、production Pi mutation。

## Risks / Trade-offs

- [sed replacement遇到特殊 path] → 明確限制可接受 absolute path 字元並在任何 mutation 前驗證。
- [source template與 renderer欄位漂移] → regression test要求五個 path-sensitive fields全部被替換且沒有 stale root。
- [舊 /opt install仍存在] → 文件提供明確 migration note；本 change 不自動搬移或刪除舊資料。

## Migration Plan

先在 temp root 驗證 default/custom rendering，再於非 production Linux host做 systemd verify與 service health。既有 /opt installation若要轉移，operator 另行備份後使用 /data reinstall；不由 installer自動搬移。
