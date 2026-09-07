# Tasks｜集中草稿保存、影響檢查與安全發布

狀態：實作中；以下全部為待實作與待驗證項目，不因提案已寫好而打勾。

前置：U2 / add-guided-data-source-onboarding、U3 / refactor-display-editor-workspace、U4 / add-unsaved-binding-preview

## 1. Implementation and Verification

- [ ] 1.1 **State** — 建立publish review狀態機與dirty→save→check順序，save失敗不得publish。（U5-R1）
- [ ] 1.2 **Preflight** — 建立preflight result含exact draft版本、fingerprint、結構dependency revision、diff/impact/findings與短期token。（U5-R1 U5-R2）
- [ ] 1.3 **Server guard** — publish執行expectedVersion/token檢查與最新readiness，舊route/client也不可跳過必要server validation。（U5-R2）
- [ ] 1.4 **Concurrency** — 以draft8→9及asset/source revision變更測試TOCTOU拒絕；live數值更新不造成永遠無法發布。（U5-R2）
- [ ] 1.5 **Findings** — 建立中文可行動訊息與item/field定位，保留code於details，修正後重查。（U5-R3）
- [ ] 1.6 **Policy** — 依卡片required data與fallback policy分類stale/partial warning或blocker，缺asset與incompatible binding阻擋。（U5-R3）
- [ ] 1.7 **Shared scope** — 接U2 impact，明確區分page/source/shared-shell保存，impact unknown不得視0。（U5-R4）
- [ ] 1.8 **Review UI** — 統一PublishReviewDrawer顯示差異、影響、修正與確認，toolbar跳入同一路徑，移除誤導重複入口。（U5-R1 U5-R3 U5-R4）
- [ ] 1.9 **Evidence** — 顯示draft-saved/server-published/device-applied三層；只有matching ack可applied，無ack就unknown/pending。（U5-R5）
- [ ] 1.10 **Recovery** — 加入operation idempotency、失敗保持旧live與draft recovery測試。（U5-R6）
- [ ] 1.11 **Verification** — 跑displayPublishPreflightService、publishReviewState、display-pages authorization/publish regression及pnpm verify。（U5-R1 U5-R2 U5-R3 U5-R4 U5-R5 U5-R6）
- [ ] 1.12 **Acceptance** — 以缺圖/缺資料/並行修改/離線裝置完成一次修正→再檢查→發布witness，不用online畫面冒充套用證據。（U5-R2 U5-R3 U5-R5 U5-R6）

## 2. V2 Site-Setup Integration

- [ ] 2.1 **V2 Integration** — 接入E6/U6的唯一廠區計量設定與免手冊任務契約，完成本新增需求的API/UI整合與驗收情境。（U5-R7）

## Closeout Notes

每個 task 完成時記錄測試名稱、指令、exit code 與證據路徑；不能只寫「測過了」。當前未執行原生 Spectra analyze/validate/park、應用測試或部署。

Archive 與 commit 依 repo workflow 另行執行；不在本草案提前標記。

## 2026-09-06 Review follow-up

本輪回讀程式與規格後，將僅部分實作或缺驗證的任務重開；已存在的程式保留。修復範圍、缺口與最終驗證見 [整合追蹤](../verify-energy-authoring-journeys/review-followup.md)。未因本輪局部修復宣告整項契約完成。
