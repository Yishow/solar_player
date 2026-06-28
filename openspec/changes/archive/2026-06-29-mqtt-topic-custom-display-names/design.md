## Context

Topic 工作區每個 mapping 以 `metric_key` 為主鍵,名稱顯示由 `apps/web/src/pages/MqttSettings/viewModel.ts` 內的 `metricLabelMap` 依 `metricKey` 推導,操作者無法修改。

playback 顯示名稱與 MQTT topic 名稱目前完全脫鉤:

- 數值:playback 透過 `metric_key` 自 `LiveMetricsSnapshot.metrics[metric_key]` 取即時值,這條線貫穿系統。
- 名稱:寫死在三處 —— 各 playback 頁 viewModel(Overview `metricCards`、Solar `kpiBindings`、Sustainability 標籤陣列、Factory Circuit `slotDefinitions` 預設)、server 端 `displayStoryService` 的 story builder、以及 Factory Circuit 可由 `CircuitConfig.nameZh/nameEn`(`/display-pages/editor` 維護)覆寫。

Overview / Solar / Factory Circuit 使用 `useDisplayStoryRuntime`:server 預先解析 story payload(含 label),存在時優先;否則 client 端自 raw snapshot 解析並使用頁面內建 label。Sustainability 走 aggregate story input。Images 頁無 metric。

使用者決策:採「MQTT 名稱為唯一來源」。

## Goals / Non-Goals

**Goals:**

- 操作者可在 Topic 工作區為每個 topic mapping 編輯中文與英文顯示名稱,並透過既有 topics 草稿儲存流程持久化。
- 以 topic 自訂名稱作為 playback 以 `metric_key` 對應卡片之顯示名稱的唯一來源。
- 名稱留空時 fallback 回各頁內建預設名稱,不出現空白、不造成 playback 回歸。
- server story 為 topic 名稱送達 playback 的唯一權威管道;client fallback(story 缺)顯示內建預設,屬正確降級行為。

**Non-Goals:**

- 不為 Images 頁新增 metric 命名(該頁無 metric)。
- 不處理 Sustainability 中沒有 `metric_key` 對應的 aggregate-only 數據命名。
- 不改動數值取得路徑(`metric_key` → `LiveMetricsSnapshot`),只改名稱來源。
- 不新增 editor 端對 topic 名稱的編輯入口;topic 名稱僅在 Topic 工作區維護。
- 不調整 broker 連線、weather、coverage 等 MQTT 既有功能。

## Decisions

### 以 metric_key 為鍵在 topic_mappings 持久化 name_zh / name_en

新增 migration `014_topic_display_names.sql`,於 `topic_mappings` 增 `name_zh TEXT`、`name_en TEXT`(可為 NULL)。NULL 或空字串代表「未自訂」,解析時 fallback。選此而非新建表:topic 名稱與 mapping 一對一,`metric_key` 已是唯一索引,沿用既有 DELETE+INSERT 草稿儲存流程即可,避免額外 join 與生命週期管理。

既有 `PUT /api/settings/mqtt/topics` 已會以 `metric_key` 保留 `multiplier`/`offset`/`decimal_places`/`created_at`;name 欄位沿用相同的 existingMappings 保留模式,確保儲存其他欄位時不誤清名稱(若 input 未帶 name 則保留既有值;帶空字串則視為清除)。

### server story 解析為名稱權威來源,輸出已解析 label

在 `displayStoryService` 建立以 `metric_key` 為鍵的 topic 名稱查詢表(zh/en),於組 story metric 時以 `name_zh/name_en ?? 內建預設` 解析 label。Overview / Solar / Factory Circuit 走 story 路徑時即取得正確 label,毋須各頁 viewModel 重複命名邏輯。選此集中點:story builder 已是這三頁 server 端唯一 label 產出處,改一處覆蓋三頁。

### server story 為唯一名稱送達 playback 的管道,client fallback 維持內建預設

playback 為 playback-safe session,無法讀取受 managementAccess 保護的 `topic_mappings`;client 端唯二資料源是 `useLiveMetrics`(只有值)與 `useDisplayStoryRuntime`(server story payload)。因此 topic 自訂名稱送達 playback 的唯一管道,就是無守衛、playback 可達的 `/api/display-story` payload —— 已於 server story 解析(見上一決策)填入。Overview/Solar/Factory Circuit 既有 viewModel 本就以 `story label ?? 頁面內建預設` 消費 label,故 story 在場時即顯示自訂名稱,無需新增 client 端名稱來源。

替代方案(被否決):新增 playback-safe 名稱管道(把 topic 名稱塞進 story metadata 或新端點),讓 client fallback 也能解析名稱。否決理由:client fallback 僅是 story 尚未載入的暫態窗口,為此打穿 playback 的 management 安全邊界、並在 4 頁鋪設新管道,代價與風險不成比例。client fallback 顯示內建預設即為正確的降級行為。

### Factory Circuit 名稱來源改以 topic 自訂名稱優先

