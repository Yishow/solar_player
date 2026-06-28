## 1. 資料層與共用型別(以 metric_key 為鍵在 topic_mappings 持久化 name_zh / name_en)

- [x] 1.1 實作設計決策「以 metric_key 為鍵在 topic_mappings 持久化 name_zh / name_en」:新增 migration `apps/server/src/db/migrations/014_topic_display_names.sql`,於 `topic_mappings` 增加 `name_zh TEXT` 與 `name_en TEXT`(可 NULL),且重跑 migration 為冪等(IF NOT EXISTS 或既有 migration runner 行為)。驗證:`pnpm --filter @solar-display/server run db:migrate` 不報錯,且對既有 DB 重跑不重複加欄位。
- [x] 1.2 於 `packages/shared/src/types.ts` 的 `MqttTopicMapping` 介面新增 `nameZh: string | null`、`nameEn: string | null`。驗證:`pnpm run build` 型別檢查通過。

## 2. Server route 讀寫名稱(Topic mapping API carries custom display names)

- [x] 2.1 滿足需求「Topic mapping API carries custom display names」讀取面:於 `apps/server/src/routes/settings-mqtt.ts` 的 `readTopicMappings`/`serializeTopicMappings` 讀取並輸出 `nameZh`、`nameEn`(SELECT 加 `name_zh`、`name_en`,序列化轉為 camelCase,NULL 保留為 null)。驗證:`settings-mqtt.test.ts` 新增「GET 回傳 nameZh/nameEn」案例通過。
- [x] 2.2 滿足需求「Topic mapping API carries custom display names」寫入面與「Operators can author custom display names per topic mapping」之持久化:於同檔 `TopicMappingInput` 新增可選 `nameZh`、`nameEn`,並在 `PUT /api/settings/mqtt/topics` 的 INSERT 寫入名稱;沿用 existingMappings 以 `metric_key` 保留模式:input 未帶 name 則保留既有值,帶空字串則存為 NULL。驗證:`settings-mqtt.test.ts` 新增「PUT 寫入名稱」「未帶 name 保留既有」「空字串清為 null」三案例通過。

## 3. Server story 名稱解析(server story 解析為名稱權威來源,輸出已解析 label)

- [x] 3.1 實作設計決策「server story 解析為名稱權威來源,輸出已解析 label」並滿足需求「Topic custom names are the source of playback metric display names」server 路徑:於 `apps/server/src/services/displayStoryService.ts` 建立以 `metric_key` 為鍵的 topic 名稱查詢(zh/en),並讓 Overview/Solar 的 story metric `label` 解析為 `topic name ?? 內建預設`(zh 與 en 各自解析)。驗證:`displayStoryService` 對應測試新增「自訂名稱覆寫 label」「空名稱用預設」案例通過。
- [x] 3.2 實作設計決策「factory circuit 名稱來源改以 topic 自訂名稱優先」並滿足需求「Factory Circuit prefers topic custom name over circuit config name」server 路徑:於同檔 Factory Circuit story 解析,將 slot label 來源改為 `topic name ?? circuit name ?? slot 預設`(以 `display_slot → metric_key` 既有對照取 topic 名稱),保留 `CircuitConfig` 名稱為次優先 fallback。驗證:對應測試新增 Factory Circuit「topic 名稱優先於 circuit config」「topic 空時用 circuit config」「皆空用 slot 預設」案例通過。

## 4. Topic 工作區編輯 UI(Operators can author custom display names per topic mapping)

- [x] 4.1 滿足需求「Operators can author custom display names per topic mapping」顯示面:於 `apps/web/src/pages/MqttSettings/viewModel.ts` 的 `TopicMapping` 型別與 `topicWorkspaceRows` 推導加入 `nameZh`/`nameEn`,顯示時以自訂名稱優先、留空 fallback 回 `metricLabelMap` 預設。驗證:`viewModel.test.ts` 新增「自訂名稱顯示」「留空 fallback 預設」案例通過。
- [x] 4.2 於 `apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx` 新增中文名稱、英文名稱兩個可編輯輸入欄,變更走既有 `handleTopicChange(rowId, key, value)` 流程(key 擴充含 `nameZh`/`nameEn`),並於 `mqttSettings.css` 補對應樣式維持工作區密度。驗證:`TopicWorkspaceRow.test.ts` 新增「名稱欄變更觸發 handleTopicChange」案例通過;手動於工作區編輯名稱、儲存、重載後名稱保留。
- [x] 4.3 確保 MqttSettings 頁的 topics 儲存 payload 帶上 `nameZh`/`nameEn`(loadModel/送出路徑),使 4.2 的編輯能持久化。驗證:`MqttSettingsContent.test.ts` 或 `loadModel.test.ts` 對應案例涵蓋名稱進入儲存 payload。

## 5. Playback 名稱送達驗證(server story 為唯一名稱送達 playback 的管道,client fallback 維持內建預設)

- [x] 5.1 [P] 驗證設計決策「server story 為唯一名稱送達 playback 的管道」與需求「Unset custom names and absent story fall back to built-in defaults」於 Overview:`apps/web/src/pages/Overview/viewModel.ts` 既有 `resolveStoryMetricCards` 已以 `storyMetric.label` 消費 story label,故 story 在場時顯示 topic 自訂名稱;client fallback(無 story)維持 `metricCards` 內建預設。驗證:`Overview` viewModel 新增測試 —— 帶自訂 label 的 storyOverview 使卡片顯示自訂名稱,無 story 時顯示內建預設。
- [x] 5.2 [P] 驗證 Solar:`apps/web/src/pages/Solar/viewModel.ts` 既有 `label: storyKpi?.label ?? binding.label` 已消費 story label;story 在場顯示自訂名稱,缺則用內建預設。驗證:`Solar` viewModel 新增測試 —— 帶自訂 label 的 solarStory 使 KPI 顯示自訂名稱,無 story 時顯示內建預設。
- [x] 5.3 [P] 驗證需求「Factory Circuit prefers topic custom name over circuit config name」client 消費面:`apps/web/src/pages/FactoryCircuit/viewModel.ts` 既有 `labelZh: storySlot?.label ?? slot.defaultZh`(空/健康兩分支)已消費 story label;server story(3.2)已依 `topic ?? circuit ?? slot` 解析。驗證:`FactoryCircuit` viewModel 新增測試 —— 帶自訂 label 的 storySlot 使負載列顯示自訂名稱,無 story 時顯示 slot 預設。
- [x] 5.4 [P] 確認 Sustainability 範圍邊界:`apps/web/src/pages/Sustainability/viewModel.ts` 之卡片 label 全為寫死字串,值來自 aggregate sustainability story(period big numbers),無任何 `metric_key` 對應,故不在 topic 名稱連動範圍。驗證:於本 change artifact 記錄此邊界(proposal Non-Goals 已載明),不改動 Sustainability label 來源。

## 6. Seed 與整體驗證

- [x] 6.1 於 `apps/server/src/db/seed.ts` topic mapping seed 補上 `name_zh`/`name_en`(可設為 null 或與現行預設一致的值),確保 seed 後不破壞 fallback 行為。驗證:`pnpm --filter @solar-display/server run db:seed` 不報錯,seed 後 playback 顯示與變更前一致。
- [x] 6.2 跑完整驗證:`pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test`、`pnpm run build` 全數通過。驗證:三道指令綠燈。
