## 1. 重現與固定驗收

- [x] 1.1 在 apps/web/src/hooks/useDisplayPageConfig.test.ts 增加 mounted v4 R1→切頁返回→R2 409 v5→retry v6→R1 v5 測試，確認修正前 cache/remount 退版；保存 RED 輸出及下一次 baseVersion 斷言，對應 Authoritative display save responses preserve confirmed version order。
- [x] 1.2 在同一測試檔以 deferred responses 補較舊 409 與同版本回應情境，驗證本地草稿不丟失、較新在途 GET 不被 rejected/unchanged 回應失效；記錄可重現的失敗斷言。

## 2. 最小實作與回歸

- [x] 2.1 在 apps/web/src/hooks/useDisplayPageConfig.ts 實作「權威回應版本准入」，save success 與 conflict latest 共用 matching stage/page 的 lower/equal/higher 判斷；執行前述 mounted tests，確認版本與內容不退版、同版本不新增 barrier。
- [x] 2.2 在同一 hook 落實「Cache 與 owner 狀態分開收斂」，current owner baseline 不採用被拒絕候選，舊 owner 不改新 owner 草稿/訊息/loading；以 remount、後續 baseVersion 及 pending operation 斷言驗證。
- [x] 2.3 在 apps/web/src/hooks/useDisplayPageConfig.test.ts 補較新 save unmount 後仍發布 matching cache、跨 page/stage 隔離、普通失敗保留草稿及舊 GET fencing，執行 pnpm --filter @solar-display/web test 確認新舊 regressions 全數通過。

## 3. 審查與交付證據

- [x] 3.1 主代理 review 最終 source/diff，分開檢查 Standards 與 management-draft-save-concurrency Spec，執行安全 audit 並修正本範圍 findings；以每項 finding 的關閉證據確認沒有跨資源改造或 owner 回歸。
- [x] 3.2 修正完成後重跑 pnpm verify 與 spectra validate fix-display-page-save-response-ordering；依實際輸出記錄 PASS/FAIL/NOT RUN，建立僅涵蓋本次檔案、回復依據與未完成事項的 checkpoint，未驗證結果不得標完成。
