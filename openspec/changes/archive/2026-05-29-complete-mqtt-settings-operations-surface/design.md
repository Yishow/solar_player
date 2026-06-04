## Context

`MQTT Settings` 目前已整合 broker mode、topic mappings、runtime preview、coverage findings、weather settings 與 header preview，功能面其實相當完整。但頁面仍保留一個明顯缺口：資訊階層仍以 flat rows + side card 為主，operators 很難一眼看出哪一組 mappings 正在影響哪個 display story、哪個 section 有 draft changes、目前應先處理 broker、coverage 還是 weather。

## Goals / Non-Goals

**Goals:**

- 把 `MQTT Settings` 收斂成真正的 operations workspace，而不是功能很多但閱讀成本高的長頁表單。
- 保留 broker/runtime/save/coverage 的高風險 state readability。
- 讓 weather configuration 與 header preview 變成同一個 effective shell contract，而不是旁邊另一張獨立小表單。

**Non-Goals:**

- 不改寫 MQTT broker protocol、socket streaming contract 或 weather data source backend。
- 不把 `MQTT Settings` 擴大成通用 telemetry builder。
- 不拆分成多個 routes；仍保留單頁工作台模式。

## Decisions

### Keep the three-column workspace but add section-level operations guidance

現有三欄結構有其價值：broker、topic workspace、weather。這個 change 不推翻三欄，而是為每一欄補上 section-level summary、draft/save scope 與 action hierarchy，讓 operators 先理解哪一區正在阻塞 display surface，再進入細節 rows。

### Group topic workspace by display impact rather than treating every row as a flat mapping

topic rows 將保留可編輯性，但資訊組織需要更接近 display impact：哪些 rows 屬於相同 metric family、影響哪些 display stories、哪些只是 idle runtime、哪些是 mapping gap。這樣 coverage triage 才不會淹沒在一長串 topic inputs 裡。

### Make weather preview an effective shell contract instead of a detached side form

weather configuration 不是單純 settings 附件，它會直接影響 management/playback shell metadata。因此 weather card 應把 current effective header outcome、preset/custom field choice、station/county validity 與 draft state 放在同一個 contract 內呈現。

## Implementation Contract

**Behavior**

- `MQTT Settings` SHALL 讓 operators 快速辨識 broker state、topic coverage state、runtime freshness、weather header outcome 與 unsaved scopes。
- topic workspace SHALL 呈現 row-level editability 與 section-level display impact，不只是平鋪 mappings。
- weather settings SHALL 清楚呈現有效 header preview 與 validation feedback，讓 operators 知道儲存後會影響什麼 shell metadata。
- high-risk feedback such as broker disconnected, idle runtime, mapping gap, connection-test result, and save state SHALL remain explicit and visually distinct.

**Interface / data shape**

- topic workspace data SHALL 能表示 metric family、display impact summary、runtime tone、coverage state 與 row-level draft state。
- weather preview contract SHALL 表示 enabled state、location mode, resolved location validity, preset/custom field selection, and effective preview text.

**Failure modes**

- 若 topic workspace 仍是 flat rows，無法快速辨識 display impact 與 coverage priority，視為未完成。
- 若 weather preview 仍像獨立附屬卡，無法回答「這組設定會怎麼改變 header」，視為未完成。
- 若 token alignment 讓 broker/runtime/save 狀態更難辨識，視為 regression。

**Acceptance criteria**

- mqtt settings tests 能驗證 runtime feedback、coverage grouping、weather preview feedback 與 section-level status readability。
- manual review 能直接回答「哪一頁缺 mapping」「哪筆 topic 只是 idle」「現在 header 會顯示什麼」「哪一區還沒存」。

**Scope boundaries**

- 本 change 補齊 operations surface 與 guidance，不重寫 backend streaming/data contracts。
- 單頁工作台模式保留，不新增新的 management route。

## Risks / Trade-offs

- [grouping 後降低直接編輯速度] → 保留 inline row editing，不把 rows 收進過深的 drilldown。
- [section summary 太多，反而更吵] → 只把 display impact、runtime state、draft scope 做成 first-class summary，其餘留在 rows。
- [weather card 過度耦合 shell detail] → 聚焦 operator-visible header outcome，不把整個 shell config 曝露成低階欄位。
