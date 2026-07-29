# Repo 發展工作流

> 目標：使用者可以從任一步開始；agent 每完成一步都提示下一步，直到驗證、歸檔與交付完成。

## 預設流程

```text
/grill-me（需求已清楚可跳過）
        ↓
spectra-propose
        ↓
spectra-apply
        ↓
review + repo verification
        ↓
必要人工 acceptance
        ↓
spectra-archive
        ↓
使用者確認後精準 commit
```

- Claude Code 使用 `/spectra-*`；Codex 使用 `$spectra-*`。本檔用不帶前綴的 `spectra-*` 表示兩者。
- `/grill-me`、`/to-spec`、`/to-tickets` 是 Claude Code 的可選入口；其他工具若沒有同名 skill，使用可用的需求澄清／規格／拆票能力或直接產出同等結果，不把缺少命令視為 blocker。
- 已有完全對應的 named change，直接從 `spectra-apply <change>` 開始。
- requirement 在 apply 中途改變，先 `spectra-ingest <change>`，再回到 apply。
- 回覆「繼續」代表接受 agent 剛提示的下一步；不需要重新輸入整個指令。

## 每一步都要提示下一步

每個 workflow skill 或階段結束時，agent 必須回報：

1. **完成了什麼**
2. **目前狀態**：可繼續／待使用者決定／blocked
3. **下一步**：一個精確指令或動作
4. **為什麼是這一步**

範例：

```text
完成：需求邊界已由 /grill-me 確認。
下一步：$spectra-propose add-device-pairing
原因：需求已明確且可收斂為單一 change。
回覆「繼續」即可直接執行。
```

提示規則：

- `/grill-me` 完成後：
  - 單一有界需求 → 提示 `spectra-propose <change>`。
  - 大型或跨多個 changes → 提示 `/to-spec`。
- `/to-spec` 完成後 → 提示 `/to-tickets`。
- `/to-tickets` 完成後 → 提示為第一個 frontier ticket 建立 `spectra-propose <change>`。
- `spectra-propose` 完成後 → 提示 `spectra-apply <change>`。
- apply 尚有 tasks → 提示繼續同一個 change，不另開 change。
- apply tasks 完成後 → 提示執行 Standards／Spec review 與 repo verification。
- review 有 findings → 提示修正並重跑受影響驗證。
- review 與自動驗證完成後：
  - 需要 FHD、deployment 或 launch acceptance → 提示使用者驗收。
  - 不需人工 acceptance，或已驗收 → 提示 `spectra-archive <change>`。
- archive 完成後 → 顯示精準 commit 範圍，提示使用者是否提交；取得確認後才精準 staging 與 commit。
- blocked 時不要假裝有可執行下一步；只提示解除 blocker 所需的單一輸入或外部動作。

## 何時才使用 `.scratch`

一般功能、功能修改與 bug fix 不先建立 `.scratch`；直接走 Spectra。

只有大型、模糊或跨多個 changes 的產品工作才使用：

```text
/grill-me → /to-spec → /to-tickets → 每個 frontier ticket 各自進入 Spectra
```

- `.scratch/<feature>/spec.md` 保存跨 change 的產品意圖。
- `.scratch/<feature>/issues/` 保存 tracer-bullet tickets 與 blocking edges。
- `.scratch` 不直接授權 coding，也不複製 Spectra task checkbox。
- `openspec/changes/<change>/tasks.md` 是實作進度唯一來源。

## 不能省略的完成門檻

1. **Implement**：優先 red → green → refactor，只做 change 直接要求的最小改動。
2. **Review**：Standards 與 Spec findings 修完，並重跑受影響驗證。
3. **Verify**：依 `docs/ops/conventions.md` 跑 tests／build／`pnpm verify`；Playback 五頁另依 `docs/ops/fhd-closeout.md` 產生 fresh witness。
4. **Human acceptance**：FHD、intentional difference、deployment、launch acceptance 必須由使用者判定。
5. **Archive**：tasks、驗證與必要人工 acceptance 全部完成後才執行；未 archive 不算 change 完成。
6. **Commit**：archive 後另行取得使用者確認，精準選檔；不用 generic auto-commit 或 `git add .`。

純問答、研究、review、診斷不建立 change；純制度維護、typo 或無行為影響的小修可依 `docs/ops/maintenance.md` 直接處理。
