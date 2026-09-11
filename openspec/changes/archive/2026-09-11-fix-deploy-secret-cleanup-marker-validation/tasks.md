## 1. 安全重現清理繞過

- [x] 1.1 在 scripts/deploy.test.mjs 以獨立暫存根及 sudo/bootstrap 替身，在 bootstrap 後破壞 marker content 與 mode 644，斷言 marker/payload/parent 保留、cleanup unknown、整體非零；保存 RED，對應 Receiver cleanup preserves paths when ownership validation fails，禁止真實 sudo/SSH 或秘密。
- [x] 1.2 在同一測試檔新增 marker owner/binding/type/containment/unreadable 的 fixture 矩陣，以及 mkdir 前既有 parent/sentinel，檢查路徑與 bytes 不變；明確記錄每個失敗驗證點，不以只看 exit code 代替安全斷言。

## 2. Fail-closed 清理與退出

- [x] 2.1 在 scripts/raspi-onekey-deploy.sh 的 receiver_cleanup 落實「完整驗證是唯一刪除入口」，移除 validation failure 後的較弱刪除 fallback；執行 invalid-marker fixtures，確認任何完整驗證失敗都保留精確候選路徑並回報 unknown。
- [x] 2.2 落實「建立狀態與 cleanup 結果」，只在 parent 真正建立後記錄 ownership；更新 scripts/deploy.test.mjs 的 partial marker stat failure fixture 為保留/unknown，驗證未建立 candidate 不被清理、不被宣稱 owned，descriptor 仍關閉。
- [x] 2.3 落實「Unknown 必須影響退出與恢復資訊」，bootstrap 0 加 cleanup unknown 必須非零、原非零不可變成功；以 local handoff fixtures 驗證 exact-owned recovery path、無 payload/密碼輸出及無 wildcard cleanup 指示。
- [x] 2.4 在 scripts/deploy.test.mjs 補完整 validated normal/signal cleanup、刪除失敗與重入情境，驗證只刪本次精確路徑、確認移除才回報 ok、descriptors 關閉且原始失敗保留。

## 3. 審查與交付證據

- [x] 3.1 執行 bash -n scripts/raspi-onekey-deploy.sh 與 node --test scripts/deploy.test.mjs，確認 syntax、secret frame、input precedence 與正常清理 regressions 通過；記錄平台 skip，不以本機替身宣稱 Pi 驗證。
- [x] 3.2 主代理 review 最終 source/diff，分開核對 Standards 與 raspi-onekey-kiosk-deployment Spec，執行安全 audit 並修正本範圍 findings；逐條確認刪除入口皆完整驗證、沒有 caller-owned 路徑處理或秘密洩漏。
- [x] 3.3 最終版本執行 pnpm verify 與 spectra validate fix-deploy-secret-cleanup-marker-validation，建立檔案範圍、回復依據、PASS/FAIL/NOT RUN 與 remaining cleanup recovery 限制的 checkpoint；未實際部署 Pi 時明列現場驗證 NOT RUN。
