# Spectra 工作流規則

本專案所有 Phase 都必須使用 Spectra 工作流。開發 agent 不可直接修改程式碼，必須先提 proposal，再 apply。

## 每個 Phase 的固定流程

每個 Phase 一律使用以下流程：

```txt
1. spectra-propose
2. proposal 自我檢查
3. spectra-apply
4. typecheck / lint / build / test
5. 繁體中文 commit
6. code-review
7. fix bugs
8. typecheck / lint / build / test
9. 繁體中文 commit
10. 驗收
11. 進入下一 Phase
```

## spectra-propose 要求

每次進入新 Phase 時，先執行 `spectra-propose`，proposal 必須包含：

- Phase 目標
- 影響範圍
- 要新增或修改的檔案
- API 變更
- DB schema 變更
- OpenAPI 變更
- Socket.IO event 變更
- MQTT topic mapping 變更
- 前端 UI 對照哪些 `solar_complete_spec_md/UI` 檔案與範例圖
- 設計 token 使用方式
- 測試策略
- 風險與回滾方式
- 預計 commit message，必須繁體中文

### spectra-propose 輸出模板

```md
# Phase N Proposal

## 目標

## 參考資料
- solar_complete_spec_md/...
- solar_complete_spec_md/UI/...

## 修改範圍

## Frontend Plan

## Backend Plan

## Database Plan

## OpenAPI Plan

## MQTT / Socket Plan

## UI / Design Token Plan

## Test Plan

## Risk / Rollback

## 預計 Commit
- feat: 完成 Phase N ...
```

## spectra-apply 要求

proposal 確認後才能執行 `spectra-apply`。實作時必須：

- 只做該 Phase 範圍內的事情
- 不偷跑下一個 Phase
- 不移除已完成 Phase 的功能
- 每次修改 API 必須同步更新 `docs/openapi.yaml`
- 每次修改 DB 必須同步更新 `docs/database-schema.sql`
- 每次新增共用型別必須放在 `packages/shared`
- 每次新增 UI 必須使用 design tokens，不可硬編散落顏色
- 每個 page 的 layout 必須對照 `solar_complete_spec_md/UI` 的分頁規格與範例圖

## code-review 要求

每個 Phase 完成初版 commit 後，必須進行 code-review。code-review 必須檢查：

- TypeScript 型別是否嚴格
- 是否有不必要的 `any`
- 是否有重複邏輯
- 是否有巨型 component
- 是否遵守 monorepo 結構
- API response 是否一致
- OpenAPI 是否與實作一致
- SQLite schema 是否與程式一致
- MQTT parser 是否容錯
- Socket listener 是否會重複註冊
- UI 是否符合 design tokens
- UI 是否符合 1920x1080 kiosk
- 是否有錯誤處理與 fallback
- 是否有基本測試或 smoke test

## fix bugs 要求

code-review 後必須修正問題。修正範圍包含：

- bug
- 型別錯誤
- build error
- lint error
- API mismatch
- DB migration mismatch
- UI overflow
- MQTT topic 解析錯誤
- Socket reconnect 問題
- 缺少文件

修完後必須再次執行：

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

若專案尚未建立某些 script，該 Phase 必須補上或說明替代 smoke test。

## Commit 規則

每個 Phase 至少兩個 commit：

1. 初版完成 commit
2. code-review 修正 commit

commit message 必須繁體中文。

範例：

```txt
feat: 完成 Phase 4 MQTT 連線與 topic mapping 初版
fix: 修正 Phase 4 code review 發現的 MQTT payload 解析與重連問題
```

## 禁止事項

- 禁止跳過 `spectra-propose`
- 禁止跳過 code-review
- 禁止未修 bug 就進下一個 Phase
- 禁止英文 commit 主描述
- 禁止加入登入、JWT、OAuth、RBAC
- 禁止未同步 OpenAPI 就新增 API
- 禁止未同步 database-schema 就新增 table
- 禁止 UI 不參考 `solar_complete_spec_md/UI`
