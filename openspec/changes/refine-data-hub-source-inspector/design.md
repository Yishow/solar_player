# Design: Source inspector

## Context

本 change 擁有 inspector 的布局與互動契約；E 擁有草稿與儲存語意，B 擁有 Sources 列表／URL。既有路由 `/settings/data-hub/sources` 保留。使用者說的「點擊後側邊欄」在本次原始碼中對應 `SourceDetailsDrawer`，不是 settings 全站導覽。

## Goals / Non-Goals

目標是打開即能辨認來源、問題與下一步，在面板內完成短編輯，並在鍵盤、窄螢幕與即時資料更新下維持穩定。不將所有複雜配置塞在 drawer，也不以美化名義改播放頁。

## Technical Approach

### D1. 單層 inspector，不再卡片套卡片

```
來源中文名稱                                      [展開工作區] [關閉]
KN／觀音  ·  自訂／系統託管  ·  已儲存／有未儲存修改
[概覽] [對應與轉換] [接收樣本] [使用情況]
────────────────────────────────────────────
所選分頁內容（唯一主要垂直捲動區）
────────────────────────────────────────────
修改摘要／錯誤位置                  [捨棄修改] [儲存這筆來源]
```

「概覽」第一屏：人類可讀名稱、廠區、擁有權、正式值與單位、資料時間品質、設定與接收狀態、最重要的一個下一步。Technical key/topic 為次層，可複製且能完整展開。數值是正式觀測、接收樣本或離線預覽必須直接標示。

「對應與轉換」：名稱 → 來源／目標 → 值選擇／乘數／單位 → 進階參數。複雜 selector、批次、樣本並排只在 D 的完整工作區編輯。「接收樣本」只呈現可取得且未過期的有界樣本；現有 API 未提供持久歷史時不命名為歷史紀錄。「使用情況」沿用 source-impact／usage 能力，明確區別讀取中、無引用、已引用與未知。

### D2. 尺寸與視覺 token（提案值，非既有量測）

- 一般 modal 目標寬 720 CSS px，最大不超過 viewport 扣除 24 px；小於 768 px 採全寬全高。短螢幕保持 footer 可達，並處理 safe-area。
- 內文可用寬小於 640 px 時一欄；達 640 px 才允許兩欄。topic、selector、長文字和錯誤列全寬。不得使用 viewport 的 lg 斷點決定 12 欄。
- 間距採 4/8/12/16/24/32；一般區塊間距 24、label 與 input 8。標題 20/28、分節 16/24、內文與輸入 14/22、輔助 12/18。正常控件高 44，緊湊 icon 控件仍提供 44×44 hit area。
- 沿用現有綠灰視覺；semantic tokens 分為 surface、subtle-surface、border、text、muted-text、accent、danger、warning、success。一般欄位不逐一加陰影，只有浮層提供一層 elevation。
- 未儲存用 amber＋文字，唯讀用鎖定圖示＋原因；紅色只給錯誤／破壞性操作。焦點輪廓、選中與 hover 不只靠顏色。
- 160–200 ms 開闔動畫屬建議；reduced-motion 時停用位移。繁體中文為主，英文協議詞放次層說明。

### D3. 焦點與 modal 生命週期

初次開啟將焦點放標題（tabIndex=-1）或合理的首要輸入。focus setup/cleanup 只跟真正的開關週期綁定；不能因父層 callback identity、return ref 物件、打字或 live snapshot 更新重跑。保存 opening trigger 的 DOM handle 與 sourceRef；關閉時只返回一次。trigger 不存在時依序回列表中相鄰可見列、列表標題、來源搜尋欄。

背景 inert 與捲動鎖定須成對復原；Tab/Shift+Tab 只在可見且可操作控制項之間移動，折疊/隱藏/disabled 項不得混入。Escape 經 E 的相同關閉守衛，不直接丟棄。必要確認層同時只允許最上層處理 Escape，取消確認回到原欄位。

### D4. 關閉、儲存與展開

僅查看：關閉即離開；無修改不顯示多餘「捨棄」。修改中：「繼續編輯」「捨棄修改」；需要時提供「儲存並離開」，但沒有通過驗證就不得離開。儲存失敗錯誤在面板內，焦點到錯誤摘要且連往欄位。儲存成功可以保留面板供觀察接收狀態，不強迫關閉。

