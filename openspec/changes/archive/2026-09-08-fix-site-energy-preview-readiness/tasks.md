## 1. 固定正式預覽與新設定路徑

- [x] 1.1 Apply 前核對最新 main、R9–R10 與期間一致性 change 的共用介面；交付差異紀錄，確認沒有重複計算核心或覆蓋未提交工作。
- [x] 1.2 新增 R9 真正 profile preview route 測試：完整端點、缺基準、草稿時區與 calculator failure；先確認 baseline 的 calculator=null 會使完整資料案例失敗。
- [x] 1.3 新增 R10 從 profile=null 開始的 routed UI 測試，保留預設 site-main 完成 review；加入切換分母後切回的等價性與 client 偽造 ready 測試，記錄 baseline 失敗原因。

## 2. 接通計算與權威狀態

- [x] 2.1 建立 shared preview 回應契約與明確 review context，接上凍結的草稿／來源快照計算；使 R9 數值及時區測試通過，斷言不建立假正式 revision、不寫 production history/projection。
- [x] 2.2 實作共用後端 readiness 與診斷，拒絕只信 client status；以完整／單一讀值／未審查來源及新資料到達測試驗證 ready、waiting、invalid 的正確轉換。
- [x] 2.3 更新 SiteEnergySetupPanel 使用真實預覽結果及後端狀態，移除分母 onChange 的 ready 捷徑；使 R10 預設路徑、錯誤重試、back navigation 與缺基準提示測試通過。
- [x] 2.4 保留原來源快照、版本衝突與 idempotency 防護，對齊發布前 readiness 檢查；以 source stale 零寫入、重試不重複 revision 及已指派頁面的 preflight 測試驗證。

## 3. 整合與驗收

- [x] 3.1 執行 source-review、profile、period 與 web journey suites，以及 `pnpm verify`；保存實際指令與结果，確認正常預覽不發 MQTT、不修改正式歷史。
- [ ] 3.2 用隔離資料完成全新 CL/KN 設定、既有設定編輯、缺資料與來源衝突四種 review 畫面證據；依工作流取得使用者驗收，必要時補 playback FHD witness。
- [ ] 3.3 核對 R9–R10、specs、測試與驗收後才 archive；展示精準變更範圍，另獲確認才 commit，不自動 push。

### Archive 例外紀錄

- 2026-09-08 已完成隔離環境畫面檢查，但 3.2 的人工驗收未執行，因此維持未完成。
- 使用者明確指示「直接歸檔」，change 已在 3.2、3.3 原定門檻未完成時歸檔。此例外不代表人工、production、MQTT、deployment 或 FHD 驗收通過；commit 仍須另行確認。
