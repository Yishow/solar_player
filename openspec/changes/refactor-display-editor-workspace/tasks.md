# Tasks｜重整展示編輯工作台、常駐工具列與情境面板

狀態：proposal-only；以下全部為待實作與待驗證項目，不因提案已寫好而打勾。

前置：無

## 1. Implementation and Verification

- [ ] 1.1 **Layout** — 建立page picker与工具分區，不再把頁面和資產/殼層tab混排。（U3-R1）
- [ ] 1.2 **Toolbar** — 抽出常駐EditorToolbar接既有undo/redo/save/preview/publish handlers和dirty/error狀態。（U3-R1）
- [ ] 1.3 **Inspector** — 依選取item capability組合內容/資料/外觀及advanced控制，技術id不佔主視覺。（U3-R2）
- [ ] 1.4 **Geometry** — 完成可收合/調寬面板及fit canvas，檢查resize/zoom不改config座標。（U3-R3）
- [ ] 1.5 **Accessibility** — 補面板與選取的鍵盤操作、visible focus、numeric alternatives与小桌面drawer行為。（U3-R3）
- [ ] 1.6 **Assets** — 改asset picker就地顯示，cancel/apply保留page/item/zoom/draft，套用僅指定path。（U3-R4）
- [ ] 1.7 **Shared** — 共用頁首頁尾分開save/dirty及影響scope標示，不借用page-save成功狀態。（U3-R5）
- [ ] 1.8 **Drafts** — 完成per-page draft preserve/discard與remote revision guard，導航回復原選取。（U3-R6）
- [ ] 1.9 **Compatibility** — 以模板區域、自由物件、卡片、圖片及資料卡各一例檢查舊能力均可達。（U3-R2 U3-R4）
- [ ] 1.10 **Verification** — 跑workspaceLayout与editor config/selection/publishing regression及pnpm verify，記錄三個desktop尺寸witness與操作任務結果。（U3-R1 U3-R2 U3-R3 U3-R4 U3-R5 U3-R6）

## 2. V2 Site-Setup Integration

- [ ] 2.1 **V2 Integration** — 接入E6/U6的唯一廠區計量設定與免手冊任務契約，完成本新增需求的API/UI整合與驗收情境。（U3-R7）

## Closeout Notes

每個 task 完成時記錄測試名稱、指令、exit code 與證據路徑；不能只寫「測過了」。當前未執行原生 Spectra analyze/validate/park、應用測試或部署。

Archive 與 commit 依 repo workflow 另行執行；不在本草案提前標記。
