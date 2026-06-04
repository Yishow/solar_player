## Context

`Device Status` 已經同時提供 host telemetry、display operations summary、readiness alerts、display client liveness、recent logs、safe diagnostics actions 與 safe-ops guidance，但這些內容目前同時出現在 page-local dashboard 卡片與大量 generic `mgmt-status` 區塊裡。首屏能看到的決策資訊與較深層的 triage/runbook 資訊還沒有形成清楚優先序，因此頁面更像多個能力的堆疊，而不是完成的 observability surface。

## Goals / Non-Goals

**Goals:**

- 讓 `Device Status` 成為 summary-first 的 observability dashboard，而不是一般 settings 頁延伸。
- 補齊 safe diagnostics、runbook escalation、client liveness、logs triage 的資訊優先序與 actionability。
- 保留 truthful telemetry、bounded controls、management read boundaries。

**Non-Goals:**

- 不把 `Device Status` 變成 device-control console。
- 不引入危險的 reboot/power/network mutation flows。
- 不重寫 telemetry backend 或 logs storage model，除非是 action result surface 所需的最小 metadata。

## Decisions

### Keep device status as a dedicated dashboard family

`Device Status` 會和 settings family 共用基礎 token，但保持自己的 dashboard density 與 summary rhythm。這能避免把 telemetry、liveness、logs、alerts 塞成一堆相似的小表單區塊，也能讓 operators 先看到最重要的決策資訊。

### Promote next-action guidance before deep diagnostics detail

頁面需要先回答「現在健康嗎」「是哪一類問題」「我下一步該做什麼」。因此 runbook guidance、safe diagnostics、host-level escalation 應升格成 first-class region，而不只是深層補充說明。

### Surface safe-ops results and escalation context as first-class panels

目前 diagnostics actions 與 logs/export metadata 雖然存在，但結果回饋與 escalation context 仍不足。新的設計要求 action result、safe scope、last result context、runbook entry 都成為可掃讀 surface，避免 operators 只看到按鈕卻不知道按了會得到什麼、失敗後該去哪裡。

## Implementation Contract

**Behavior**

- `Device Status` SHALL 以 summary-first dashboard 呈現 host health、display operations health、liveness, diagnostics, logs, and runbook guidance。
- 頁面 SHALL 讓 operators 區分 telemetry facts、display-operation alerts、safe diagnostic actions、host-level escalation guidance。
- diagnostics actions SHALL 顯示 truthful safe scope、result context、and next-step guidance without implying unsupported device control was executed.

**Interface / data shape**

- status dashboard data SHALL 表示 top-level health summaries、alert groups、client liveness summaries、log summaries、diagnostic action descriptors、runbook guidance entries。
- diagnostic action result surface SHALL 表示 action name、safe scope、result tone、result detail、and timestamp or equivalent server-side context.

**Failure modes**

- 若 page 仍依賴大量 generic `mgmt-status` blocks 呈現核心 triage 區，視為 observability surface 未完成。
- 若 runbook / escalation guidance 仍無法在首輪 triage 中被看見，視為未完成。
- 若 UI 暗示 unsupported reboot/device control 已在 app 內執行，視為重大 regression。

**Acceptance criteria**

- device-status tests 能驗證 summary hierarchy、diagnostic result surface、runbook guidance visibility 與 safe-scope truthfulness。
- manual review 能直接回答「這是 host 問題還是 display 問題」「我現在能安全做什麼」「何時要升級到 host-level runbook」。

**Scope boundaries**

- 本 change 補 observability surface completeness，不新增危險控制能力。
- logs/diagnostics backend contract 只做支援結果表達的最小補強。

## Risks / Trade-offs

- [dashboard summary 太強，深層資料被藏太深] → 保留 summary-first，但讓 logs/liveness/alerts 可沿著單一路徑展開。
- [runbook guidance 變成靜態說教] → 與 safe diagnostics result surface 綁在一起，直接回答下一步。
- [與 settings family 過度分離，失去產品一致性] → 共用底層 token，但維持獨立 dashboard density。
