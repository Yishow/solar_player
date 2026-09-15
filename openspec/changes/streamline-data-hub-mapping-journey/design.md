# Design: Mapping journey

## Context

M2 已有完整 token、canonicalDraft、idempotency、語意審查、transport evidence 契約。本提案改善它們的 presentation 與順序，並保留所有安全邊界。多來源 mapping 不應沿用 generic input grid 壓縮在 576 px 左右的 drawer。

## Goals / Non-Goals

正常任務不需知道 metricKey 或手打 path；專家可檢視 compiled selector。畫面能回答「選了哪筆」「會變成什麼」「究竟保存了還是收到了」。真發送不是接入必經步驟。

## Technical Approach

### D1. 三階段流程與前置條件

```
前置：concrete site + approved connection + approved reception scope
  缺少 → 原地補齊／指向 C 並保留 draft
① 選資料         B 的 received/topic/tag 多選；可重用已審查來源
② 選值與意義     visual field picker + unit/semantics/scaling review
③ 預覽與套用     canonical draft diff + 檢核結果 + 明確啟用
完成              已儲存 / 接收啟用中 / 等待新資料 / 首筆正式資料
```

back 不丟掉草稿。修改上游選項只失效受影響的下游 evidence/token，不偷偷全部重設。若更換 site/connection 使 candidate 不再屬同授權上下文，先 guard，再清楚說明須重選；不可把舊 KN candidate 改標 CL。

已知 reviewed binding 可跳過重新 capture；首次無 traffic 可提供明確 offline example 建立「等待正式資料」的配置，不稱為 live success。批次支援多選／套用相容模板／逐列修正；未選中項目保持不變。

### D2. 選值與換算版型

完整工作區左為有界 sample 的可選欄位樹／tag rows，右為所選值、語意與結果；內容寬不足時縱向排列。未選行不過度密集顯示公式。選中的來源用 summary strip 固定於頂：廠區、exact topic、tag identity、evidence origin/revision。

必填審查：累積電量／區間電量／功率，energyFlowRole，原始單位，已在上游套過的 scaling，timestampPolicy，必要時 offset-free timestamp timezone。literal dotted keys 用 tokens，不讓 visual labels 混成 dotted path。數值保留 decimal lexeme；不能先用 JS Number 讓高精度讀值失真。

「乘數」輸入先維持字串草稿；空白、負號、尾端小數點、0 各自按 validator 顯示，不能 `Number(value) || 1` 靜默改寫。單位換算不等於 metric identity／日月基線；power 不能因名稱或數值大小變成 cumulative energy。

### D3. 預覽即審查證據

第三階段顯示每來源 raw selected value → normalization/scaling → semantic target；正樣本、no-match/negative sample 與品質 warnings 一起顯示。以 server 返回 canonicalDraft 畫出改前／改後；token 綁 sample/source/profile revisions、timestamp policy 與選取集合。任何實質變更都讓「套用」失效，要求重新預覽。

preview 成功只表示這批證據可按規則解析。若只有一筆 cumulative sample，顯示「還沒有足夠區間基線」，而不是「本月用電正常」。retained/offline/capture sample 不因點套用就寫入正式 history。

### D4. 套用與完成頁

按套用只送 server canonicalDraft＋previewToken＋本次固定 idempotency key。HTTP timeout 狀態為「結果尚未確認」，重試用同 key；不能為每次重按產生新 key。409 保留草稿，顯示衝突內容並重 preview。成功 UI 分項列出保存、runtime reconciliation、等待新資料與實際 freshness。

完成主下一步依來源任務：原先 total picker → 返回同一 KN picker 並保留其他設定；一般 Sources → 查看新來源；需要能源 profile 的對應 → 明確前往既有設定。不得直接重寫 E6 或播放頁 binding。

### D5. 三種容易混淆的「測試」

| 動作 | 作用 | 位置 |
|---|---|---|
| 測試連線 | 測候選 Broker 設定；不保存、不發佈 | C |
| 預覽轉換 | 用選定 evidence 做無 domain side effect 解析 | 第三階段 |
| 實際發送測試值 | 真的向 Broker 發佈，可能影響下游 | 進階診斷，另行確認 |

