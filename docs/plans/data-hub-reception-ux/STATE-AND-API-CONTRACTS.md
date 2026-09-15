# 共用狀態、API與相容性契約（規劃附錄）

本附錄解決A–E的交界；正式要求以各change的spec.md為準。新增欄位與新路徑都是提案，實作前依最新server service可重用程度落定，不代表現況API已支援。

## 1. 四種狀態不可濃縮成一個healthy boolean

```ts
// Proposed conceptual model, not production TypeScript or an existing API.
type Evidence<T> =
  | { state: 'unknown'; reason: string }
  | { state: 'known'; value: T; observedAt: string; stale: boolean };

// Independent axes. 'unknown' must not become false or zero.
connection: Evidence<'connected' | 'disconnected' | 'connecting' | 'error' | 'mock'>;
reception: Evidence<'idle' | 'waiting' | 'observed' | 'partial' | 'refused' | 'expired'>;
conversion: Evidence<'unconfigured' | 'unreviewed' | 'preview-valid' | 'invalid'>;
activation: Evidence<'not-applied' | 'pending' | 'active' | 'failed'>;
```

connection的證據屬目前正式連線，不得拿候選test成功替代。reception的observed必須帶scope、capture window與transport provenance；不能推導物理設備總量。conversion的preview-valid不能當作正式live value。activation active只說明實際啟用證據，不保證之後每一筆資料都有效。

若資料過舊／socket斷線，顯示上次已知狀態和確認時間，不保留無期限「即時正常」標籤。API缺欄位時顯示unknown或補server evidence，不由UI編造完成。

## 2. API責任對照

| 操作 | 本次已讀的現況 | 規劃限制／增補 |
|---|---|---|
| 檢查正式連線 | GET `/api/settings/mqtt`、GET `/api/runtime/mqtt-status` | 適用既有授權讀取；顯示正式狀態，不稱候選測試 |
| 測試候選設定 | POST `/api/settings/mqtt/test` | 綁candidate revision/request，結果不修改正式狀態；必要時補受控test證據 |
| 存Broker設定 | PUT `/api/settings/mqtt` | config成功≠新runtime已連線；masked password三態；env effective要可解釋 |
| 讀generic／託管 | GET `/api/settings/mqtt/topics`、`/solar-sources` | 分清row的資料粒度；穩定sourceRef/revision為E提案 |
| 捕捉與候選 | 現有captures、candidates、samples流程 | 復用既有route；多filter合併能力未全程查證，不假設存在 |
| generic整份保存 | PUT `/api/settings/mqtt/topics` | E啟用後須collection revision＋共用guarded writer，或明確拒絕無版本client |
| generic單筆意圖 | **提案** PATCH/DELETE `/api/data-hub/source-mappings/:sourceRef`，POST collection | stable reference＋expectedRevision＋idempotency；不給managed/E1語意繞過口 |
| source影響 | GET `/api/data-hub/source-impact` 被Sources呼叫 | UI只做preflight；delete／identity mutate需commit時原子重查 |
| 正式reviewed mapping | M2 preview/apply契約已在規格 | 重用canonicalDraft、previewToken、idempotency，不建立另一套前端引擎 |
| 實際測試發送 | `/topics/:metricKey/publish-confirmation`與`/publish` | D整合所選已保存目標；明確確認；結果未知不自動重送 |

主要程式來源S05/S09/S11，主要預期行為S13/S14，詳見[SOURCES.md](SOURCES.md)。未讀完整handler的API只列「流程已使用」而非保證全部分支符合規格。

## 3. 單筆寫入細節

**版本只涵蓋配置**，不因每個live packet遞增，以免正常觀測讓使用者永遠409。修改相同配置的no-op不製造新語意版本。版本化的collection writer也須更新同一組source revisions與collection revision；任何background writer不能繞過此service。

sourceRef是immutable opaque public reference；合法scope/key變更不更換sourceRef。query若仍是舊的數字row id，只可用可證明的舊新mapping解析，不能「找數字相同的新row」猜。無可靠映射時回明確找不到並返回同scope列表。

