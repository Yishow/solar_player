## Context

`phase1-multisite-playback-acceptance` 已歸檔，但 code review 發現它宣稱證明的 rotation 上限在 published Profile Version 路徑上不成立，而 acceptance harness 的數個檢查是恆真或取樣不足，因此偵測不到。本 change 修復 Server 端的求值路徑、修復 harness 的觀測面，並讓現行文件與程式一致。

## Goals / Non-Goals

**Goals:**

- 讓 published Profile Version 的 runtime 求值回到 `EffectiveRotationCache`，恢復「每 revision 最多一次完整求值」。
- 讓 acceptance harness 以每台 Client 歸戶的證據取代聚合計數，並在 publish 後與穩態視窗後重新取樣 rotation 求值次數。
- 讓 heartbeat 門檻公式、驗收 JSON 欄位與 root script 清單三處文件與程式一致。

**Non-Goals:**

- 不改 heartbeat／Time Signal 的實際節奏與 rotation 求值演算法。
- 不重構 review 列為判斷題的程式碼氣味。
- 不改寫已歸檔 change 的 acceptance-evidence 內容。

## Decisions

### 以帶 version 識別的 cache key 收斂兩條求值路徑

`EffectiveRotationCache` 的 key 目前由 profileId 與 siteScope 等欄位組成，無法表達 published Profile Version。決定擴充 key 形狀，加入可選的 profile version 識別；default-profile 路徑該欄位留空，published-version 路徑填入版本識別。兩條路徑都改為呼叫同一個經過快取的求值入口，使 `evaluationCount` 成為兩條路徑共同的真實計數。

替代方案是為 published version 另開一座快取，但那會讓 acceptance seam 需要合併兩個計數器，且無法防止未來再長出第三條繞過路徑，故不採用。

### revision 字串必須反映 readiness 與 freshness

目前 published-version 分支的 `effectiveRotationRevision` 只由版本識別與 site scope 組成，readiness 或 freshness 改變時字串不變。決定改用與 default-profile 路徑相同的 revision 組成方式，把 profile version 快照、readiness revision 與 freshness revision 一起納入，讓 revision 既是 cache key 也是對 Client 正確的變更訊號。

### revision 雜湊必須排除連續變動的欄位

實作期間發現既有 revision 雜湊把兩個隨時間連續變動的值一起雜湊進去：freshness snapshot 的 `ageMs`（每毫秒遞增），以及完整 `MqttStatus` 的 `updatedAt`（每次重連嘗試更新）。兩者都不影響 rotation 結果，卻讓 cache key 幾乎每次請求都不同，使 `EffectiveRotationCache` 在有 live metric 時形同失效。決定在雜湊時排除 `ageMs`，並只雜湊 mqtt 狀態中語意相關的 `connected` 與 `reason`；freshness 的 `state`、`sourceTimestamp` 與 `nextTransitionAt` 已足以表達 rotation 依賴的變化，跨越 freshness 邊界時仍會正確失效。

沒有這一項，把 published-version 路徑接回快取也不會產生任何命中，「每 revision 最多一次完整求值」仍然不成立。

### harness 以 Server 讀回面與逐 Client 歸戶取代自我計數

Time Signal 改為每個 socket 各自持有計數，驗收條件同時檢查總量下限與「涵蓋率等於 Client 數」。heartbeat 沿用 harness 發送計數作為總量，但另外斷言每台 Device 的 Server 端讀回都出現心跳證據，使「每台都送到」成為可失敗的條件。

### rotation 求值次數取樣三次

在建立 cohort 的 sweep、publish Profile Version 之後、以及穩態視窗結束之後各取樣一次，驗收條件改為檢查各段成長量的上界，而不是只檢查單一數值等於 2。

## Implementation Contract

**Behavior**

- 同一 published Profile Version 與同一 site scope 下的連續 runtime 請求，只觸發一次完整 Effective Rotation 求值。
- readiness 或 freshness 改變時，published-version 路徑的 `effectiveRotationRevision` 隨之改變。
- acceptance metrics 開啟時，304 回應也帶出 `x-solar-rotation-evaluations`。
- 任一 Client 缺少 Time Signal 或 heartbeat 證據時，acceptance command 非零退出並指出未涵蓋數量。

**Interface / data shape**

- `EffectiveRotationCacheKeyParts` 增加可選的 profile version 識別欄位。
- `displayRotationService` 匯出一個接受 profile version 快照的快取求值入口，回傳形狀與 `EffectiveDisplayRotationSnapshot` 相同。
- acceptance 旗標由 `apps/server/src/config.ts` 提供具名讀取器，route 不再直接讀 `process.env`。
- harness 輸出 JSON 增加 Time Signal 與 heartbeat 的涵蓋率欄位。

**Failure modes**

- 涵蓋率無法觀測時 fail closed，不得視為通過。
- rotation 取樣點取不到 header 時維持既有的 fail-closed 行為。

**Acceptance criteria**

- 新增的 server 測試證明 50 次同 version 同 site 請求只增加 1 次求值，且 304 帶出 header。
- 新增的 harness self-test 證明涵蓋率不足與 per-request 成長都會失敗。
- `pnpm verify` 全 stage 通過。

**Scope boundaries**

- In scope：`apps/server/src/routes/playback.ts`、`displayRotationService`、`effectiveRotationCache`、`config`、acceptance harness 與其 self-test、上述三份文件。
- Out of scope：web 端 playback runtime 消費邏輯、Socket 服務、liveness registry、device pairing、FHD 視覺面。

## Risks / Trade-offs

- [收斂 cache key 可能改變既有 revision 字串] → published-version 路徑的 revision 本來就不反映 readiness／freshness，屬於要修的缺陷；default-profile 路徑的 key 組成維持不變以免影響既有快取命中。
- [harness 斷言變嚴可能讓 10 分鐘 run 更容易失敗] → 這正是目的；門檻改為與 spec 一致而非更寬，且涵蓋率檢查針對的是本來就應該成立的性質。
