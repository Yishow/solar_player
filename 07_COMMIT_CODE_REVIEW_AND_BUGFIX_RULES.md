# Commit、Code Review、Bugfix 規則

## Commit 必須使用繁體中文

所有 commit message 必須以繁體中文描述主要內容。

允許 conventional commit prefix，但描述必須繁中：

```txt
feat: 完成 Phase 1 專案骨架與 SQLite 初始化
fix: 修正 Phase 1 code review 發現的 SQLite schema 初始化問題
refactor: 重構 Phase 4 MQTT parser 與 topic mapping
chore: 更新 Phase 6 OpenAPI 與資料庫文件
```

不允許：

```txt
feat: implement phase 1 scaffold
fix: fix mqtt parser
```

## 每個 Phase 至少兩個 commit

每個 Phase 必須至少有：

1. 初版 commit
2. code-review 修正 commit

範例：

```txt
feat: 完成 Phase 5 Socket.IO 即時推送與離線錯誤頁
fix: 修正 Phase 5 code review 發現的 Socket 重複監聽問題
```

## Code Review 必做項目

每個 Phase 初版 commit 後，必須 code-review：

### 架構

- [ ] 是否符合 monorepo 結構
- [ ] 是否避免跨層引用混亂
- [ ] shared types 是否放在 packages/shared
- [ ] route / service / store 是否分層清楚

### TypeScript

- [ ] 是否 strict type
- [ ] 是否避免 any
- [ ] API response 是否有型別
- [ ] MQTT payload 是否有 parser guard
- [ ] DB row 是否有 mapping type

### API / OpenAPI

- [ ] 實作 endpoint 是否與 OpenAPI 一致
- [ ] request / response schema 是否一致
- [ ] 錯誤格式是否一致
- [ ] 無登入權限相關邏輯

### SQLite

- [ ] schema 是否與程式一致
- [ ] migration 是否可重複執行
- [ ] 累積值是否不會重啟歸零
- [ ] 寫入頻率是否合理

### MQTT

- [ ] 支援 `solar.zip` topic pattern
- [ ] prefix / factoryId 可設定
- [ ] 支援 summary object
- [ ] 支援 zone object
- [ ] 支援 `{ value }`
- [ ] payload 錯誤不會 crash
- [ ] timeout / reconnect 狀態正確

### Socket.IO

- [ ] event 命名一致
- [ ] reconnect 不重複 listener
- [ ] 前端 unmount 會 cleanup
- [ ] 後端 broadcast 不會過度頻繁

### UI

- [ ] 是否參考 `solar_complete_spec_md/UI`
- [ ] 是否使用 design tokens
- [ ] 1920x1080 是否不爆版
- [ ] 共用元件是否重用
- [ ] KPI / card / chart / form 是否一致

### 測試與文件

- [ ] typecheck 通過
- [ ] lint 通過
- [ ] build 通過
- [ ] test 或 smoke test 通過
- [ ] README / docs 有同步

## Bugfix 規則

code-review 發現問題後，必須：

1. 列出問題清單
2. 修正問題
3. 補必要測試或 smoke test
4. 再跑 typecheck / lint / build / test
5. 建立繁中修正 commit

## Phase 完成報告格式

每個 Phase 完成時，輸出：

```md
# Phase N 完成報告

## 已完成
- ...

## 測試結果
- pnpm typecheck: pass
- pnpm lint: pass
- pnpm build: pass
- pnpm test: pass / smoke test pass

## Commits
- feat: 完成 Phase N ...
- fix: 修正 Phase N code review ...

## Code Review 摘要
- 發現問題：...
- 修正方式：...

## 驗收狀態
- Phase N acceptance checklist: pass

## 下一步
- Phase N+1 需先執行 spectra-propose
```
