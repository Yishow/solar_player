# Test Plan｜以累積電錶差值計算日／月／年用電

## Status

以下是必須建立並執行的測試，不是已通過報告。本包 review 中的公式檢查只檢查合成數值與提案結構，不替代這些測試。

## Proposed Test Locations

- `apps/server/src/services/periodConsumptionService.test.ts`（受影響的既有檔或規劃新增測試檔，apply 時確認）。

## Requirement / Scenario Traceability

| Requirement | Scenario | 建議驗證層 | 明確完成條件 |
|---|---|---|---|
| E2-R1 | E2-R1-S01 — Daily monthly yearly example | service＋SQLite＋API | day=300, month=4300 and year=8300 kWh; none equals the register 9300 |
| E2-R1 | E2-R1-S02 — Duplicate observations | service＋SQLite＋API | consumption is 250 kWh, not 40450 kWh and not 350 kWh |
| E2-R2 | E2-R2-S01 — Taipei month boundary | service＋SQLite＋API | the start instant is 2026-08-31T16:00:00Z regardless of the host time zone |
| E2-R2 | E2-R2-S02 — Leap day and year rollover | service＋SQLite＋API | February has 29 daily buckets and an endpoint is never counted as energy twice |
| E2-R3 | E2-R3-S01 — Bounded prior sample | service＋SQLite＋API | the delta is returned with estimated-boundary quality and a -20 second start offset |
| E2-R3 | E2-R3-S02 — Missing month start | service＋SQLite＋API | the full month-to-date value is null; only separately labeled observed partial consumption may be returned |
| E2-R4 | E2-R4-S01 — Idle meter | service＋SQLite＋API | valueKwh is 0 with valid quality |
| E2-R4 | E2-R4-S02 — Only one observation | service＋SQLite＋API | valueKwh is null and the issue explains the missing endpoint or baseline |
| E2-R5 | E2-R5-S01 — Unknown decrease | service＋SQLite＋API | the result is invalid, not 0, 10, 1190 or 1210 |
| E2-R5 | E2-R5-S02 — Verified rollover | service＋SQLite＋API | consumption is 30 kWh with rollover provenance |
| E2-R5 | E2-R5-S03 — Reset with missing closing read | service＋SQLite＋API | the full value is null/partial and known segment values remain labeled as partial |
| E2-R6 | E2-R6-S01 — Midday restart | service＋SQLite＋API | the same day totals 300 kWh, not 50 kWh |
| E2-R6 | E2-R6-S02 — Late cross-midnight sample | service＋SQLite＋API | the applicable earlier period is recomputed by source time and the newest live observation does not move backward |
| E2-R7 | E2-R7-S01 — Known month endpoints and daily gap | service＋SQLite＋API | month energy is 6000 kWh while affected daily buckets remain gaps; the sum of known days is not falsely labeled the complete month |
| E2-R7 | E2-R7-S02 — No second differencing | service＋SQLite＋API | 100 kWh is used once; no difference is taken between consecutive daily totals |
| E2-R8 | E2-R8-S01 — Decimal preservation | service＋SQLite＋API | the result is exactly 0.250 kWh before display rounding |
| E2-R8 | E2-R8-S02 — Repeated stale snapshot | service＋SQLite＋API | sample freshness remains stale and no new boundary observation is invented |
| E2-M1 | E2-M1-S01 — Independent midnight rollover | service＋SQLite＋API | CL changes only its own period state and KN retains its independently persisted baseline |
| E2-M1 | E2-M1-S02 — Restart with consumption evidence | service＋SQLite＋API | it resumes the same period calculation and preserves the original source timestamps without inserting mock readings |
| E2-M1 | E2-M1-S03 — Unproven baseline | service＋SQLite＋API | the consumption result is unavailable or explicitly partial, never a valid zero or the current register |

## Execution and Evidence

1. 在隔離的測試資料庫與可注入 clock 下先使指定情境失敗，再完成實作；用生產路徑 ingest/resolver/API 驗證，不直接注入 UI state 冒充整合。
2. 依 repo 現行 package scripts 跑受影響 server/web 測試並保存實際输出，最後執行 pnpm verify。
3. 有 UI 變更時另外驗證 keyboard、1366×768、1440×900、1920×1080；牽涉 playback/editor 時依 repo FHD 流程產生 fresh evidence。
4. 實作完成後把實際結果放入本 change 的驗證紀錄；缺工具、樣本或人工驗收明確標示 not run / pending，不提前 archive。

## Evidence Record Fields

Run identifier; reviewed commit; command; exit code; test/fixture identifier; actual result; screenshot/gap-note path when relevant; unresolved findings; human acceptance status.
