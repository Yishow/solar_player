## Summary

讓 Raspberry Pi 5 在 thermal governor 啟動後即維持既有最低風扇檔，避免低於 50°C 時風扇完全停止，同時保留 kernel `step_wise` 自動升速。

## Motivation

目前四檔 profile 的第一個 active trip 是 50°C，因此一般待機溫度下 `pwm-fan` 會停在 state 0。展示機需要開機後最晚約 20 秒進入最低檔持續散熱，但不需要第五檔或精準延遲 timer。

## Proposed Solution

- 將第一個 active trip 從 50000 m°C 改為 0 m°C，保留 hysteresis 5000 m°C 與 PWM 75。
- 保留其餘 60000、67500、75000 m°C 三個升速門檻及 PWM 125、175、250。
- 擴充部署 fixture 與 kiosk verification，驗證 boot profile、runtime trip points，以及啟動後最低 cooling state。
- 部署到操作者當次指定的 SSH target，重開機後在 20 秒 gate 內驗證 state 1 與實際 RPM。

## Non-Goals

- 不新增第五個 cooling state。
- 不新增 fan daemon、systemd timer 或週期性寫入 `cur_state` 的服務。
- 不停用或取代 Linux `step_wise` thermal governor。
- 不變更 MQTT、Tailscale 或應用資料設定。

## Alternatives Considered

- 開機 20 秒後執行一次 `cur_state=1`：kernel governor 仍可能覆寫，不能形成可靠最低檔契約。
- 常駐服務強制最低 state：可保證 floor，但會與 kernel governor 形成雙寫者，複雜度與風險不必要。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `pi5-fan-thermal-control`: 第一個 cooling trip 改為 always-active baseline，並新增重開機後最低檔與 RPM 驗證契約。

## Impact

- Affected specs: `pi5-fan-thermal-control`
- Affected code:
  - Modified: `deploy/configure-pi5-fan-control.sh`
  - Modified: `deploy/verify-kiosk-install.sh`
  - Modified: `scripts/deploy.test.mjs`
  - Modified: `deploy.md`
  - Modified: `docs/runbooks/raspi-onekey-kiosk-deploy.md`