真發送不放在完成必經流程、不使用預設 hard-coded consumptionEnergy。先依已保存目標取得 server publish-confirmation，顯示 broker/exact topic/site/metric/source revision/value/unit/payload/retain 與到期時間；預設 retain=false。更動來源／數值／內容或到期重新確認。無法解析安全目標就阻止；未知／斷線結果不能寫「未發送」除非 server 確認確實未發送。不要自動重送真發佈。

## Architecture Decisions

復用既有 M2 engine 和 token protocol，而非做第二套 frontend simulator。選三階段是既有契約，不是承諾三個 click。分開實際發送能降低把驗證動作當無害操作的誤解。

## File Changes

GuidedOnboardingPanel、GuidedMqttMappingPanel、source entry points 與 safe publish component；必要時抽出 OnboardingPrerequisites、CandidateReview、MappingPreviewReview、MappingApplyResult。移除 hard-coded target 的 UI 呼叫，不任意改 server 能力。

## Risks / Trade-offs

批次彈性要讓錯誤行被看見：顯示排除數量與理由，不能統一 green success。token 失效會增加一次 preview，但比套用未審查內容安全。未支援 decoder 明確告知，不猜值。

## Migration Plan

用原 task link 導向三階段殼；B 提供候選、C 處理前置、A 提供短編輯返回點、E 提供舊 generic edits 的一致 guarding。保留既有已審查 source 跳過 capture 的捷徑。

## Validation

檢查 scalar/nested literal key/tag packet/tag array、MAIN/STAMP 交替、重排/duplicate tag、decimal precision、retained/offline、token expiry/revision conflict、selected set changed、lost response same-key retry、runtime refused。紀錄 zero domain writes 的 preview spy，不使用正式 Broker 做預設測試。

## Open Questions

批次視圖能支援的完整欄位形狀以目前 engine/契約為準；這次沒有擴增 parser 語法授權。使用者審閱的是三階段與預覽資訊層級，不是新的能源語意決策。

## Cross-change contract

路由、四軸狀態、單筆API與重試期限的共用細節見 [STATE-AND-API-CONTRACTS](../../../docs/plans/data-hub-reception-ux/STATE-AND-API-CONTRACTS.md)。A–E的責任／交付順序見 [ROLLOUT-AND-ACCEPTANCE](../../../docs/plans/data-hub-reception-ux/ROLLOUT-AND-ACCEPTANCE.md)。

## 2026-09-15 跨發布端審查更新

本輪基準為 `fd405ebc2957232b6c622071622b9c7d830a3a42`。本 change 仍是未實作提案，不勾選產品驗收、不歸檔。與本輪新增的 `plan-power-mqtt-publishing-and-kn-onboarding` 共用 [MQTT-OWNERSHIP](../../../docs/plans/data-hub-reception-ux/MQTT-OWNERSHIP.md) 與 [PUBLISH-TAG-REGISTER](../../../docs/plans/data-hub-reception-ux/PUBLISH-TAG-REGISTER.md)。

### 更新決策與邊界

Solar 已託管資料直接重用；電力 raw 與 virtual 不能重複入帳。新版電力封包須先經 F 的有界驗證，再沿用 M2/E1；觀音預留 tag 不可直接套用。

本輪具體實作責任與驗收由 DHM-R4 約束；不得把新增發布契約當作現行 API 已支援，也不將隔離 fixture 當現場測試。

## 2026-09-16 工程別修訂（取代舊 KN 逐錶前提）

三階段先選sourceKind/mode，再走工程preview/period/版本，不要求meterId。不將已算好日量再差分；G共用gate及typed provider就緒前不可fallback。

觀音結果契約由 [`add-kn-engineering-mqtt-sources`](../add-kn-engineering-mqtt-sources/proposal.md) 的 KNE/EPR 要求負責；本文件舊段落中的 DDE/physical/raw 與 F v1 前置僅適用明確選擇的物理來源，不得套成工程別必要條件。A 的焦點、B 的路由、C 的連線責任、D 的預覽及 E 的配置安全依原規格保留。需要逐來源核對的是工程成果模式與涵蓋範圍，不是上游每顆錶。
