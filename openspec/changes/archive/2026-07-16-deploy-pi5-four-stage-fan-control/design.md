## Context

Pi 5 目前由 Linux `pwm-fan` cooling device 與 `step_wise` thermal governor 自動調速。實機的 `/boot/firmware/overlays/README` 定義四組 base-device-tree 參數，現場量測亦確認 PWM 75/125/175/250 約對應 1710/2986/4121/5592 RPM。repo 尚未把這些值寫入 deploy contract；部署文件也同時保存多個歷史 LAN/Tailscale 位址，導致文件不是可靠的連線入口。

這項變更橫跨 boot configuration、kiosk installer、verification、bundle contract 與 operator documentation，因此需要明確設計與 reboot 驗證邊界。

## Goals / Non-Goals

**Goals:**

- 讓每次 Pi 5 kiosk install 都以可重跑方式寫入已驗證的四檔 thermal profile。
- 讓 deploy bundle 與 kiosk verification 對 helper、boot values 及 runtime thermal state fail closed。
- 讓所有 Raspberry Pi 連線範例使用單一 operation-time target，不再保存專案 Pi 固定 IP。
- 在現場 target 完成一次部署、reboot 與 post-reboot verification。

**Non-Goals:**

- 不建立常駐 fan systemd service，不持續強寫 `cur_state` 或停用 kernel thermal governor。
- 不提供任意可調 UI、API、環境變數或多套 fan profile。
- 不變更 MQTT broker 等非 Raspberry Pi target 的 dependency address。
- 不替 Tailscale 指定 control-plane IP，也不重做既有 Tailscale 安裝 change。

## Decisions

### Use a managed boot-config block before dtoverlay

新增 `deploy/configure-pi5-fan-control.sh`，以固定 marker 管理完整 block，將 12 個 `dtparam=fan_temp*_...` 值放在第一個 `dtoverlay=` 之前。重跑時先移除舊 managed block 再插入一份；沒有 managed block 時插入，其他內容逐行保留。這符合實機 overlay README 對 base-device-tree parameter ordering 的限制。

替代方案是只依賴韌體預設值；拒絕原因是換映像或韌體後無法由 repo 證明四檔仍一致。另一替代方案是 systemd 在開機後寫 `cur_state`；拒絕原因是 `step_wise` governor 會覆蓋手動 state，且會形成兩個控制來源。

### Integrate thermal configuration through kiosk installation and verification

`deploy/install-kiosk.sh` 在 final health verification 前呼叫同 bundle 的 fan helper。Pi 5 上 config 缺失、不可寫或 helper 失敗均中止 installer；非 Pi 5 明確輸出 not applicable 並成功返回。`deploy/verify-kiosk-install.sh` 在 Pi 5 上同時檢查 managed block、`pwm-fan`、`max_state=4`、thermal mode/policy 與四個 active trip points；任一不一致計入既有 failure aggregation。

`deploy.sh` 的 required bundle tree 納入 helper，避免 source 有檔案但 bundle 遺漏。installer 不自動 reboot，因為部署工具不可在未交代的時間切斷現場顯示；文件與 live rollout 明確安排 reboot 後再跑 verification。

### Keep connection targets operation-scoped

`deploy.md` 與 `docs/runbooks/raspi-onekey-kiosk-deploy.md` 先要求操作者設定 `PI_HOST` / `SSH_TARGET`，後續 SSH、one-key deploy、RDP、health 與 reboot checks 全部重用該值。歷史 Pi target 位址與 current-target 清單從可複製命令及操作敘述移除；當次聊天提供的 target 只用於 live command，不寫回 repo。

MQTT broker address保留並標記為 dependency configuration，避免把「不固定 Pi target」誤解成刪除部署所需 broker default。

### Test the managed block and wiring through deploy fixtures

依 `.spectra.yaml` 採 TDD。先在 `scripts/deploy.test.mjs` 加入失敗測試：temporary model/config fixture 驗證插入位置、12 個值、重跑單一 block、unrelated lines 保留、非 Pi 5 no-op、Pi 5 config failure；bundle fixture 驗證 helper 必需且可執行；source contract fixture 驗證 installer/verification wiring；documentation fixture 拒絕 Raspberry Pi target 的 numeric fixed-IP SSH/RDP/health examples。

helper 提供僅供明確呼叫的 model/config path override，預設仍固定使用 `/proc/device-tree/model` 與 `/boot/firmware/config.txt`。override 只改測試 seam，不引入 profile configurability。