Factory Circuit 負載列原 fallback 鏈為 `CircuitConfig.nameZh ?? slotDefinitions.defaultZh`。本變更改為 `topic name_zh ?? CircuitConfig.nameZh ?? slotDefinitions.defaultZh`,使 topic 自訂名稱為最高優先。`display_slot → metric_key` 既有對照(slotMetricMap)為 join 依據。此解析在 server story(`readFactoryCircuitDisplayStory`)完成並經 story payload 送達;client 既有 `storySlot?.label ?? slot.defaultZh` 消費邏輯不需改動。


替代方案(被否決):維持 `CircuitConfig` 為 Factory Circuit 名稱權威,僅其他頁吃 topic 名稱。否決理由:使用者要求 topic 名稱為「唯一來源」,若 Factory Circuit 例外則同一語意名稱仍有兩個事實來源,違背本變更目的。此決策與 editor capability-first 原則衝突,列入 Risks 並由使用者確認。

## Implementation Contract

**Behavior:**

- 操作者在 Topic 工作區每張卡片可見並可編輯「中文名稱」「英文名稱」兩欄;輸入後經既有「儲存 topics」流程持久化,重新載入後維持。
- 名稱有值時,對應 `metric_key` 的 playback 卡片(Overview/Solar/Factory Circuit/Sustainability 中有 metric 對應者)顯示該自訂中文/英文名稱。
- 名稱為空時,playback 顯示維持各頁原內建預設名稱(與本變更前一致)。

**Interface / data shape:**

- DB:`topic_mappings` 新增欄位 `name_zh TEXT NULL`、`name_en TEXT NULL`。
- shared 型別:`MqttTopicMapping` 與 `apps/web/src/pages/MqttSettings/viewModel.ts` 的 `TopicMapping` 新增 `nameZh: string | null`、`nameEn: string | null`。
- API:`GET/PUT /api/settings/mqtt/topics` 的 topic 物件新增 `nameZh`、`nameEn`;`PUT` 的 `TopicMappingInput` 接受可選 `nameZh`、`nameEn`。序列化沿用既有 `{ status, topics, readiness }` 形狀,僅在 topic 物件內加欄位。
- story payload:每個 story metric 的 `label` 由 topic 名稱解析後輸出(不新增欄位,沿用既有 label 欄位語意)。

**Failure modes:**

- name 欄位為 NULL/空字串 → 解析 fallback 至內建預設,不顯示空白。
- topic mapping 不存在對應 `metric_key`(playback 有卡片但無 mapping)→ 維持內建預設,不報錯。
- 儲存 topics 未帶 name 欄位 → 保留既有名稱,不清空(沿用 existingMappings 保留模式)。

**Acceptance criteria:**

- server route 測試:`PUT` 帶 `nameZh/nameEn` 後 `GET` 可取回;留空欄位 fallback 行為有測試覆蓋(`apps/server/src/routes/settings-mqtt.test.ts`)。
- displayStoryService 測試:有自訂名稱時 story metric label 用自訂名稱,無則用預設。
- MqttSettings viewModel 測試:`topicWorkspaceRows` 反映 nameZh/nameEn 可編輯狀態與 fallback 顯示。
- 各 playback viewModel 既有測試在加入 topic 名稱輸入後仍通過,並新增「自訂名稱覆寫」案例。
- `pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test`、`pnpm run build` 通過。

**Scope boundaries:**

- 在範圍:topic_mappings 名稱欄位、settings-mqtt route 讀寫、shared/web 型別、Topic 工作區 UI 編輯欄、displayStoryService 名稱解析、Overview/Solar/Factory Circuit/Sustainability 以 metric_key 對應卡片之 label 來源、對應測試與 migration/seed。
- 不在範圍:Images 頁、Sustainability aggregate-only 數據、數值取得路徑、broker/weather/coverage 功能、editor 端 topic 名稱入口。

## Risks / Trade-offs

- [與 editor capability-first 原則衝突:Factory Circuit 名稱改以 topic 為優先,繞過 `/display-pages/editor` 既有命名入口] → 已由使用者確認接受此治理取捨(2026-06-28)。`CircuitConfig.nameZh/nameEn` 保留為次優先 fallback,不刪除 editor 能力,僅調整優先序;未以 page-local hardcode 繞過 editor。已知操作面副作用:當同一 slot 同時有 topic 名稱與 editor 名稱時,於 editor 改名會因 topic 勝出而看似無效,屬統一規則的預期代價。
- [playback client 端無法取得 topic 名稱(management 資料受保護)] → 以 server story payload 為唯一送達管道;Overview/Solar/Factory Circuit 既有 `story label ?? 預設` 消費邏輯即顯示自訂名稱。client fallback 顯示內建預設,為 story 未載入的暫態降級。
- [既有 topics 儲存流程為 DELETE+INSERT,誤清名稱風險] → 沿用 existingMappings 以 metric_key 保留欄位的既有模式,並加「未帶 name 不清空」測試。
- [seed 未帶名稱導致首次顯示仍為預設] → 預期行為(空=fallback 預設);seed 可選擇性帶入與現行預設一致的名稱,不視為回歸。
- [Sustainability 覆蓋面有限,使用者預期可能落差] → 已於 Non-Goals 與 proposal 邊界明列僅覆蓋有 metric_key 對應之卡片。