「展開工作區」轉到 `panel=full` 的同一 logical editor；不開新分頁、不複製草稿、不重抓樣本取代原證據。full 模式不是 modal，不宣告 aria-modal，也不鎖背景；view state 不負責存儲表單機密。

### D5. 擁有權差異

託管來源顯示資源數、擁有的指標與同步狀態，不以 generic 的單一 lastValue 空值顯示「尚無讀值」。禁止覆寫的控制改為可讀資訊＋原因；可提供已存在且授權的管理入口。非託管但屬 E1 reviewed source 的語意修改必須轉既有版本化流程。

## Architecture Decisions

保留 modal 作短工作；比全面導向新頁更能保留來源列表位置。批次／解析用完整工作區；比永久加大 drawer 更容易閱讀樣本。暫不做可拖曳調寬或 docked inspector，避免首次交付引入兩套焦點模型。

## File Changes

修改 `apps/web/src/pages/DataHub/{SourceDetailsDrawer.tsx,Sources.tsx,SourceCards.tsx}`；配合 E 的 draft 控制、B 的 URL。新增子元件名僅是提案：SourceInspectorHeader、SourceInspectorTabs、SourceOverview、SourceUsagePanel、SourceEditorActions。

## Risks / Trade-offs

面板加寬會遮擋較多背景，但背景本來是 modal；比較資料改用 full workspace。初期只有有限樣本/usage 資料時，必須呈現 unknown，不能為整齊而填零。UI 虛構視覺樣本不當作正式 FHD canonical。

## Migration Plan

先加 focus/grid regression，再替換 view shell，最後接 E 的單筆操作。E 未就緒時不得顯示「只儲存這筆」卻呼叫舊全量 PUT；過渡可保留明示「儲存全部修改（N 筆）」或只上線純查看版。

## Validation

1366×768、1440×900、1920×1080；另測 768/390/320 CSS px 和 200% zoom。用真 browser 驗證輸入 20 字、IME 組字、10 次 snapshot 更新均不移焦點。鍵盤完成開啟、切分頁、捨棄、存檔、關閉；讀屏確認標題與狀態。驗證 scope-specific errors、長 topic、10 KB 級有界樣本顯示、footer 不遮住錯誤。

## Open Questions

720 px、字級與動畫屬待產品審閱的建議值，不阻擋規格草稿。託管管理入口只連向實際存在且授權的頁；不存在時顯示說明，不造連結。

## Cross-change contract

路由、四軸狀態、單筆API與重試期限的共用細節見 [STATE-AND-API-CONTRACTS](../../../docs/plans/data-hub-reception-ux/STATE-AND-API-CONTRACTS.md)。A–E的責任／交付順序見 [ROLLOUT-AND-ACCEPTANCE](../../../docs/plans/data-hub-reception-ux/ROLLOUT-AND-ACCEPTANCE.md)。

## 2026-09-15 跨發布端審查更新

本輪基準為 `fd405ebc2957232b6c622071622b9c7d830a3a42`。本 change 仍是未實作提案，不勾選產品驗收、不歸檔。與本輪新增的 `plan-power-mqtt-publishing-and-kn-onboarding` 共用 [MQTT-OWNERSHIP](../../../docs/plans/data-hub-reception-ux/MQTT-OWNERSHIP.md) 與 [PUBLISH-TAG-REGISTER](../../../docs/plans/data-hub-reception-ux/PUBLISH-TAG-REGISTER.md)。

### 更新決策與邊界

來源側欄另顯示發布端、訂閱擁有者、原始／計算來源、時間證據與上游設定責任；Solar 託管來源維持唯讀。

本輪具體實作責任與驗收由 DHI-R4 約束；不得把新增發布契約當作現行 API 已支援，也不將隔離 fixture 當現場測試。

## 2026-09-16 工程別修訂（取代舊 KN 逐錶前提）

側欄以觀音／工程別為標題，sourceKind=engineering 可為正式來源；物理錶欄位只屬physical分支，期間與dataRevision不混入設定dirty。未批准virtual仍只診斷。

觀音結果契約由 [`add-kn-engineering-mqtt-sources`](../add-kn-engineering-mqtt-sources/proposal.md) 的 KNE/EPR 要求負責；本文件舊段落中的 DDE/physical/raw 與 F v1 前置僅適用明確選擇的物理來源，不得套成工程別必要條件。A 的焦點、B 的路由、C 的連線責任、D 的預覽及 E 的配置安全依原規格保留。需要逐來源核對的是工程成果模式與涵蓋範圍，不是上游每顆錶。
