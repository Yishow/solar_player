## Context

`scripts/raspi-onekey-deploy.sh --mode update` 目前一律呼叫完整 bootstrap。即使只更新 React/Fastify 程式，也會執行 Tailscale prerequisite、apt、XFCE/RDP、kiosk installer、fan profile、hotspot policy、完整 kiosk verifier 與 readonly helper。這讓日常測試發布受外部 apt 網路與主機設定影響，也模糊了「程式更新成功」和「整機重新部署成功」的界線。

## Goals / Non-Goals

**Goals:**

- installed-card 的一般 update 預設只更新 application bundle。
- app update 保留 verified backup、mutable runtime preservation、release identity、service/health 與 recovery handoff。
- full deploy 明確承接 init、桌面、kiosk、boot、Wi-Fi、溫控、readonly 與 reboot witness。
- skill 依請求內容選 scope，避免日常測試更新誤跑完整流程。

**Non-Goals:**

- 不移除既有 full deploy 能力。
- 不降低 update 的 runtime backup 或 production DB 保護。
- 不替 current dirty test build 建立虛假的 clean release identity。
- 不在 app update 修改 `.env`、disk、OS packages、desktop、systemd unit、boot config、Wi-Fi 或 readonly 狀態。

## Decisions

### 使用單一 scope 參數區分 app update 與 full deploy

one-key 與 bootstrap 新增 `--scope app|full`。未明確指定時，`--mode update` 預設 `app`，`--mode init` 預設 `full`。app scope 只允許 update；init 或任何 host-level 選項必須使用 full scope。

替代方案是建立第二支幾乎重複的 deploy script；拒絕原因是 bundle upload、verified backup、copy preservation 與 recovery handoff 會形成兩套易漂移實作。

### app update 共用備份與 bundle replacement 但走獨立完成門檻

app scope 共用 SSH/upload、host identity、`/data`、verified runtime backup、bundle copy 與 production dependency install。完成時只重啟既有 `solar-display.service`，驗證 release manifest、service active 與 `/health`，不呼叫 Tailscale prerequisite、desktop helper、kiosk installer、hotspot helper、kiosk verifier 或 readonly helper。

替代方案是讓 app scope仍跑完整 verifier；拒絕原因是 verifier 包含 boot、desktop、Wi-Fi 與 thermal gates，會再次把 host readiness 與 application update 綁在一起。

### full deploy 保留既有主機層流程與 reboot witness

full scope 保留目前完整 bootstrap。init 自動使用 full；update 若帶 hotspot、readonly、partition、desktop/kiosk 或 boot-level 需求，skill 與 CLI 都要求 full。部署程式本身不自動 reboot，skill 在主機層變更後執行 reboot witness。

替代方案是 app scope偵測到 host options 後靜默升級；拒絕原因是會讓操作者以為只更新程式，實際卻修改主機。

### dirty test build 必須誠實標記並限制用途

skill 可將使用者明確要求的目前工作樹部署到測試 Pi；bundle manifest 維持 `sourceDirty=true`，回報 commit 與 dirty 狀態。正式 release 仍要求 clean commit。

替代方案是先自動 commit 所有 WIP；拒絕原因是不同進行中變更不應被未經確認地合併提交。

## Implementation Contract

### Behavior

- `--mode update` 未指定 scope 時執行 app update；`--mode init` 未指定 scope 時執行 full deploy。
- app update 必須先取得 verified backup，再替換 application files；失敗時不得自動回滾 production DB。
- app update 不得執行 apt、Tailscale prerequisite、disk mutation、environment creation、desktop/kiosk/boot/hotspot/readonly helpers、full kiosk verifier 或 reboot。
- app update 必須要求既有 install root、Node/pnpm、systemd unit 與 `/data`，替換後啟動服務並驗證 release manifest、service 與 health。
- full deploy 維持既有完整行為與 hotpot/thermal/kiosk 驗證。
- skill 將「把目前變更送到測試 Pi」預設解讀為 app update；只有明確主機層變更才選 full。

### Interface and data

- one-key/bootstrap CLI：`--scope app|full`。
- default mapping：`update -> app`、`init -> full`。
- app scope 與 `init`、`--apply-readonly`、`--create-data-partition` 或 hotspot options 同時出現時必須 nonzero 並指出改用 `--scope full`。
- release manifest 沿用 `sourceDirty`；不得因測試部署覆寫其真實值。

### Acceptance criteria

- deploy tests 證明 app scope dry-run、argument forwarding、full default for init、host-option rejection 與 bootstrap call exclusion。
- app bootstrap fixture 證明 backup 在 copy 前完成、service restart/health 在 copy 後完成，且 host helpers完全未被呼叫。
- full scope regression tests 仍通過。
- skill validation 與 required-gates test 證明兩種 scope 的選擇與不同 completion gates。
- 以目前有意的 dirty worktree 對測試 Pi 執行 app update，remote manifest 顯示 `sourceDirty=true`，verified backup、service 與 health 通過，且不要求 reboot。

### Scope boundaries

- In scope：one-key scope routing、bootstrap app path、deployment skill、deploy tests、handoff docs 與一次 live test update。
- Out of scope：自動 commit WIP、production DB restore、app runtime 功能正確性、MQTT/playback readiness、full deploy 主機流程重構。

## Risks / Trade-offs

- [app update 遇到缺少 Node 或 systemd unit] → fail closed 並要求改跑 full deploy，不在 app scope偷偷安裝主機依賴。
- [dirty test build 難以回溯] → manifest 保留 base commit 與 `sourceDirty=true`，回報時明確標記測試版。
- [操作者誤把主機變更當 app update] → CLI 拒絕 host options，skill 以檔案/需求類型判斷並在不確定時選 full。

## Migration Plan

1. 以 TDD 加入 scope parsing、dry-run、forwarding 與 bootstrap exclusion fixtures。
2. 實作 app scope 並保留 full regression。
3. 更新 skill 與 `deploy.md`，執行 skill validation、deploy tests 與 repo verification。
4. 用 app scope 部署目前工作樹到測試 Pi，保存 backup 並驗證 dirty release、service、health；不 reboot。
5. 回滾只先還原 prior application archive；production runtime restore 仍需 operator 明確決定。

## Open Questions

無。
