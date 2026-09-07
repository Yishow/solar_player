# E1 lifecycle / CRUD continuation — 2026-09-07

## 本輪範圍

延續 bb74dca94fcc86fe7e69d3f6703283d123b1456e 起的 review 與既有未提交修復；本輪完成 E1 tasks 1.6、1.7，沒有 archive、stage、commit、merge 或正式資料操作。

- 來源版本序列為 `(metricScope, channelId)`；語意、metricKey、transport 或 epoch 變更須更高 sourceRevision。實體換錶須新 epoch；同錶語意更正可保留 epoch，revision 隔離計算。
- 同版名稱及管理 metadata 更新保留 accepted history、live state 與 baseline。新版本停用旧來源，歷史不刪除。
- 048 migration 新增 `meter_source_audit`；source 寫入與 actor/reason/before/after audit 同 transaction。`management` 是既有共用管理權限角色，並非可識別個人帳號；未新增帳號制度。
- 新增管理 API `/api/data-hub/sites/:scope/meter-sources`（GET/POST）及 `/:channelId`（GET/PUT/DELETE）。寫入 `{source, reason}`；DELETE 用 `{expectedRevision, reason}` 停用並保留歷史；缺省 timestampPolicy 為 source-required。停用與換 key 使用既有 source-impact gate，查詢失敗亦拒絕；source/mapping 更新同 transaction。Topic 訂閱可供其他來源共用，不以來源停用強制取消共用 transport；mapping enabled 與 ingest gate 阻擋後續數值更新。
- 完整來源欄位驗證、無憑證/payload 欄位 DTO、拒絕 accounting 欄位、非法 civil source timestamps；receive-time-estimate 需 reviewed source 與 audit context。
- M2 apply 更換 topic/selector 受 revision guard。舊全量 mapping PUT 不得繞過已登錄 source 的語意/transport 變更限制，原樣保存保留 selector。
- 停用或未審核的已登錄 source 回 SOURCE_NOT_ACTIVE，不退回 legacy ingest 更新值。

```text
管理 API / M2 apply
        -> 欄位、權限、版本與影響檢查
        -> transaction: source + audit + mapping
        -> MQTT admission -> 分版本 observations / live
```

## 驗證與 review

- RED→GREEN：非法來源設定、非法 civil 日期、停用 source fallback、legacy mapping bypass、CRUD impact gate。
- Focused shared、catalog lifecycle、CRUD、M2、MQTT 與 legacy route 測試已實際執行；最後完整 gate 結果見 checkpoint 的 verify.log。
- 主代理回讀了 service/schema/route/test/diff；修正 reader 命中的 legacy PUT bypass、新 CRUD impact gate，以及儲存層過度要求語意更正也換 epoch 的問題。
- Reader 中途報告缺 export/編譯失敗來自 worker 尚未交付的時間點；最終 source 已整合，以主代理最後版本 gate 為準，不採用中途摘要作驗收。
- Standards：本輪 source 寫入重複 INSERT 已合併；新增 route 錯誤 envelope 缺 success/timestamp 的 finding 已修正並補斷言。最後 focused routes 40/40 PASS；最終完整 gate 結果另見 checkpoint。
- Spec：E1 lifecycle/security 任務完成不等於整個 E1 或 U2 完成。

## 尚未完成與下一階段

1. E1：1.4 隔離真 broker 重啟 retained replay、1.12 完整 M1/M2 操作旅程仍未完成；沒有現場 payload / browser / FHD / production acceptance。
2. E1→E2：`boundaryMaxAgeSeconds` 仍未進 source schema；接著補來源 freshness policy 與 E2 boundary 契約。E2 仍有 interval coverage、reset/rollover/continuity、dailyCoverage、draft preview 完整驗證。
3. E3：repair CLI 的副本 dry-run、backup/diff、不可重建報告，以及 global/week/total 和 production materialization 等契約仍待實作。
4. U2 的完整單筆 mapping PATCH、expectedSourceRevision、UI lifecycle 與所有入口 impact workflow 尚未收尾；本輪不將 U2 tasks 勾完。

Checkpoint: `.scratch/meter-source-lifecycle-20260907/`。保留前兩輪 checkpoint 與所有既有 WIP。
