## Problem

P2 修正：從 6d32fdb2a96419195a4bc31a05a02114c59705d2 到 7cd215f52f3c9af5cd50c98ed87eab55a93d09be 的 review 已重現儲存回應亂序造成快取退版。overview draft v4 的儲存 R1 尚未回應時，切換頁面再返回；R2 收到最新 v5 衝突後以 baseVersion 5 重試並儲存 v6，R1 的 v5 才返回。作用中 session 留在 v6，但共用 cache 變成 v5，remount 顯示舊內容。

## Root Cause

useDisplayPageConfig 的 commitServerEnvelope 在檢查 owner lifecycle 之前無條件呼叫 primeDisplayPageConfigCache。既有 per-key generation 阻止舊 read，沒有阻止較舊 save success 或 409 latestEnvelope 覆蓋已確認的新版本。

## Proposed Solution

- 在 matching stage/page 的權威 envelope 發布入口比較候選與已確認版本；低版本不得發布、使新 read 失效或改變新 owner 狀態，同版本為冪等處理。
- 合法較新 save/conflict envelope 仍可在原 owner 切頁或 unmount 後更新 matching cache；各 owner 的草稿、訊息與 loading 繼續依自己的 lifecycle/currentness 決定。
- 增加真實 React mounted-hook 的亂序成功、亂序衝突、remount 與下一次 baseVersion 驗證，保留已有 read generation 與 draft/live isolation。

## Success Criteria

- 上述 R1/R2/retry 時序完成後 cache、remount 與下一次 save baseVersion 都為 6，較早回應不覆蓋新版內容。
- 較舊 409 latestEnvelope 不降版 cache/session baseline；本地未儲存草稿保留。
- 同版本回應不造成新的 cache barrier；合法較新回應仍可跨 unmount 完成 cache publication，其他 page/stage 不變。
- 最終 mounted-hook regressions、受影響 web tests、兩軸 code review 與 pnpm verify 通過。

## Capabilities

### New Capabilities

- （無）

### Modified Capabilities

- management-draft-save-concurrency：補齊權威 save/conflict 回應的版本順序與冪等發布契約。

## Impact

- Affected specs：management-draft-save-concurrency。
- Affected code：
  - Modified：apps/web/src/hooks/useDisplayPageConfig.ts
  - Modified：apps/web/src/hooks/useDisplayPageConfig.test.ts
  - New：（無）
  - Removed：（無）
- Server API、資料庫 schema、實際版號生成與 FHD 視覺不變；本提案只建立 artifacts，所有實作任務保持未完成。
