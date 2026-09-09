## 1. 固定回歸證據

- [x] 1.1 在 `sourceImpactService.test.ts` 以正式 registry save 建立 `custom.*` KN-only 公式，加入 explicit KN 與 output-site + siteScopes KN 兩個 CL 誤擋回歸；確認修復前兩例因 CL 被阻擋而失敗，並保留 KN 仍阻擋的正向斷言。
- [x] 1.2 加入 explicit CL/KN/global、all、output-site 雙廠/省略 siteScopes 與 disabled configured definition 矩陣；以每個 scope 的 consumers/canMutate/unknown 斷言驗證原契約沒有被放寬。

## 2. Scope 與未知證據判定

- [x] 2.1 重用或抽出狹小的有效 derived-input scope resolver，讓 registry 與 impact 共用同一展開語意；執行 shared derived-metric 及 server registry tests，確認既有求值與 scope 展開結果不變。
- [x] 2.2 將 impact 的 derived 分支改為讀 matching inputs 與 owning scope 證據，依有效 scope 篩選；以 1.1、1.2 測試轉綠驗證，不改 draft/live 或 structural-expectation shape。
- [x] 2.3 對 matching input 的缺失 owner、invalid selector、必要 siteScopes 壞 JSON/空值/未知值維持 unknown；以隔離 corruption fixtures 驗證 `E1_SOURCE_IMPACT_UNKNOWN` 與原始 evidence bytes 不變，並驗證真正無相依仍 known-empty。

## 3. 雙路徑與整合驗證

- [x] 3.1 擴充 `source-impact-mutation.test.ts`，覆蓋 direct/guided 的 disable 與 rename：跨 scope 放行、same scope 拒絕；拒絕前後 source、mapping、audit、receipt 與 runtime call 快照一致。
- [x] 3.2 加入 preview 後新增 derived input 或變更 siteScopes 的 first-apply 測試，以及 unchanged committed replay 測試；驗證 commit-time 重查仍阻擋新增的同廠相依，既有 replay 不新增 mutation。
- [x] 3.3 執行 `pnpm --filter @solar-display/server test src/services/sourceImpactService.test.ts src/routes/source-impact-mutation.test.ts src/services/guidedMqttMappingService.test.ts src/services/derivedMetricRegistryService.test.ts`、相關 shared tests 與 `pnpm verify`，記錄各命令實際結果及 skip 原因。
- [x] 3.4 分別完成 Standards 與 Spec review，執行 `openspec validate fix-derived-source-impact-scoping --strict` 與 diff 檢查，更新 review 證據；確認沒有 schema/UI/正式資料改動，不在未授權下 commit 或 push。
