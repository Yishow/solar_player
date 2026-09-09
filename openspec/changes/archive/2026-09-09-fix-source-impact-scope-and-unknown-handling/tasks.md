## 1. 建立缺陷回歸

- [x] 1.1 核對實作時 GitHub main、local HEAD 與工作目錄，記錄與 review head 的差異；確認本案規格仍適用且不覆蓋其他工作。
- [x] 1.2 在 `sourceImpactService.test.ts` 加入 D1 的 CL／KN／global／all、inherited 與 legacy scope 矩陣，先確認目前版本在 cross-scope 斷言失敗。
- [x] 1.3 加入 D2 malformed JSON、present-but-invalid container／binding、合法空草稿與 supported legacy fixtures，先確認目前版本把損壞證據當 known-empty 的斷言失敗。

## 2. 修正共同 impact 決策

- [x] 2.1 保留解析後 binding scope 並套用 scope-aware 比對；以 1.2 全部轉綠驗證，公開 consumer 欄位形狀維持不變。
- [x] 2.2 區分 valid-empty 與 unreadable，沿用 unknown 分支且不改寫草稿；以 1.3 轉綠及原始 config bytes 前後相同驗證。
- [x] 2.3 在 direct source 與 guided apply 測試加入同 scope 拒絕、不同 explicit scope 放行、preview 後草稿損壞；逐一驗證 409 分類及 source、mapping、audit、receipt、runtime 零副作用。
- [x] 2.4 保留 registered-only 可變更、真正 live／derived 依賴仍阻擋、receipt replay 與 preview ownership 分類的既有測試；全部通過才算共同 guard 無回歸。

## 3. 驗證與交付

- [x] 3.1 執行 `pnpm --filter @solar-display/server test src/services/sourceImpactService.test.ts src/routes/meter-sources.test.ts src/services/guidedMqttMappingService.test.ts src/routes/mqtt-guided-activation.test.ts`，記錄實際 red／green 結果與 shared pretest build。
- [x] 3.2 分別做 Standards／Spec review、修正 findings，執行 `pnpm verify` 並記錄各 stage 的真實結果；不以測試取代任何後續必要的現場驗收。
- [x] 3.3 更新 review 的修復證據、執行本案 `openspec validate --strict`、核對精準變更範圍，依 repo workflow 交付後續 archive／commit 狀態；未驗證、未歸檔不可宣稱 change 完成，commit 另需使用者確認。
