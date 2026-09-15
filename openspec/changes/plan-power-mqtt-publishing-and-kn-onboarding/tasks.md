## 1. 登錄與部署前置
- [ ] 1.1 核對新 main 的 active DDE 路徑，記錄同 VIEW 登入 Session 條件與禁止 service-mode 的驗收（PMQ-R1）。
- [ ] 1.2 把 code-default-unverified 的 CL tags 與 KN reserved tags 轉為逐筆待審登錄；不啟用未確認點位（KNP-R1）。
- [ ] 1.3 經現場審查 source technology、Item、物理錶號、計量邊界、CT/PT、時間及品質限制，建立可追蹤批准紀錄。

## 2. 發布端有界契約
- [ ] 2.1 在不改 legacy 意義下加入 v1 site/publisher/tag 設定、唯一持久 Client ID 與同 topic 單一 active owner 驗證（PMQ-R2）。
- [ ] 2.2 修改 DDE→reader→state 路徑保留 decimal lexeme、逐點 readAt/sourceTimestamp/quality；用大數小差值 fixture 驗證（PMQ-R3）。
- [ ] 2.3 實作 sampleId 固定重送、有限等待與結果未知、讀取失敗／cache age guard、重新連線後新採集；不補灌 outage（PMQ-R4）。
- [ ] 2.4 實作 virtual member validity、公式 revision 與 calculation-only 標記，不將 lifetime sum 當物理錶（PMQ-R5）。
- [ ] 2.5 分離 raw/virtual live 與 snapshot/status/heartbeat，保持 Solar 舊格式／retain 完全不變（PMQ-R7）。

- [ ] 2.6 區分 publisher saved/effective connection，缺熱切換能力時顯示受控重啟必要，不假成功。

## 3. Player 接收與預覽
- [ ] 3.1 在登錄 v1 topic 的 generic fallback 前加入共用 bounded envelope gate；錯誤無 accepted writes（PMQ-R6）。
- [ ] 3.2 將 protocol/publisher/tag registry revision 納入 M2 canonicalDraft/token，preview/runtime 共用驗證；不多建 history writer。
- [ ] 3.3 持久 sample 去重窗口覆蓋 replay age；測 dup=false 重送與不同真讀取相同值（PMQ-R4）。
- [ ] 3.4 保留 E1 source-required 與已審核估計規則；readAt/publishedAt/legacy ts 不代替 source time（PMQ-R3）。
- [ ] 3.5 配置明確批准的 site-scoped discovery profiles；接 A–E 來源分類、唯讀上游與 receiver ownership UI。

- [ ] 3.6 實作 unknown sourceQuality 預設 block 與逐來源 limitation approval；綁 review revision/token，不放寬 E1。

## 4. 遷移與 KN 啟用
- [ ] 4.1 CL legacy/v1 shadow 比對 20 raw 候選／10 virtual 公式；逐筆確認現場存在性，不把 code defaults 當盤點（PMQ-R8）。
- [ ] 4.2 測 single-writer guarded cutover、版本連續性／epoch、rollback 不刪歷史不退 Solar 訂閱（PMQ-R8）。
- [ ] 4.3 KN 先接已確認的消耗累積／獨立購電資料；無 kW 不造功率，無部門不複製 CL（KNP-R2）。
- [ ] 4.4 完成 KN-POWER-ROLLOUT 的現場／shadow／E1／E6／展示分段證據，未過 gate 不宣告完成（KNP-R3/R4）。

## 5. 驗證與文件
- [ ] 5.1 執行 PM01–PM20、KN01–KN08 契約案例；分列單元、隔離 Broker 與真 Windows/DDE 結果。
- [ ] 5.2 在 Windows module 執行 opc_mqtt 對應 tests，並跑 solar_mqtt_go 受影響回歸；不得用非 Windows stub 代替 DDE 驗證。
- [ ] 5.3 依 repo conventions 執行受影響 Player tests 與最終 pnpm verify；額外 module 測試不可宣稱已被 root gate 涵蓋。
- [ ] 5.4 執行正式 OpenSpec/Spectra analyze/validate、最終跨 change review，保留未完成現場／人工驗收；滿足條件才 archive。
