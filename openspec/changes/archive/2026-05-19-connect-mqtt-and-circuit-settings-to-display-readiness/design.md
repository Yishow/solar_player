## Context

`MqttSettings` 保存 broker 與 topic mappings，`CircuitSettings` 保存 circuit 基本設定，但兩者目前沒有明確告訴展示頁 readiness 是否成立。Overview、Solar、Factory Circuit 對資料的需求仍被分散在 view models 與 heuristics 中，導致配置缺口只有到展示頁或播放時才被發現。

## Goals / Non-Goals

**Goals:**

- 讓 MqttSettings 顯示展示頁 metric mapping 覆蓋率。
- 讓 CircuitSettings 提供顯式 display slot binding。
- 提供 display readiness checks，讓設定儲存後就能知道是否足以支援正式展示。

**Non-Goals:**

- 不在此 change 內重做 MQTT broker 連線流程本身。
- 不在此 change 內建立裝置狀態總覽頁。
- 不在此 change 內處理圖片或永續頁內容模型。

## Decisions

### Evaluate readiness from display requirements, not only raw settings presence

readiness 不只看「有沒有設定」，而是看每個 display story 是否有足夠資料來源、topic mapping 與 slot binding 能完成渲染。這樣才能反映真實可播性。

### Store circuit-to-display mapping explicitly

CircuitSettings 裡保留 explicit slot binding，讓 Factory Circuit 與相關展示不再依 icon 或名稱猜測來源。

### Surface readiness findings inside settings pages

readiness checks 的價值在於減少來回排查，因此結果應直接出現在 MqttSettings 與 CircuitSettings 內，而不是只留在後端 API。

## Implementation Contract

- Behavior:
  - MqttSettings 可顯示哪些 display metrics 已映射、缺映射或失效。
  - CircuitSettings 可顯示哪些 display slots 已綁定、未綁定或衝突。
  - display readiness checks 可彙整設定缺口，供 editor、playback 或 status surfaces 共用。
- Interface / data shape:
  - readiness model 至少支援 `pageId`, `requirementKey`, `status`, `reason`, `blocking`, `sourceType`, `sourceId`。
- Failure modes:
  - mapping 或 slot binding 缺漏時不可靜默當作正常，需回傳顯式 finding。
  - readiness service 失敗時設定頁保留主操作，但顯示 readiness 無法取得。
- Acceptance criteria:
  - server tests 覆蓋 readiness finding 計算、topic mapping 缺口與 slot binding 衝突。
  - web tests 或手動檢查覆蓋 MQTT 與 circuit 設定頁的 readiness 呈現。
- Scope boundaries:
  - in scope: MQTT coverage、circuit slot binding、display readiness findings。
  - out of scope: display publish workflow、device-status 全量觀測。

## Risks / Trade-offs

- [Risk] requirements matrix 難維護 → Mitigation: 用 shared display requirement descriptors 描述頁面需要什麼資料。
- [Risk] readiness findings 太多 → Mitigation: 區分 blocking 與 warning，並按頁面聚合。
- [Risk] explicit slot binding 導入需兼容舊 heuristic → Mitigation: 過渡期允許 fallback，但 readiness 明示這是暫時模式。