## Implementation Contract

**Observable behavior**

- `sudo ./deploy/configure-pi5-fan-control.sh` 在 Raspberry Pi 5 上建立或更新一份 `# BEGIN Solar Player Pi 5 fan control` 到 `# END Solar Player Pi 5 fan control` managed block。
- managed block 必須包含 temperature `50000,60000,67500,75000`、每檔 hysteresis `5000`、PWM `75,125,175,250`，且位於第一個 `dtoverlay=` 前。
- 未變更時輸出 profile already configured；有變更時輸出 reboot required。錯誤輸出包含失敗 config path 並以 nonzero 結束。
- 非 Pi 5 輸出 not applicable，boot config 不變，exit 0。
- kiosk installer 必須在結束前執行 helper；helper failure 不得被 `|| true`、warning 或後續 health success 吞掉。
- kiosk verification 在 Pi 5 上以既有 `OK:` / `FAIL:` 聚合格式報告 boot profile 與 runtime thermal checks。
- 文件先設定當次 target，再重用同一變數；不得包含專案 Pi 的 numeric fixed target。當次 live 部署只使用操作者提供的 target，不將該值寫入 repo 文件。

**Interfaces and files**

- helper CLI：無參數時使用實機預設路徑；測試可透過明確 path override 指向 temporary model/config fixture。
- managed block 是唯一新增持久格式；不得修改 block 外的 boot config。
- runtime verification 讀取 `/sys/class/thermal` 與 `/sys/class/hwmon`，不得寫入 `cur_state`、`mode` 或 PWM。

**Failure modes**

- Pi 5 config 缺失、不可寫、managed block 無法安全渲染或原檔無法原子替換：helper nonzero，installer nonzero。
- Pi 5 runtime 缺少 `pwm-fan`、`max_state` 不是 4、thermal mode/policy 不符或 trip points 不符：verification nonzero。
- 非 Pi 5：清楚 skip，不視為 deployment failure。
- boot config 已更新但尚未 reboot：verification 若 runtime 不符即失敗並由文件指示 reboot；不得假裝 persistence 已驗證。

**Acceptance criteria**

- `node --test scripts/deploy.test.mjs` 通過新增與既有 deploy tests。
- `pnpm verify` 通過 build、server、web、deploy、server-runner 全部 stages。
- `spectra analyze deploy-pi5-four-stage-fan-control --json` 無 Critical/Warning，`spectra validate deploy-pi5-four-stage-fan-control` 通過。
- live target 依序完成 helper/install deployment、`sudo reboot`、重新連線，以及 `sudo env KIOSK_USER=kz /data/solar-display/deploy/verify-kiosk-install.sh`；最後 runtime 顯示 `mode=enabled`、`policy=step_wise`、`pwm-fan max_state=4` 與四個約定 trip points。

**Scope boundaries**

- In scope：helper、bundle/installer/verification wiring、兩份 canonical deployment docs、deploy tests、當次 Pi 5 live rollout。
- Out of scope：前端設定頁、server API、SQLite/MQTT、常駐 fan daemon、動態 profile、Tailscale enrollment 與 IP allocation。

## Risks / Trade-offs

- [boot config 排序錯誤導致參數未生效] → managed block 固定插在第一個 `dtoverlay=` 前，並以 fixture 與 reboot runtime trip points 雙重驗證。
- [重跑破壞操作者自訂 config] → 只取代 marker 範圍，測試 unrelated lines byte-order 保留。
- [非 Pi 5 target 被不必要阻斷] → model detection 明確 skip；只有辨識為 Pi 5 後才 fail closed。
- [部署後立即驗證因尚未 reboot 失敗] → installer 驗證 managed boot profile；完整 runtime persistence gate 明確放在 controlled reboot 後，文件不得把 pre-reboot 結果描述為完成。
- [文件仍殘留歷史 target] → deploy test 掃描 SSH/RDP/health/reboot command contexts，禁止 numeric project target。

## Migration Plan

1. 部署新版 bundle 到操作者當次提供的 SSH target；installer 寫入 managed block。
2. 確認服務與 boot config，執行一次 controlled reboot。
3. 重新連線並執行 kiosk verification 與 thermal sysfs witness。
4. 若 reboot 後異常，從 boot config 移除 Solar Player managed block並 reboot，即回復平台預設四檔；應用 runtime 與資料不受影響。

## Open Questions

無。四檔值、當次 live target、是否納入部署流程與文件 IP-neutral 原則皆已由本次需求與實機證據確定。
