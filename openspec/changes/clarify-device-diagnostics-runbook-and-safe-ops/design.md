## Context

`Device Status` 已經能顯示 host health、display diagnostics summary 與兩個 safe actions，但 operator 真正遇到故障時，仍需要知道「接下來該去哪裡修」。目前有些資訊散在 API stub message、triage summary 與 README 片段中，卻沒有形成一套可直接遵循的 safe-ops runbook。這對單機 demo 可能還能應付，但在實際 kiosk / mini PC 維運時會變成認知落差：有些人會把 stub API 當成正式裝置控制，有些人則不知道何時應該轉到 systemd 或部署層處理。

## Goals / Non-Goals

**Goals:**

- 明確定義 diagnostics 可做與不可做的操作邊界。
- 讓 `Device Status` 與 API summary 能直接指出後續修復目的地與 escalation path。
- 提供 repo 內可查閱的 runbook 文件，對齊 deploy / systemd 的現況假設。

**Non-Goals:**

- 不提供真正的裝置重開機或 system command 執行能力。
- 不引入新的 auth / RBAC 模型。
- 不讓文件描述超出 repo 現況的部署平台或維運工具。

## Decisions

### Decision: Represent dangerous device controls as explicit unsupported operations

對於 reboot、cache clear 這類不應在 app 內直接執行的操作，系統 SHALL 以明確 unsupported / host-runbook guidance 表達，而不是維持模糊 stub。這能避免 operator 誤把 HTTP route 當成正式裝置控制面。

替代方案是保留現狀不變。那雖然短期少改，但會持續放任語意模糊，因此不採用。

### Decision: Keep diagnostics actions scoped to safe read or refresh flows and document the escalation path beside them

`refresh-readiness`、`export-summary` 這類 actions 仍屬 safe operations，但 UI 與 API summary SHALL 同時附上它們不能取代的 host-level處置，例如 `systemctl restart solar-display`。這樣 operator 在同一個 surface 就能知道邊界。

替代方案是只把 runbook 放在 docs，不在 UI/summary 暴露。那會讓現場維運必須跳出頁面查文件，成本太高，不採用。

### Decision: Put the operator runbook in repo docs and point to real deploy assumptions

runbook SHALL 放在 repo docs，且內容只描述目前確實存在的 deploy / systemd 假設，例如 `deploy/solar-display.service` 與 `systemctl restart solar-display`。這樣文件能被 code review 與版本控管，也不會發明不存在的平台。

替代方案是只靠對話或外部 wiki。那不屬於 repo 內 source of truth，因此不採用。

## Implementation Contract

- Behavior:
  - `Device Status` 會顯示 diagnostics actions 的 safe scope 與必要時的 escalation destination。
  - unsupported device controls 回傳明確 guidance，不假裝成成功執行。
  - runbook 可描述常見 triage path：檢查 MQTT、檢查 publish/draft、檢查資產健康、必要時走 systemd restart。
- Interface / data shape:
  - shared diagnostics summary 可新增 safe-ops guidance / escalation metadata，供 UI 與 API 共用。
  - README / docs index 需能導向新的 runbook 檔案。
- Failure modes:
  - 若 runbook 對應的 deploy 假設未命中某環境，UI 仍以「需主機層處理」表達，不回傳誤導性的成功訊息。
  - diagnostics summary 若載入失敗，現有 error handling 保留，但不得把 unsupported operation 誤標成可用。
- Acceptance criteria:
  - server / web tests 覆蓋 unsupported operation guidance 與 safe diagnostics metadata。
  - docs review 可直接找到 diagnostics safe-ops runbook 與 systemd escalation path。
  - `spectra analyze`、`pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test` 通過。
- Scope boundaries:
  - In scope: diagnostics safe-ops metadata、unsupported-op guidance、repo runbook docs。
  - Out of scope: actual reboot/cache purge execution、external wiki、new deploy platform assumptions。

## Risks / Trade-offs

- [Risk] 文件與實際 deploy 假設 drift。 → Mitigation: 只引用 repo 已存在的 `deploy/solar-display.service` 與目前 route behavior。
- [Risk] UI guidance 太多，干擾日常使用。 → Mitigation: 把 runbook guidance 聚焦在 action panel / degraded states，而不是整頁大段說明。
- [Risk] unsupported route 若改名或移除，runbook 與測試會失效。 → Mitigation: 在 spec 與 tests 裡固定安全邊界，而不是綁死具體 stub 文案。
