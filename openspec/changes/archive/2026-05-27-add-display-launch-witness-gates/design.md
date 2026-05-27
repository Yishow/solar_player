## Context

現在 repo 對 display product 的各個部分都有不少完成中的 truth：

- 五個 playback 頁已各自完成 alignment / runtime / config 相關 change
- editor 已有 page-specific authoring coverage 與 integrated workspace contract
- publish / shell / asset / runtime story 等子題各自都有 spec

但這些 truth 分散在不同 change 和 spec 中，還沒有一個「上線 witness gate」把它們拉成單一產品完成定義。結果就是：某頁可能有 editor、某頁有 runtime、某頁有 prototype parity，但整體 still not launch-ready。

## Goals / Non-Goals

**Goals:**

- 定義 display product 的 launch witness matrix
- 把 editor/runtime parity、publish refresh、fallback、handoff 都變成 launch gate
- 提供固定的 verification pack 與結果記錄格式

**Non-Goals:**

- 不在此 change 內直接實作新的 display 功能
- 不重開五頁版型設計或 token family 重新設計
- 不把所有 management route 都納入同一個 launch gate；只納入與 display 上線直接相關的 surface
- 不在此 change 內同步 repo-local skill 或其他入口文件；入口對齊由專門的 entrypoint change 負責

## Decisions

### Use a page-by-page witness matrix instead of a vague launch checklist

決策：用固定 matrix 逐頁列出 `Overview`、`Solar`、`Factory Circuit`、`Images`、`Sustainability` 的 authoring、runtime parity、publish refresh、fallback、handoff 狀態，並把 `docs/reference-match/display-launch-witness-matrix.md` 定義成唯一的 launch status ledger，而不是一份含糊的「大致可上線」清單。

理由：逐頁 matrix 才能看出哪個 page 還只是 prototype-complete、哪個已 product-complete。

### Treat publish refresh and fallback as launch-critical, not post-launch polish

決策：publish success 但 live playback 不刷新、缺資料時只剩空白、或 asset/shell handoff 中斷，都視為 launch blocker，不列為 post-launch polish。

理由：這些問題會直接破壞現場播放與操作人員信任。

### Keep launch gates evidence-driven inside the current repo workflow

決策：launch gate 只依賴 repo 內已有的 spec、targeted tests、manual witness review、reference-match docs 與 command pack，不新增外部 release system。

理由：先讓現有 repo 能穩定做 launch audit，比導入新平台更實際。

## Implementation Contract

- Behavior:
  - 上線前，display product 需有一份 witness matrix，清楚標記五個 playback 頁在 authoring、runtime parity、publish refresh、fallback、handoff 是否通過。
  - editor 與 playback 的完成定義不再只看功能存在，而要看逐頁 witness 是否通過。
- Interface / data shape:
  - 新 spec `display-launch-witness-gates` 定義 launch gates。
  - `docs/reference-match/display-launch-witness-matrix.md` 是唯一的 page-by-page launch status ledger，記錄 pass、fail、blocked 與 blocker notes。
  - `docs/reference-match/display-launch-verification-pack.md` 提供 command pack、manual review pack 與如何回填到 witness matrix 的 procedure。
  - `docs/reference-match/all-pages-audit.md` 與 `docs/reference-match/all-pages-checklist.md` 僅做對照輸入與盤點輔助，不平行維護另一份 launch status。
  - 既有 `display-editor-page-authoring-coverage` 與 `display-page-draft-live-publishing` spec 需補上 launch 語境下的 requirement。
- Failure modes:
  - 若某頁只有 editor coverage、沒有 runtime parity witness，該頁不可標示為 launch-ready。
  - 若 publish success 但 live refresh 或 fallback witness 未通過，整體 launch 不可通過。
- Acceptance criteria:
  - `spectra analyze add-display-launch-witness-gates --json`
  - `spectra validate --strict --changes add-display-launch-witness-gates`
  - 內容 review 可直接用 witness matrix 判斷各頁 launch 狀態
  - verification pack 能對應到 repo 現有 targeted tests 與 manual review 路徑
- Scope boundaries:
  - In scope：launch gate spec、witness matrix、verification pack、相關 spec delta、audit-to-matrix 映射
  - Out of scope：新功能開發、頁面重做、外部 release tooling、repo-local skill 或 README 類入口同步

## Risks / Trade-offs

- [matrix 太細導致維護負擔高] → 只保留 launch-critical 維度，不收錄次要 polish
- [把所有未完成都變 blocker] → 僅把會直接影響播放/發布/操作的項目列為 blocker
- [與既有 spec 重複] → 透過 delta spec 只補 launch context，不重寫既有 capability
- [launch 狀態分散在多份文件] → 把 witness matrix 定成唯一 status ledger，verification pack 定成 procedure，audit/checklist 只保留輔助角色
