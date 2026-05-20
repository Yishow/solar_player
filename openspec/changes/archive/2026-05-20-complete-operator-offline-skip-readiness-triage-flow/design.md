## Context

`Offline Error`、`Device Status`、`Playback Settings` 都已各自接到部分 display fault 資訊，但目前的 fault surfaces 是分散的：Offline 頁知道 fallback、Playback Settings 知道 skip、Device Status 知道 readiness alerts。操作者若要排查「哪一頁為什麼沒播」，仍需要自己跨頁比對。這表示 fault signals 已存在，但 triage flow 尚未完成。

## Goals / Non-Goals

**Goals**

- 讓 operator 能從 offline / skip / readiness 訊號一路追到受影響頁面與下一個治理入口。
- 讓不同 management surfaces 對同一個 display fault 使用一致語意。
- 補齊 triage regression coverage。

**Non-Goals**

- 不重寫 readiness、rotation plan 或 offline routing 判定邏輯。
- 不新增外部告警系統。

## Decisions

### Use a shared triage summary across Offline, Device Status, and Playback Settings

三個 fault surfaces 應共享同一組可追因摘要：受影響頁面、主導 fault reason、目前 skip / blocking 狀態、以及下一個建議治理入口。這樣操作者不必再自己把三頁資訊拼起來。

### Surface next-step destinations alongside blocking reason

display fault 不該只停在「發生了問題」。每個可見 fault summary 都應指出下一個最相關的管理入口，例如 `MQTT Settings`、`Circuit Settings`、`Display Pages Editor` 或 `Playback Settings`。

## Implementation Contract

- Behavior: 當 display 發生 offline、skip、或 readiness blocking 時，`Offline Error`、`Device Status`、與 `Playback Settings` SHALL 能指出受影響頁面、主導原因、以及下一個建議治理入口。
- Interface / data shape: 共享 triage summary SHALL 至少包含 page list、主導 reason、fault kind、以及 repair destination label；各頁可用不同呈現方式，但不得改變核心語意。
- Failure modes: 若某 fault 缺少 repair destination，頁面仍可顯示 global guidance，但不得把 fault 假裝成已可定位的單一修復步驟。
- Acceptance criteria: 對應 view-model tests 與 integration tests SHALL 覆蓋 MQTT 缺值、slot binding 缺失、stale runtime、以及 unpublished page 等 fault 對 triage summary 的輸出。
- Scope boundaries: 本 change 只完成 triage surface，不改寫 fault 判定引擎本身。

## Risks / Trade-offs

- [Risk] triage summary 過度抽象，反而掩蓋原始 fault → Mitigation: 保留原始 reason 文案，triage 只補上頁面與治理入口。
- [Risk] 各頁對 same fault 呈現不一致 → Mitigation: 以共享 summary shape 驅動三個 surface。
