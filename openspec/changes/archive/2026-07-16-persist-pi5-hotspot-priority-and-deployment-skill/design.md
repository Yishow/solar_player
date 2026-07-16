## Context

目前 `scripts/raspi-onekey-deploy.sh` 會建立 bundle 並呼叫 `deploy/raspi-bootstrap.sh`，但 hotspot helper 只被 `deploy.sh` 複製到 bundle，README 仍要求操作者手動安裝。現場 Pi 的 `Yishow`、`CL-FA-01`、`AX3600` 等 profiles 全部為 priority 0；2026-07-16 開機 journal 證明 NetworkManager 先連 `CL-FA-01`，稍後才由 uid 1000 切到 `Yishow`。部署流程需要同時管理 profile priority、trigger units、驗證與 AI 操作入口。

## Goals / Non-Goals

**Goals:**

- 讓 one-key update 能明確接收 hotspot connection、掃描 SSID 與 priority，並在 target 上持久化。
- 安裝與 enable hotspot trigger timer，確保熱點開機稍晚出現時仍可切換。
- 不在 bundle replacement 中途主動切換 Wi-Fi，避免 SSH 斷線造成半套部署。
- 讓 kiosk verifier 能以 target 現況證明設定完整。
- 提供 repo-local skill，讓 AI 從部署前檢查一路執行到 reboot witness、thermal/Wi-Fi/application verification 與回滾交接。

**Non-Goals:**

- 不改 Tailscale enrollment、ACL、DNS、routes 或 auth key。
- 不刪除其他已記憶 Wi-Fi profiles，也不禁止其 fallback。
- 不把固定 Pi IP、SSH 密碼或 Wi-Fi 密碼寫入 repo/skill。
- 不把 `deploy.md` 的硬體維修背景全文複製到 skill。
- 不在此次變更處理 MQTT runtime readiness 或 playback 頁面資料缺口。

## Decisions

### 使用單一 target helper 管理 hotspot policy

新增一個 root-only、可重跑的 helper，接受 connection id、scan SSID 與整數 priority。helper 先驗證 NetworkManager 與既有 connection profile，再設定 `connection.autoconnect=yes` 與 `connection.autoconnect-priority`，安裝現有 trigger script/unit/timer，寫入 `/etc/solar-display/tailscale-hotspot-trigger.env`，執行 daemon-reload 並 enable timer。

替代方案是直接把 `nmcli` 與 `install` 指令散落在 bootstrap；拒絕原因是無法做 focused fixture test，也會讓日後單獨修復現場 profile 更困難。

### 部署期間只 enable 不啟動 timer

helper 使用 `systemctl enable tailscale-hotspot-trigger.timer`，不使用 `--now`，且不呼叫 `nmcli con up`。priority 對既有 active connection 不產生立即切換；新的 timer 在下次開機由 timers.target 啟動。這避免遠端部署進行中切換 Wi-Fi 導致 SSH 中斷。

替代方案是在部署結尾立即切到 hotspot；拒絕原因是無法保證新網路已具備 SSH/Tailscale reachability。

### operation-time hotspot inputs 由 one-key entrypoint 傳遞

one-key entrypoint 新增 `--hotspot-connection-id`、`--hotspot-scan-ssid`、`--hotspot-priority`。三者只有在 connection id 非空時啟用 policy；current installed-card deployment skill 使用 `Yishow`、`Yishow`、`100`。不把 Wi-Fi 密碼或 target IP 寫入任何 artifact。

替代方案是在 source 中永遠 hardcode `Yishow`；拒絕原因是 repo 仍支援 fresh card 與其他現場 profile。

### verifier 以已寫入 env 作為預期值來源

若 `/etc/solar-display/tailscale-hotspot-trigger.env` 存在，verifier 讀取 connection id 與 priority，確認 profile 存在、SSID 一致、autoconnect 開啟、priority 相等、helper/unit/timer 已安裝且 timer enabled。設定檔不存在時 verifier 報告 skip，維持未啟用此選配功能之 generic target 相容性。

替代方案是 verifier hardcode `Yishow`；拒絕原因是無法驗證其他 operation-time inputs。

### repo-local skill 是 AI 執行入口而非文件複本

