# Tasks｜未儲存綁定即時預覽、資料挑選與來源到展示接續

狀態：proposal-only；以下全部為待實作與待驗證項目，不因提案已寫好而打勾。

前置：E3 / repair-consumption-history-projections、U2 / add-guided-data-source-onboarding、U3 / refactor-display-editor-workspace

## 1. Implementation and Verification

- [ ] 1.1 **Contract** — 新增ephemeral request/response型別與256KiB限制，包含baseDraftVersion、clientEditRevision、context與fingerprint。（U4-R1 U4-R2）
- [ ] 1.2 **Server** — 重用page schema/catalog/compiler在記憶體compile unsaved config，不從saved config偷偷忽略draft。（U4-R1）
- [ ] 1.3 **Resolution** — 把E3 period metrics與原有readings透過同一resolver取值，拒絕raw register→period widget語意混用。（U4-R1 U4-R5）
- [ ] 1.4 **Security** — 加入management auth、site/page權限與有界cache；對不支援schema/body/unknown item回明確錯誤。（U4-R2）
- [ ] 1.5 **No-write test** — 以spy和資料庫before/after證明ephemeral不寫draft/live/history/device且MQTTpublish count為0。（U4-R1）
- [ ] 1.6 **Client** — 新增300ms debounce、abort與edit/context revision比對；A慢B快測試只能顯示B。（U4-R3）
- [ ] 1.7 **Context** — 統一workspace preview context，inherit與fixed scope分開顯示並測fixedCL在KNpreview不改設定。（U4-R4）
- [ ] 1.8 **Picker** — 新增MetricPicker顯示名稱/scope/種類/unit/value/age/coverage和不相容原因。（U4-R5）
- [ ] 1.9 **Handoff** — 承接U2 source identity，列相容page/items；選取只寫draft，取消返回DataHub完整context。（U4-R6）
- [ ] 1.10 **Presentation** — 加入unsaved/saved/formal stage標記，missing/estimated/stale/sample-only不誤報ready。（U4-R7）
- [ ] 1.11 **Verification** — 跑ephemeralDisplayPreviewService、ephemeralPreviewState與dataInspector/route tests及pnpm verify。（U4-R1 U4-R2 U4-R3 U4-R4 U4-R5 U4-R6 U4-R7）
- [ ] 1.12 **Integration** — 實跑接KN累積資料→選period metric→選卡片→未儲存預覽→返回/保存；記錄DB無非預期寫入。（U4-R1 U4-R5 U4-R6 U4-R7）

## 2. V2 Site-Setup Integration

- [ ] 2.1 **V2 Integration** — 接入E6/U6的唯一廠區計量設定與免手冊任務契約，完成本新增需求的API/UI整合與驗收情境。（U4-R8）

## Closeout Notes

每個 task 完成時記錄測試名稱、指令、exit code 與證據路徑；不能只寫「測過了」。當前未執行原生 Spectra analyze/validate/park、應用測試或部署。

Archive 與 commit 依 repo workflow 另行執行；不在本草案提前標記。
