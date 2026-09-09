## Why

`readSourceImpact` 把兩種本質不同的東西都算成阻擋用的 consumer：頁面實際綁定（操作者可解除）與程式碼定義的 playback story／readiness 期望。後者由 `metricUsageService.ts` 的 registered consumer 組成，不讀資料庫，因此 30 個 metricKey 的相依恆為真，任何使用者操作都無法解除。

結果是這些 metricKey 的來源在 guided apply 與直接來源路由都永遠無法停用或變更 metricKey。實測基準（head `26c5598e590c05d993833b3b890149657ede13ab`，空資料庫、零頁面綁定）：直接來源路由對 `consumptionEnergy` 的停用與 metricKey 變更皆回 HTTP 409 `E1_SOURCE_IN_USE`。

`guided-data-source-onboarding` U2-R5 列舉的依賴類別是 drafts、live pages 與 derived metrics，U2-R5-S02 要求阻擋維持到依賴被明確解除為止。恆真且無解除路徑的阻擋與這個模型矛盾：它不是「先解除再繼續」，而是永久禁止。

## What Changes

- 阻擋集合限縮為可解除的引用：draft 綁定、published live 頁面的 widget 綁定、derived metric 輸入。判斷依據是 metric usage 既有的 consumer 類型欄位，不新增分類來源。
- 程式碼定義的 story／readiness 期望仍然回報，但改為非阻擋：它們的存在不再讓 `canMutate` 為 false，改以獨立欄位揭露，滿足 U2-R5 的揭露要求。
- 來源影響讀取端點 `/api/data-hub/source-impact` 保留 `canMutate`、`unknown`、`consumers` 三個欄位與其型別；`consumers` 的成員語意收斂為「阻擋集合」，結構性期望改由新增欄位揭露，既有欄位不移除、不改名、不改型別。
- 影響查詢失敗仍 fail-closed 回 unknown；`fix-guided-source-mutation-guards` 建立的 destructive-transition guard 位置、觸發條件與錯誤碼皆不變。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `guided-data-source-onboarding`: U2-R5 明確區分「可解除的引用」與「結構性指標期望」，只有前者阻擋破壞性來源操作，後者仍須揭露。

## Impact

主要範圍為 `apps/server/src/services/sourceImpactService.ts` 的 consumer 分類，以及 `apps/server/src/routes/site-energy-profiles.ts` 的來源影響讀取回應。`apps/server/src/services/metricUsageService.ts` 已提供足以區分的 consumer 類型，預期不需修改。

回歸測試涵蓋 `apps/server/src/services/sourceImpactService.test.ts`、`apps/server/src/routes/site-energy-profiles.test.ts`、`apps/server/src/services/guidedMqttMappingService.test.ts` 與 `apps/server/src/routes/meter-sources.test.ts`。

不改前端 `apps/web/src/pages/DataHub/Sources.tsx` 的訊息呈現，該部分另案處理；不新增資料表或欄位、不新增覆寫或確認參數、不調整 playback 頁面的指標註冊模型、不放寬 unknown 的 fail-closed 行為。無需新套件。

本案假設 `fix-guided-source-mutation-guards` 已完成並提供兩入口共用的 guard；兩案的驗證仍各自獨立。背景與重現界線見 `docs/reviews/2026-09-08-mqtt-runtime-safety-review.md` 的 F1。