建立 `.agents/skills/pi5-deployment`。`SKILL.md` 保留觸發語句、決策順序、安全界線、標準 command shape 與 completion gates；詳細硬體/維修背景仍指向 `deploy.md` 與 `docs/ops/conventions.md`。skill 不保存 credentials、IP 或過時 live state。

替代方案是把 `deploy.md` 全文搬入 skill reference；拒絕原因是製造第二份會漂移的部署真相來源。

## Implementation Contract

### Behavior

- 使用 hotspot options 執行 one-key update 時，遠端 bootstrap 在應用替換完成前後皆不得主動切換 active Wi-Fi。
- 成功部署後，指定 profile 必須為 autoconnect，priority 必須等於輸入值；trigger helper、service、timer 與 env 必須存在，timer 必須 enabled。
- 下一次重開機時，若多個 remembered Wi-Fi 在初次選網時同時可見，較高 priority 的 `Yishow` 應由 NetworkManager 優先；若 `Yishow` 稍後才可見，timer 應透過既有 trigger helper 切換，journal 必須能區分這兩條成功路徑。
- 失敗於 profile 不存在、priority 非整數、安裝檔缺失或 systemd enable 時，helper 必須 nonzero，bootstrap 不得聲稱 hotspot policy 成功。
- skill 必須要求部署前工作樹/版本/target probes、完整 local verification、verified backup、release identity、reboot witness、service/health/kiosk/thermal/Wi-Fi checks，並將 unrelated runtime blockers分開回報。

### Interface and data

- one-key CLI options: `--hotspot-connection-id <name>`, `--hotspot-scan-ssid <ssid>`, `--hotspot-priority <integer>`。
- target helper CLI: `configure-hotspot-priority.sh --connection-id <name> --scan-ssid <ssid> --priority <integer>`。
- env file keys: `HOTSPOT_CONNECTION_ID`, `HOTSPOT_SCAN_SSID`, `HOTSPOT_PRIORITY`。
- priority example: connection `Yishow`, SSID `Yishow`, priority `100`。

### Acceptance criteria

- `node --test scripts/deploy.test.mjs` 涵蓋 helper idempotency/failure、bundle contents、one-key argument forwarding、bootstrap ordering、verifier contract 與 skill required gates。
- skill 通過 skill-creator 的 `quick_validate.py`，且 `agents/openai.yaml` 與 SKILL.md 一致。
- `pnpm verify` 全部通過。
- live Pi update 後，`nmcli` 顯示 `Yishow` autoconnect yes 與 priority 100，timer enabled；重開機 journal 證明 `Yishow` 在初次選網時可見便為第一個成功 wlan0 activation，或在稍晚可見時由 trigger 從 fallback 自動切換；kiosk verifier 與 health 均通過。

### Scope boundaries

- In scope: hotspot priority、trigger installation/enablement、one-key plumbing、verification、repo-local skill 與現場 deployment witness。
- Out of scope: Wi-Fi secret rotation、NetworkManager global policy、移除 fallback profiles、Tailscale control-plane settings、MQTT/playback資料修復。

## Risks / Trade-offs

- [Hotspot 可見但沒有 internet 時仍可能先被選中] → 保留其他 profiles 作為 fallback，trigger 不執行 `con down`，並在 skill 要求 Tailscale/health witness。
- [timer 在重開機後切換網路使舊 IP SSH 中斷] → 所有驗證使用 operation-time target/Tailscale address，並在 skill 明列重新等待 reachability。
- [profile 名稱與 SSID 大小寫不同] → connection id 與 scan SSID 分開輸入並逐一驗證。
- [部署 skill 與文件漂移] → skill 只保存 AI 執行契約，詳細背景仍讀 repo canonical docs；deploy test 斷言 skill 的必要 gates。

## Migration Plan

1. 本地完成 focused deploy tests、skill validation 與 `pnpm verify`。
2. 對現行 Pi 以 `Yishow` / `Yishow` / `100` 執行 update，保留 verified backup 路徑。
3. 確認設定與 timer enabled 後重開機。
4. 等待 SSH/Tailscale 回線，驗證初次可見時的優先 activation，或稍晚可見時由 trigger 從 fallback 自動切換，並驗證 release、service、health、kiosk 與 thermal contract。
5. 回滾時將 `Yishow` priority 還原為 0、disable timer、還原 prior application archive；runtime restore 只有 operator 明確決定時才執行。

## Open Questions

無。