每個idempotency紀錄綁authorized principal context、operation、source target與canonical request；相同key不同內容conflict。回傳已commit結果前仍驗證當前讀取／寫入權限，避免撤權後透過重試拿舊資料。delete成功後需用可授權的結果紀錄／tombstone處理retry，不可因row已消失誤回另一來源。

建議保留idempotency結果至少24小時為初始產品提案，實作需訂有界storage與cleanup並返回replay期限。超過已承諾的期限，UI不可生成新key盲目重送未知操作；先重新讀取並讓使用者核對。不得宣稱永遠exactly-once。

同DB的impact、revision、ownership檢查與mutation在單一transaction中完成。若authorization或外部依賴無法納入同DB transaction，寫入前再檢查其版本／授權狀態；缺少一致性證據就fail closed，不寫一行「atomic」卻繼續用先前UI查詢。

## 4. Route與draft共同語意

B擁有allowlist parser；E提供dirty coordinator；A/D只發「開來源／展開／返回／切scope」意圖。不得各自用window.confirm、useBlocker和自訂dialog重複攔同一個動作。query值不代表授權。

在本來源section切換是同一工作，不丟草稿、不阻擋。由drawer到full是同一編輯工作，URL可以記表現模式但不得存field draft。離開到Connections補前置條件時，父層工作session留記憶體並使用allowlisted return context；不要在被卸載頁面局部state中承諾保留。整頁reload只允許browser未保存警告，不承諾恢復機密表單。

搜尋輸入處於IME composition時不以中間字串重導／重建editor；compositionend後才套debounce。既有明確search URL仍保留語意，不能將selection或search filter互相覆蓋。

## 5. 安全診斷的可見差異

一般來源設定和offline preview不產生MQTT publish。實際發送可影響其他訂閱者，不能當「確認設定」必經步驟。使用server解析的confirmed target，避免UI依topic文字猜目的地。

confirmation過期、revision變更、值更改後不得沿用舊token；server拒絕且聲明未發送才能顯示「未發送」。timeout/網路失聯的UI只能說「結果未知」。正向功能測試針對隔離的授權Broker與測試topic，不能以正式site或既有保留值做預設測試fixture。

## 6. 雙發布端與 v1 整合修訂

**Supersedes**：先前「共享中央 Broker」只代表 Player receiver 的共用連線，不再容許解讀為全系統同時改設定。上游責任與各 client 訂閱詳見 [MQTT-OWNERSHIP](MQTT-OWNERSHIP.md)。

新增 sourceFamily：managed-solar／power-raw／power-virtual／diagnostic。managed canonical 直接重用，power-raw 進 reviewed M2/E1，virtual/snapshot/control/state 不作物理錶。非標準 Solar generic 在非 owned identity 下仍可審核使用；不 blanket-block 所有 solar topics。

F 將新增 protocol profile／registry binding 與 envelope validator，是**尚未實作**的 server/shared 合約。必須先驗證 site/publisher/tag/config revision、schema、readStatus、時間、sampleId 與 value/unit，再交既有 M2 selector/E1；任何失敗不能 fallback 到只讀 value。previewToken 必須綁此登錄版本，避免 preview 時是 A publisher、apply 變 B。

publisherConfigRevision、Player config revision、E1 sourceRevision、epoch 與採集 sampleId 是不同概念。sample 去重與 mutation idempotency 也不共用語意；normal packet 不讓設定 dirty。封包自報 retain/dup/qos 不採信，只有 MQTT transport 證據有效。

無 sourceTimestamp 的 DDE 不能將 legacy ts/readAt/publishedAt 搬成來源時間。已有 E1 source-required／受審核 allow-receive-time-estimate 規則完全保留；尚無 v1 gate 的 server 必須顯示「契約未支援，不能啟用」，不宣稱 UI 名稱改完就接通。
