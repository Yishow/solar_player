## Context

server package script把 src/**/*.test.ts 交給 shell展開；sh沒有 globstar，導致 src root 的五個 tests未被執行。web 已使用一個小型 Node wrapper避開平台差異，deploy tests則完全不在 root test。目標是修入口，不改測試內容或導入新測試框架。

## Goals / Non-Goals

**Goals:**

- 明確列出並排序所有 server src tests。
- 維持 server concurrency one。
- 提供一個 root verify涵蓋 build、server、web、deploy與 runner tests。
- 任何 child failure可靠傳遞。

**Non-Goals:**

- 不新增 lint、coverage、CI或 e2e。
- 不平行化 server tests。
- 不更動既有 test fixtures來滿足計數。

## Decisions

### Deterministic Node-based server discovery

新增 `apps/server/scripts/run-tests.mjs`，以 Node filesystem walk從 `apps/server/src` 收集所有 .test.ts files、轉成相對 package root paths、lexical sort後一次交給 tsx --test --test-concurrency=1。明確列檔避免 shell、globstar與平台差異。

runner接受 explicit argv targets供 focused test使用；沒有 targets時才做完整 discovery。若 discovery為空或路徑無法讀取，直接 nonzero。

### Root verify is a serial stage runner

root `package.json` 新增 verify，序列執行 production build、server完整 suite、web suite、deploy suite與 server runner self-tests。test 仍作開發迴圈入口，但改為完整 server＋web，不包含 build；verify才是交付 gate。

序列化能讓 native SQLite與固定 fixtures避免交叉干擾，且輸出明確指出失敗 stage。

### Discovery and failure propagation are tested

`apps/server/scripts/run-tests.test.mjs` 以 temp tree驗證 root/nested test discovery、排序、explicit targets、tsx args與 child status propagation。另以 fixture child status證明頂層 test失敗會讓 root stage nonzero。

## Implementation Contract

- Behavior：server test不再漏掉 src root tests；root verify涵蓋所有既有 suites與 build。
- Interface：server package test接受 optional explicit targets；root提供 pnpm verify。stage labels固定為 build、server、web、deploy、server-runner。
- Failure modes：empty discovery、spawn error、signal termination、nonzero child都回傳非零，後續 stage不覆蓋原始失敗。
- Acceptance：runner self-tests通過；完整 run至少執行377 server、809 web、37 deploy既有 tests，再加 runner tests；五個 top-level names可在 discovery evidence中看見。
- In scope：package scripts、Node runner、runner tests、conventions手動繞路清理。
- Out of scope：test內容、lint、coverage、CI、browser smoke。

## Risks / Trade-offs

- [單次 argv太長] → 目前數百個相對 paths遠低於 macOS/Linux限制；runner test保留檔案數量 baseline，超過平台限制時再改分批。
- [Windows command resolution] → 沿用 web runner的 cmd.exe/tsx平台處理並加 unit test。
- [測試數成長讓固定計數過期] → acceptance使用既有基線的 at least語意並另外列 runner tests。

## Migration Plan

先使 server package test通過，再接 root test，最後新增 verify與更新 conventions。回滾只需還原 scripts與 package entries，不影響 runtime。
