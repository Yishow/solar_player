# Settings / Status Design-Token Alignment Roadmap

## Purpose

這份 roadmap 的目的，是把 `/settings/playback`、`/settings/images`、`/settings/mqtt`、`/settings/circuits`、`/slideshow-preview`、`/device-status` 收斂成一致但不扁平化的 display-ops product family：共享 design-token 與 surface primitive，同時補齊目前仍未完成的功能工作流與 triage affordance。

## Assumptions

- `/settings/assets` 與 `/shell-decorations/editor` 繼續維持 compatibility handoff，不恢復成第一層主導航。
- 這次 roadmap 的主軸是 management surface completeness，不重寫 display runtime engine、MQTT protocol、或 device-control backend。
- `Device Status` 會共享底層 token，但保持自己的 observability dashboard family，不硬套一般 settings density。

## Current Audit

### Cross-page gap

- 現有 shared primitives 主要停在 `settings-card`、`mgmt-action`、`mgmt-status`、`mgmt-chip`，不足以支撐 preview boards、stat strips、table shells、dashboard summaries 的統一語言。
- `/settings/playback` 與 `/device-status` 仍大量依賴 route-local appearance 規則，與其餘 settings family 的收斂程度不一致。
- 多數頁面功能本身已經存在，但 surface hierarchy 不完整，導致 operators 很難快速判斷「現在哪裡出問題」「下一步該做什麼」。

### Per-page gap matrix

| Surface | 現況已具備 | 主要缺口 | 建議補法 | 對應 change |
| --- | --- | --- | --- | --- |
| `/settings/playback` | rotation registry、duration、display ops summary、live rotation preview | configured rotation 與 effective rotation 混在同一個 preview 區；page instance 治理不夠一眼可讀；和 `/slideshow-preview` 不是同一套 preview family | 拆成 configured board / effective board / skipped board，並共用 preview-status-action primitives | `align-playback-settings-and-slideshow-preview-ops-surfaces` |
| `/slideshow-preview` | current page、countdown、carousel、rotation debug context | 與 playback settings 沒有 shared surface language；QA/debug context 和 configured truth 沒有清楚呼應 | 讓它承接同一套 preview family，並顯式對照 effective rotation、skip 與 instance identity | `align-playback-settings-and-slideshow-preview-ops-surfaces` |
| `/settings/images` | playlist/runtime governance、editor handoff、asset health、references、cover/delete actions | focus/crop action disabled；同素材多筆 playlist row 只能編第一筆；references/delete blockers 結構太弱 | 補成 selected-asset deep-link handoff、multi-row governance、structured triage surfaces | `complete-image-management-governance-surface` |
| `/settings/mqtt` | broker、topic runtime、coverage、weather config、header preview | flat mapping rows 不易看出 display impact；section draft scopes 不夠明確；weather preview 還像附屬卡 | 保留三欄，但補 section summaries、display-impact grouping、effective header contract | `complete-mqtt-settings-operations-surface` |
| `/settings/circuits` | slot binding、threshold editing、readiness feedback、bulk save | raw data-entry grid 感太重；icon 邊界太弱；row-level impact/risk 藏在 caption | 保留 table-first，補 row impact summary、bounded icon authoring、threshold/risk semantics | `complete-circuit-settings-operations-surface` |
| `/device-status` | telemetry、display ops summary、alerts、client liveness、logs、safe diagnostics | 混用 dashboard 與 generic `mgmt-status` 語言；runbook/escalation guidance 不夠前置；action result surface 不完整 | 建立 observability dashboard family，提升 summary-first hierarchy 與 safe-ops/runbook panels | `complete-device-status-observability-surface` |

## Change Map

### 1. Foundation

- `establish-display-ops-surface-token-primitives`
- 目的：先抽出 operations / preview / status-dashboard 三層 semantic surface family，避免後續 page work 繼續各自長 appearance rules。
- 依賴：無。
- 必要性：所有後續 change 的共用底盤。

### 2. Preview Family

- `align-playback-settings-and-slideshow-preview-ops-surfaces`
- 目的：把 rotation governance 與 rotation validation 收成同一個 preview family。
- 依賴：foundation。
- 優先度：高，因為它是 settings family 中目前分裂最明顯的一組。

### 3. Governance Family

- `complete-image-management-governance-surface`
- 目的：讓 image governance 不再停在半完成的 handoff/workbench。
- 依賴：foundation。
- 平行性：可和 MQTT / Circuits 並行。

- `complete-mqtt-settings-operations-surface`
- 目的：讓 MQTT workspace 從 flat mappings page 升級成 display-impact-aware operations surface。
- 依賴：foundation。
- 平行性：可和 Image / Circuits 並行。

- `complete-circuit-settings-operations-surface`
- 目的：保留 bulk editing，但補齊 bounded authoring 與 row-level display impact。
- 依賴：foundation。
- 平行性：可和 Image / MQTT 並行。

### 4. Observability Family

- `complete-device-status-observability-surface`
- 目的：把 status page 收斂成 summary-first dashboard，並補齊 safe diagnostics / runbook escalation。
- 依賴：foundation。
- 建議排序：在 MQTT / Circuits 至少完成 spec 對齊後再實作，因為它會消費更多 display-ops / readiness / diagnostics surface semantics。

## Recommended Sequence

## 1. Foundation

- 完成 `establish-display-ops-surface-token-primitives`。
- 驗證基準：
  `tokens.css`、`management.css`、shared primitive tests、跨頁 surface audit。

## 2. Preview Surfaces

- 完成 `align-playback-settings-and-slideshow-preview-ops-surfaces`。
- 驗證基準：
  configured/effective split、instance-aware preview parity、`/settings/playback` vs `/slideshow-preview` witness review。

## 3. Operations Workspaces

- 先做 `complete-image-management-governance-surface`。
- 再平行或接續做 `complete-mqtt-settings-operations-surface` 與 `complete-circuit-settings-operations-surface`。
- 驗證基準：
  image multi-row governance、MQTT display-impact grouping、circuit row-level risk/readiness。

## 4. Status Dashboard

- 完成 `complete-device-status-observability-surface`。
- 驗證基準：
  first-fold summary hierarchy、safe-ops truthfulness、runbook escalation、alerts/liveness/logs triage readability。

## What Not To Do

- 不要再開一個 umbrella 實作 change 把六頁全部混在一起做。
- 不要把 `Image Management` 做回第二套 editor。
- 不要把 `MQTT` / `Circuits` 為了收 token 而退回 generic panel soup。
- 不要讓 `Device Status` 為了共享 token 而失去 dashboard 身分。

## Verification Strategy

- 每個 change 先跑 `spectra analyze <change>`，再跑 `spectra validate <change> --strict`。
- page-level implementation 階段至少保留對應 web tests：
  `PlaybackSettings`、`SlideshowPreview`、`ImageManagement`、`MqttSettings`、`CircuitSettings`、`DeviceStatus`。
- 每完成一組 family，使用 `agent-browser` 做 route witness：
  `/settings/playback` ↔ `/slideshow-preview`
  `/settings/images`
  `/settings/mqtt`
  `/settings/circuits`
  `/device-status`
- 對 `Device Status`、`MQTT`、`Circuits` 這些高風險頁，驗證重點不是畫面更漂亮，而是 state readability、triage 順序、safe guidance 是否更清楚。
