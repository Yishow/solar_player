## Context

這個 repo 的 playback 頁面已經累積了多個 alignment change、editor capability change 與 shared token work，但「質感」仍會在後續 AI 修改中慢慢流失。根因不是單一 CSS 錯字，而是 playback surface 缺少一套被明確保護的 visual canon。

目前已有 `display-surface-visual-guardrails` 與 `docs/display-surface-visual-review-checklist.md`，但它們更偏 review checklist，還不足以阻止下列 drift：

- 把 playback 的 hero / KPI / focus composition 逐步改成 management-style board stack
- 用 generic toolbar icon、表單按鈕或 dashboard card 語言取代 source-like symbol 與 display ornament
- 在「只做 style cleanup」名義下，默默改壞 FHD safe-zone 內的視覺層級與距離可讀性

## Goals / Non-Goals

**Goals:**

- 把 playback FHD 頁面的非協商視覺正典正式寫入 spec
- 為 review 與後續 AI 變更建立固定 witness source
- 阻止 management / dashboard 語言滲透到 playback hero、KPI 與 focus region

**Non-Goals:**

- 不在此 change 內重做任何單一 playback 頁面的 layout
- 不重開 editor schema、runtime data source 或 token family 擴張
- 不要求導入外部 screenshot diff service
- 不在此 change 內同步 `AGENTS.md`、`CLAUDE.md`、`README.md` 或 repo-local skill 入口文件；入口對齊由專門的 entrypoint change 負責

## Decisions

### Protect non-negotiable playback witness attributes

決策：將 playback 的 hero hierarchy、photo fade、card family rhythm、ornament consistency、source-like icon language、absolute composition 與 distance readability 視為受保護屬性。

理由：AI 最容易在局部優化時犧牲整體觀感。若不先定義哪些屬性不可默默退化，後續所有「看起來還能用」的改動都可能逐步沖淡 FHD 質感。

替代方案：

- 只保留抽象的「保持質感」描述。拒絕原因：太抽象，apply 與 review 都容易各自解讀。
- 只保護 token，不保護 composition。拒絕原因：色票一致不等於 FHD 視覺語言一致。

### Separate playback visual canonicals from management surface primitives

決策：明確把 playback 的 visual canonicals 與 management/reference surface primitives 分開管理。management primitive 可以服務 settings、editor、asset workspace，但不得反向成為 playback hero / KPI / focus composition 的預設語言。

理由：目前質感流失常來自把「方便重用的管理介面 primitive」誤用到 display page 的主視覺區。

替代方案：

- 以 shared primitive 統一所有 surface。拒絕原因：會把 display page 特有的展示性語言抹平。

### Anchor review to per-page FHD witness pairs

決策：每次 playback 視覺變更都需對照兩種 witness：`docs/reference/FHD/` 的頁面截圖，以及對應 `docs/reference/kuozui-green-fhd-html-prototype/prompts/pages/*-spec.md` 或 html prototype artifact。

理由：單看 runtime 畫面容易忽略 geometry 和距離感；單看 prototype 文本又容易忽略實際播放場景。雙 witness 才能保留 FHD 質感。

替代方案：

- 只對照 FHD PNG。拒絕原因：缺少可追溯的結構與語義說明。
- 只對照 prototype spec。拒絕原因：容易忽略現場視覺感受。

## Implementation Contract

- Behavior:
  - 當 change 修改 playback page visuals、shared display chrome 或 display card family 時，review artifact 必須能指出它依據哪一組 FHD witness 與 playback visual canonicals。
  - 後續規格與 checklist 會把 management-surface drift 視為顯性違規，而不是事後主觀爭論。
- Interface / data shape:
  - `openspec/specs/display-surface-visual-guardrails/spec.md` 需新增 requirement，定義 protected visual canonicals、canonical witness source、以及 management-surface drift 禁制。
  - `docs/display-surface-visual-review-checklist.md` 與新增的 `docs/reference-match/playback-visual-canonicals.md` 需列出每頁 witness pair、非協商屬性與允許例外格式。
- Failure modes:
  - 若 change 無法指出對應 witness，視為 review 資訊不足。
  - 若 change 以 style cleanup 名義引入 dashboard card、toolbar icon 或把 focus region 改成 control board，而沒有明示例外，視為違反 visual canonical。
- Acceptance criteria:
  - `spectra analyze protect-fhd-visual-canonicals --json`
  - `spectra validate --strict --changes protect-fhd-visual-canonicals`
  - 內容 review 可直接定位每個 playback 頁的 witness source 與 protected canonicals
  - 既有 `apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts` 或同級 guardrail test 能涵蓋新增 drift 類型
- Scope boundaries:
  - In scope：spec、checklist、guardrail docs、lightweight tests
  - Out of scope：逐頁視覺重做、editor/runtime contract 重寫、重型視覺快照平台、agent/human entrypoint 同步

## Risks / Trade-offs

- [視覺正典寫太抽象] → 用具體 witness pair 與違規型態描述，避免空話
- [寫太死導致正常迭代被卡住] → 允許 documented exception，但必須留下理由與受影響區域
- [與既有 management token work 混淆] → 在 docs 中明確區分 playback canonicals 與 management primitives
- [與入口文件同步 change 重疊] → 將 `AGENTS.md`、`CLAUDE.md`、README、skill 文件對齊留給專門的 entrypoint change
