## Context

`MQTT Settings` 目前能顯示 broker 設定、topic mappings、最近收值與 readiness finding，但 topic runtime preview 主要靠 polling。這對現場排查仍然可用，卻不夠即時，也讓 readiness feedback 與 runtime preview 之間存在時間差。這頁要成為真正的調試面，需要更接近事件驅動的 operator feedback。

## Goals / Non-Goals

**Goals**

- 讓 `MQTT Settings` 更即時地反映 topic runtime preview。
- 對齊 topic 收值、broker 狀態與 readiness finding 的 operator feedback。
- 補齊對應 regression tests。

**Non-Goals**

- 不新增新的 broker 管理功能。
- 不重寫 MQTT ingestion core model。

## Decisions

### Drive MQTT runtime preview from live updates instead of coarse polling

頁面仍可保留必要的 bootstrap reload，但 topic runtime preview 應優先由 live updates 驅動，而不是完全依賴固定 polling interval。這能降低排查延遲，也讓 operator 更容易把 topic 收值與 readiness 狀態對上。

### Keep readiness feedback aligned with streamed topic state

streamed runtime preview 若和 readiness finding 各走各的，就會讓頁面更混亂。兩者應共享同一組 operator feedback 語意：topic 有沒有活、對應 mapping 是否足夠、目前是否支撐 display readiness。

## Implementation Contract

- Behavior: `MQTT Settings` SHALL 以近即時方式更新 topic runtime preview 與 broker 收值狀態，並讓 readiness feedback 反映最新可用 runtime 資訊。
- Interface / data shape: 頁面 SHALL 能消費 live topic updates 或等價的近即時輸入，同時保留現有 mappings 與 readiness response shape 的安全邊界。
- Failure modes: 若 live updates 不可用，頁面可退回 bootstrap/poll fallback，但必須顯示較慢或 unavailable 的狀態，而不是假裝即時。
- Acceptance criteria: `apps/web/src/pages/MqttSettings/viewModel.test.ts` 與相關頁面測試 SHALL 覆蓋 live update、poll fallback、broker disconnected、topic idle、以及 readiness refresh 情境。
- Scope boundaries: 本 change 只強化 operator preview/feedback，不擴成新的 MQTT feature set。

## Risks / Trade-offs

- [Risk] live update 與 bootstrap reload 同時作用造成狀態競爭 → Mitigation: 定義單一更新優先序，讓 runtime preview merge 可預測。
- [Risk] readiness finding 變得太頻繁 → Mitigation: 只在 relevant topic/runtime state 改變時刷新對應 feedback。
