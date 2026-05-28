/goal 依照既有 roadmap 與 6 個 Spectra changes，從 foundation 到各頁 surface/功能補齊一路實作到完成，並在最後用 agent-browser 驗證 `/settings/playback`、`/slideshow-preview`、`/settings/images`、`/settings/mqtt`、`/settings/circuits`、`/device-status` 的最終行為與畫面一致性。

First action:
1. 先閱讀 `docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md`
2. 依序閱讀下列 changes 的 `proposal.md`、`design.md`、`specs/**/*.md`、`tasks.md`
   - `openspec/changes/establish-display-ops-surface-token-primitives`
   - `openspec/changes/align-playback-settings-and-slideshow-preview-ops-surfaces`
   - `openspec/changes/complete-image-management-governance-surface`
   - `openspec/changes/complete-mqtt-settings-operations-surface`
   - `openspec/changes/complete-circuit-settings-operations-surface`
   - `openspec/changes/complete-device-status-observability-surface`
3. 回報：
   - roadmap 的執行順序
   - 6 個 changes 的任務數
   - 每個 change 的主要驗證方式
4. 不要停在分析；回報完就照順序繼續實作。

Scope:
- Repo: `solar_player`
- 只處理 roadmap 與上述 6 個 changes 直接涵蓋的 surface、shared primitives、tests、必要 docs/runbook 調整。
- 主要頁面：
  - `/settings/playback`
  - `/slideshow-preview`
  - `/settings/images`
  - `/settings/mqtt`
  - `/settings/circuits`
  - `/device-status`

Constraints:
- 必須以 roadmap 的順序執行：
  1. `establish-display-ops-surface-token-primitives`
  2. `align-playback-settings-and-slideshow-preview-ops-surfaces`
  3. `complete-image-management-governance-surface`
  4. `complete-mqtt-settings-operations-surface`
  5. `complete-circuit-settings-operations-surface`
  6. `complete-device-status-observability-surface`
- 每個 change 開始前先跑：
  - `spectra analyze <change>`
  - `spectra validate <change> --strict`
- 每個 change 必須完整走完這個循環後才能進下一個：
  1. 依 `tasks.md` 實作
  2. 跑受影響測試
  3. 做一次 code review，以 bug / risk / regression / missing tests 為主
  4. 修掉你自己 review 找出的問題
  5. 重跑相關測試
  6. 更新 graph：`graphify update .`
  7. 以繁體中文撰寫 commit message 並 commit
- 每個 change 的 code review 不可流於摘要，必須明確列出 findings；若無 findings，要明講無 findings 與剩餘風險。
- 最後一個 change 完成後，必須用 `agent-browser` 實際檢查所有目標頁面，而不是只看 code 或測試。
- `agent-browser` 驗證至少包含：
  - 開頁成功
  - 主要 action / status / summary / triage surface 存在
  - 頁面間 design-token / surface family 一致性符合 roadmap
  - 高風險頁的 state readability 沒退化
- 不可把 `/settings/assets` 或 `/shell-decorations/editor` 恢復成第一層主導航。
- 不可用泛用重構擴大 scope；只做這 6 個 changes 直接需要的修改。
- 不可用改測試來掩蓋 regression。
- 遵守 repo `AGENTS.md` 與 Spectra workflow。
- 若 worktree 有不屬於本目標的既有變更，不要回退它們。

Done when:
1. 6 個 changes 全部完成實作，且各自相關 `tasks.md` 均已落地到 code / tests / docs。
2. 每個 change 都留下一個繁體中文 commit，且 commit 前都完成「實作 → 測試 → code review → fix bugs → 重測 → graphify update .」循環。
3. 每個 change 都至少跑過一次：
   - `spectra analyze <change>`
   - `spectra validate <change> --strict`
   並在最終回報中附上結果摘要。
4. 受影響測試全部通過；至少包含相關 web tests，並列出你實際跑過的精確命令。
5. `agent-browser` 已完成對 6 個目標頁面的最終驗證，並回報每頁：
   - 驗證路由
   - 檢查到的核心 surface / 功能
   - 是否通過
   - 若有問題，已修復並重驗
6. 最終回報必須包含：
   - roadmap 執行順序實際完成狀態
   - 每個 change 的 commit hash 與繁中 commit 標題
   - 測試命令與結果摘要
   - agent-browser 驗證摘要
   - 剩餘風險或未做事項（若有）

Stop if:
- `spectra analyze` 或 `spectra validate --strict` 針對某個 change 持續失敗，且同一阻塞在連續 3 次嘗試後仍無法自行排除。
- 需要修改 roadmap 或 change artifact 的核心範圍定義，才有可能繼續實作。
- 需要新增 roadmap 未涵蓋的新 change 才能合理完成目標。
- 現有測試出現與本目標無關的大面積 regression；不要靠修改測試掩蓋問題。
- 發現既有 worktree 變更直接衝突到本目標且無法安全吸收。
- `agent-browser` 無法啟動或無法驗證本機頁面，且替代方案不足以提供等價實證。
- 任何 change 的驗證要求只能靠猜測成立，沒有測試、頁面證據、或可重現命令可支持。