## Context

這次不是新增功能，而是把幾個已存在的設定／播放契約補完整。共同特徵都是：型別看起來正確，但 HTTP runtime 還有「錯資料可被猜成合法值」或「省略欄位被當成重設」的空隙。

TDD 對照正式 spec 時確認 `display-page-per-metric-freshness` 已刻意採 resilience-first：required metrics 全部曾收到但後續 stale 時仍保留頁面、顯示 last-known values；只有從未收齊 required metrics 才 `stale-runtime`。因此這次不修改 freshness gate。

## Decisions

### 1. Partial update 的唯一規則：沒送就不改

Playback pages 與 MQTT settings 都採同一語意：

- key 不存在：保留既有值。
- key 存在且合法：更新。
- key 存在但不合法：400。
- 需要清空的 nullable 欄位只有契約明確允許 null 時才接受 null。

不再用 route-local default 猜測 caller 意圖。

### 2. Runtime validation 放在 server，web 只負責更早提示

前端表單改成完整數字解析，避免 `1883abc -> 1883`；但 server 仍是最後防線。手動 API、舊前端、測試工具都必須通過相同規則。

這次使用共用 management runtime validation boundary，避免 Playback、MQTT、playlist 各複製一份同類規則。

### 3. Invalid mutation 必須在任何副作用前結束

400 發生時不可：

- 改 SQLite
- 觸發 MQTT connect / reconnect
- emit socket images/playback/display-sync event
- 部分套用 reorder

因此 bulk / reorder 先完整 preflight，再進既有 handler / transaction。

### 4. 不做資料庫 migration

這次只阻止新壞資料進入。若現場資料庫已經有不合法設定，不在本 change 自動修復，避免啟動時偷偷改使用者資料。

### 5. 保留既有 resilience 與相容性

- complete-but-stale + prior data 仍維持 playable，不改 broker failure resilience。
- MQTT `password="****"` 維持「保留舊密碼」。
- `reconnectInterval=0` 維持停用自動重連的合法語意。
- playlist nullable metadata 仍可明確送 `null` 清空。
- Playback transition speed 既有 normalization 行為保留；本 change 主要拒絕 wrong type / non-finite，而不是把既有 clamp 行為改成另一套。

## Validation Rules

### Playback settings

- boolean 欄位必須真的為 boolean。
- `startPage` 必須是有效正 safe integer，並指向可辨識 playback page。
- schedule clock 若提供必須是完整 `HH:mm`；`scheduleEnabled=true` 的完整 candidate 必須同時有有效 start/end。
- repeatDays 為 0..6 的唯一整數集合。
- idle timeout 為正 safe integer；brightness 為 0..100 finite number。
- transition type 只接受 `fade | slide | none`；transition speed 若提供必須為 finite number，之後沿用既有 normalization。
- orientation / idle mode 僅接受既有 enum。

### Playback pages

- id 為正 safe integer且存在。
- 提供的 displayOrder 為非負 safe integer。
- 提供的 durationSeconds 為正 safe integer。
- 提供的 enabled 為 boolean。
- omitted 欄位沿用 existing row；unknown id 不 silent no-op。

### MQTT settings

- `dataMode`: `mqtt | mock`。
- port: 1..65535 integer。
- messageTimeout: positive safe integer。
- reconnectInterval: non-negative safe integer；0 保留「停用自動重連」語意。
- host / clientId：trim 後非空。
- username / password 若提供必須為 string；password mask `****` 仍保留既有值。
- env numeric values 必須整段是 canonical non-negative decimal integer，不能 partial parse。

### Image playlist

- durationSeconds: positive safe integer。
- displayOrder: non-negative safe integer。
- enabled / shuffle: boolean。
- fallbackMode 僅接受 `display-placeholder | skip | use-cover`。
- tags 必須是 string array。
- assetId 若非 null 必須是存在的正 safe integer image id。
- reorder entryId 必須存在且同一 request 不重複。
- 任一項不合法則整批不寫入。

## Test Strategy

先用 regression tests 固定目前 bug，再改 implementation：

1. MQTT mock partial PUT 不帶 dataMode，仍保持 mock；`reconnectInterval=0` 不能被 omitted update 改回 5000。
2. Playback page duration-only patch 不改 enabled/order。
3. Playback/MQTT wrong-type 與 malformed numeric cases 全部 400 且 prior state 不變、無 event/reconnect。
4. Playlist invalid entry / settings / duration-all / reorder / unknown asset cases無 DB 與 socket side effects。
5. Web MQTT payload builder 對 `1883abc`、非法 range、blank required text 直接失敗，不 silent normalize。
6. 既有 broker failure resilience 測試維持綠燈，防止本 change 誤改 stale-with-prior-data 行為。

最後跑受影響單測、server/web tests，以及 root `pnpm verify`。

## Out of Scope

- freshness / broker failure resilience behavior change
- GitHub Actions / branch protection
- MQTT initial-connect client cleanup 的故障恢復調整
- offline runtime + freshness API 合併
- image DB/file delete consistency
- 既有壞資料自動 migration/cleanup
