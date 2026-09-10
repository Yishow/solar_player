## 1. 紅燈回歸測試

- [x] 1.1 為 Synchronize successful display-page draft saves with the stage-page cache 與 Preserve conflict drafts while advancing the newest display-page baseVersion，在 apps/web/src/hooks/useDisplayPageConfig.test.ts 建立 jsdom/react-dom mounted hook RED cases；實際 save v4→v5、unmount/remount 與下一次 save baseVersion=5，另測普通 failed save cache=4、409 latest cache/baseline=6 且 local edits/dirty 保留、retry baseVersion=6。先確認目前缺陷被實際操作捕捉。
- [x] 1.2 同一 test file 依 Invalidate older display-page reads when a newer envelope is committed 補 deferred read success/rejection、active hydration/reload、stale finally、新 pending 不被刪除、public loader 不交付 obsolete result、外部 prime 與 current read 不自我失效的 RED cases；保留 page/stage isolation 與既有 warm/force-failure assertions。

## 2. Cache 與 save commit

- [x] 2.1 依 Decision 1: Save envelope commits cache and session through one write path，讓 useDisplayPageConfig.save 成功取得 DisplayPageConfigEnvelope 後，以同一 stage:page key 更新 module cache 與 active session，確保 session 的 config、lastLoadedEnvelope、fallbackPolicy、dirty 與 remount 都反映 returned version；以 1.1 的 save v5/remount v5 assertions 驗證。
- [x] 2.2 依 Decision 2: Per-key read currentness covers pending and every consumer，在 apps/web/src/hooks/useDisplayPageConfig.ts 讓 external prime/save/conflict 先推進 per-key generation 並 detach 舊 pending，正常 read publication 不自我失效；保留 Promise identity-finalizer，公開 loader 對 superseded read 取最新 cache/current outcome。以 1.2 驗證 stale payload/error 不交付 consumer、新 pending 不被舊 finally 刪除。
- [x] 2.3 在同一 hook 的 hydration/reload success/catch/finally 接上 module currentness、owner requestId/page/stage/lifecycle；save 先失效舊 load 再 publish，同時釋放接管的舊 loading，較新 request loading 不受 stale finally 影響。以 1.2 mounted deferred cases 證明 cache 與 active session 都不降版、不殘留 loading，且其他 local drafts 不被 cache publication 丟棄。

## 3. Conflict 與相容性

- [x] 3.1 依 Decision 3: Keep conflict session local while advancing the newest baseVersion，固定將 409 latestEnvelope 以同一 barrier 發布 cache，active config/dirty 保留，只 rebase baseline/lastLoadedEnvelope；以 1.1 驗證 next save baseVersion=6、cache=6、draft edit 未丟失且沒有誤報 success。
- [x] 3.2 保持 shared-registry-config-warm-cache 所要求的 live/draft fallback 與 stage/page isolation，普通 failed save 不發布未確認 snapshot，409 則遵守 3.1；以既有 warm-cache/force-failure、public loader compatibility 與 isolation tests 驗證，不把目前真實 force-read failure 吞成成功。

## 4. 綠燈與交付閘門

- [x] 4.1 完成 Synchronize successful display-page draft saves with the stage-page cache、Invalidate older display-page reads when a newer envelope is committed 與 Preserve conflict drafts while advancing the newest display-page baseVersion 的 GREEN focused suite，執行 pnpm --filter @solar-display/web test -- src/hooks/useDisplayPageConfig.test.ts，確認 v5 cache/session、late read、isolation、conflict retention 與 newest baseVersion 全數通過。
- [x] 4.2 review 最終 scoped diff 與 git diff --check，逐項核對三個 requirements/scenarios 與三個 Decisions；修完 findings 並重跑 focused tests，確認只涉及 apps/web/src/hooks/useDisplayPageConfig.ts 及其 test，無 server/API、其他 cache、visual/layout、FHD 或 deploy 變更。
- [x] 4.3 review/focused tests 完成後，以最終版本執行 pnpm verify，保存 PASS/FAIL/NOT RUN 結果；明列 browser、production、deployment、FHD 與人工 acceptance 未驗證，不以 local gate 取代。
