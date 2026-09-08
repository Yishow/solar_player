## 1. 固定失敗情境

- [x] 1.1 Apply 開始時重新比對 GitHub main、本機 HEAD 與 review baseline，確認 R1–R4 仍存在並記錄差異；不得覆蓋使用者未提交工作。
- [x] 1.2 新增 R1 route/runtime 測試：新 Topic、broker 拒絕、同 key 重試與重新連線；先確認 baseline 無法通過訂閱啟用斷言。
- [x] 1.3 新增 R2 真正 packet 路徑測試：P1/P2 功率陣列、缺 tag、重複 tag、legacy scalar；先確認 baseline selector 不一致，並斷言 accepted energy history 零新增。
- [x] 1.4 新增 R3 正式 onboarding 入口與 capture/sample 整合測試、R4 真實目標確認與 stale-target 零 publish 測試；先記錄各自失敗原因，不只 mock 子元件 props。

## 2. 接通資料與啟用

- [x] 2.1 保存交易完成後接上既有 runtime 訂閱協調，新增 saved/activation 狀態与可重試原因；以 R1 測試驗證拒絕後不重複來源 revision、receipt，且 managed filters 不變。
- [x] 2.2 統一 reviewed power/energy selector 解析，依單位及種類分流寫入；使 R2 與既有 E1、MQTT ingestion 測試通過，確認功率不進入 kWh 歷史。
- [x] 2.3 補齊 capture sample 的有限保存、inspection 與獨立 active discovery；以未映射 Topic、授權拒絕、過期、feature off、stop/shutdown 測試驗證 production 不受影響。
- [x] 2.4 在正式 onboarding 父層保存來源／sample／Topic 並接通 selector preview/apply；以 routed journey 驗證真實可選欄位、back navigation 與缺樣本 retry。
- [x] 2.5 由 server 產生並驗證實際 test-publish confirmation，移除猜測 Topic 與固定待送值；以 R4 測試驗證 exact topic/payload、retain=false、取消零 publish、目標變更拒絕及既有呼叫端相容性。

## 3. 驗證與交付

- [x] 3.1 跑受影響 shared/server/web 測試及 `pnpm verify`，修正所有 findings；保存指令、實際結果與略過項目，不以 review baseline 的綠燈代替修復驗證。
- [x] 3.2 以隔離 synthetic broker 完成正常／失敗／重試的正式入口證據，提交使用者驗收管理畫面；若影響 playback，另依 `docs/ops/fhd-closeout.md` 完成必要 witness 與人工判定。
- [x] 3.3 核對本 change 的 delta specs、R1–R4 與 tasks 全部完成，才依工作流 archive；展示精準檔案範圍並取得另一次確認後才 commit，不自動 push。
