## Context

Pi 5 目前由 firmware 建立四個 active thermal trips，Linux `step_wise` governor 控制 `pwm-fan` states 0..4。第一個 trip 為 50000 m°C，故待機溫度低於門檻時 cooling state 為 0。操作者要求開機後最晚約 20 秒維持既有最低檔，但不新增檔位。

## Goals / Non-Goals

**Goals:**

- 讓正溫度範圍內的 Pi 5 thermal zone 在 governor 啟動後以 state 1 / PWM 75 為最低檔。
- 保留 state 2..4 的 60000、67500、75000 m°C 升速行為。
- 讓 kiosk verification 同時證明 boot profile、active trips、最低 cooling state 與實際 RPM。
- 完成實機 reboot witness，從 SSH 恢復起算在 20 秒內觀察最低檔運轉。

**Non-Goals:**

- 不新增第五個 state、fan daemon、systemd timer 或週期性 `cur_state` writer。
- 不停用 `step_wise` governor，也不直接覆寫 thermal mode/policy。
- 不變更 MQTT、Tailscale、桌面或應用資料設定。

## Decisions

### Use an always-active first thermal trip instead of a userspace timer

將 `fan_temp0` 設為 0 m°C，保留 `fan_temp0_hyst=5000` 與 `fan_temp0_speed=75`。正常運作中的 CPU 溫度高於 0 m°C，thermal governor 因此以 state 1 為 floor；負的解除門檻在實際 Pi CPU 溫度範圍不會觸發。相比一次性寫 `cur_state`，此方案只有 kernel governor 一個 writer。

### Verify both requested state and physical fan motion

runtime contract 除了 `pwm-fan max_state=4`、`enabled/step_wise` 與 trips，還要找到同一平台暴露的 fan RPM，證明 `cur_state` 至少為 1 且 RPM 大於 0。fixture 使用可覆寫 thermal/hwmon class paths，實機仍固定讀 `/sys/class/thermal` 與 `/sys/class/hwmon`。

### Keep deployment and rollback inside the existing managed block

installer 繼續透過既有 helper 原子更新唯一 managed block。rollback 是把第一個 trip 恢復 50000 m°C、重新部署並 reboot；不引入另一份 service lifecycle。

## Implementation Contract

**Observable behavior**

- managed block 的四組 `(temperature, hysteresis, PWM)` 為 `(0,5000,75)`、`(60000,5000,125)`、`(67500,5000,175)`、`(75000,5000,250)`。
- Pi 5 reboot 後仍為 `mode=enabled`、`policy=step_wise`、`pwm-fan max_state=4`。
- 正常正溫度下第一個 active trip 為 0 m°C，cooling `cur_state >= 1`，fan RPM 大於 0。
- kiosk verification 任一 boot value、trip、state floor 或 RPM 不符時，以既有 `FAIL:` aggregation nonzero 結束。

**Test seams**

- fan helper 沿用 `--model-path` 與 `--config-path`。
- kiosk verification 新增明確 hwmon class path override，與既有 model、boot config、thermal class fixture 組合測試。

**Failure modes**

- 找不到 `pwm-fan`、state 仍為 0、找不到可讀 fan RPM 或 RPM 為 0，Pi 5 verification 必須失敗。
- 非 Pi 5 維持明確 skip，不因 hwmon fixture 缺失失敗。

**Acceptance criteria**

- targeted RED 證明舊 50000 profile 與 state 0/RPM 0 無法滿足新契約；GREEN 後 fixture 通過。
- `node --test scripts/deploy.test.mjs`、`pnpm verify`、Spectra analyze/validate 通過。
- 實機部署、reboot、重新連線後 20 秒內觀察 `cur_state >= 1`、RPM > 0、四個 trips 正確且 `/health` 正常。

**Scope boundaries**

- In scope：fan helper、kiosk verification、deploy fixture、兩份部署文件與本次 live rollout。
- Out of scope：userspace fan service、動態 profile、MQTT/Tailscale/桌面狀態。

## Risks / Trade-offs

- [0 m°C trip 被 firmware 或 kernel 拒絕] → fixture 只證明格式，最終以 reboot 後 sysfs trip 0 與 state/RPM witness 為 gate；失敗即 rollback 到 50000。
- [RPM path 因 hwmon 編號不同而漂移] → 依 `name`/fan input 掃描所有 hwmon devices，不固定 `hwmonN`。
- [最低檔增加噪音與耗電] → 使用既有最低 PWM 75，不新增更高 baseline；這是操作者明確選擇。

## Migration Plan

1. 以 one-key update 部署新 managed block並確認 reboot required。
2. controlled reboot，從 SSH 恢復起算輪詢 20 秒內的 state 與 RPM。
3. 執行完整 kiosk verification 與 health check。
4. 若 trip/state/RPM gate 失敗，恢復第一個 trip 50000、重新部署並 reboot。

## Open Questions

(none)
