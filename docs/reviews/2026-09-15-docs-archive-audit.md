# Docs Archive Audit — 2026-09-15

## 結論

不是「docs 大部分都過時了」，而是目前 `docs/` 同時混放了四種不同壽命的文件：

1. 現行入口與制度文件
2. 現行 runbook / architecture / asset workflow 文件
3. 仍被 specs / tests 引用的歷史證據與交接檔
4. 已經被隔離在 `reference/`、`archive/`、`downloads/` 的歷史資料

真正的問題是 **歷史證據和現行入口放在同一層**，不是核心 docs 全面失效。

本次審查的結論很明確：

- **可直接 archive 的 active docs：沒有低風險批次。**
- **最明顯的文件缺陷原本是根目錄兩個殘留物：** `docs/goal.md` 曾是空檔，`docs/FHD.01.html` 是歷史 prototype 卻仍位於 docs 頂層。
- **很多看起來很舊的 2026-06 文件不能直接 archive，因為它們仍被 specs / tests 當成 trace 或 supporting evidence。**

> Follow-up：同日先處理 `docs/goal.md` / `docs/FHD.01.html` 的頂層殘留問題，後續把 `openspec/specs/` 內 57 份 spec、共 189 處 FHD.01 直接引用改到 `docs/reference/kuozui-green-fhd-html-prototype/review.html`，最後再把 FHD.01 與舊的 reference-match supporting docs 一起移到 `docs/archive/`。目前主線 docs 只保留現行入口，舊 closeout 證據則集中在 `docs/archive/reference-match/` 與 `docs/archive/prototype/`。

## 審查方法

- 逐檔盤點 `docs/` 內 human-authored text docs：`*.md`、`*.html`、`*.yaml`
- 交叉比對 `openspec/specs/`、`openspec/changes/`、`apps/web` tests、`deploy.md`、`README.md` 對文件的實際引用
- 對 `docs/reference/`、`docs/archive/`、`docs/downloads/` 以「reference / archive bucket」方式判讀，不把 PNG/JPG 等素材誤當主線文件

## 分類圖例

- `keep-current`
  - 現行入口、制度、runbook、architecture 或 workflow 文件；不應 archive。
- `keep-historical`
  - 內容帶時間性，但仍是可追溯的 review、roadmap、evidence、handoff 或 spec 佐證；不應直接 archive。
- `fix-or-relocate`
  - 內容或放置位置有明顯問題，但目前仍有大量引用，不能直接搬走；要先做引用改寫。
- `already-reference`
  - 已經位於 `reference/`、`archive/`、`downloads/` 等隔離區，保留即可。

## 高風險觀察

### 1. `docs/reference-match/` 裡有大量 dated evidence，但它們不是低風險 archive 候選

判定依據：

- `docs/reference-match/display-launch-witness-matrix.md` 明確宣告自己是 single authoritative launch status ledger。
- `docs/archive/reference-match/2026-05/all-pages-audit.md` 與 `docs/archive/reference-match/2026-05/all-pages-checklist.md` 明確宣告自己只做 supporting input。
- 多個 dated FHD docs 仍被 `openspec/specs/` 大量引用，不能直接移走而不更新規格 trace。
- 相關 workflow 也被測試保護，例如：
  - `apps/web/src/pages/displayLaunchWitnessGates.test.ts`
  - `apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts`
  - `apps/web/src/pages/fhdEvidenceWorkflow.test.ts`
  - `apps/web/src/pages/fhdWitnessTooling.test.ts`

結論：在改寫引用前，`reference-match/` 不能直接清空進 archive；在這次整理完成後，dated evidence 已集中移到 `docs/archive/reference-match/`。

### 2. `docs/goal.md` 與 `docs/FHD.01.html` 原本是最可疑的頂層殘留

判定依據：

- `docs/ops/diagnosis.md` 已明講：`docs/goal.md` 是空檔，`docs/FHD.01.html` 是會誤導模型的 prototype 殘留。
- `docs/ops/fhd-closeout.md` 也已明講 prototype HTML 只是歷史參考，不是 source of truth。
- `docs/goal.md` 已被移除，repo 層高階入口改由 `README.md` 承接。
- `docs/FHD.01.html` 的直接依賴先被清掉，最後已移到 `docs/archive/prototype/FHD.01.html`。

結論：`docs/goal.md` 已退出主線；`docs/archive/prototype/FHD.01.html` 也已歸到 archive bucket，不再佔用主線 docs。

### 3. 很多 dated docs 其實已在正確的 bucket

`docs/reviews/`、`docs/roadmaps/`、`docs/reference/`、`docs/archive/` 本來就屬於時間性或歷史性目錄。這些檔案看起來舊，不代表放錯地方。

## 逐檔分類

### Core Entry Docs

| File | 狀態 | 可否直接 archive | 說明 |
| --- | --- | --- | --- |
| `docs/README.md` | `keep-current` | 否 | 現行 docs 導覽入口。 |
| `docs/openapi.yaml` | `keep-current` | 否 | 現行 server critical-operation subset。 |
| `README.md` | `keep-current` | 否 | repo 層產品、指令與部署入口；docs 內多處以此承接高階說明。 |

補充：

- `docs/reference-match/display-surface-visual-review-checklist.md` 與 `docs/reference-match/fhd-editor-gap-ledger.md` 屬現行 FHD workflow 文件，但已不再佔用 docs root。
- `docs/archive/prototype/FHD.01.html` 已移入 archive bucket，不再屬主線 docs clutter。

### docs/ops

| File | 狀態 | 可否直接 archive | 說明 |
| --- | --- | --- | --- |
| `docs/ops/workflow.md` | `keep-current` | 否 | repo workflow 主入口。 |
| `docs/ops/conventions.md` | `keep-current` | 否 | commands、validation、安全邊界主入口。 |
| `docs/ops/fhd-closeout.md` | `keep-current` | 否 | FHD closeout 守則。 |
| `docs/ops/judgment.md` | `keep-current` | 否 | 授權與風險判準。 |
| `docs/ops/maintenance.md` | `keep-current` | 否 | docs / institutional maintenance 守則。 |
| `docs/ops/dispatch.md` | `keep-current` | 否 | 模型調度與派工規則。 |
| `docs/ops/delegation.md` | `keep-current` | 否 | 派工 prompt 模板。 |
| `docs/ops/device-pairing-and-recovery.md` | `keep-current` | 否 | 仍被 deploy 和多份 specs 引用的現行 pairing/recovery runbook。 |
| `docs/ops/device-scoped-playback-test-matrix.md` | `keep-current` | 否 | Phase 1 acceptance matrix，仍被 deploy 和多份 specs 引用。 |
| `docs/ops/diagnosis.md` | `keep-historical` | 否 | 2026-07-03 制度化診斷快照；仍是現行維護參考。 |
| `docs/ops/letter.md` | `keep-historical` | 否 | 歷史 handoff；仍被 AGENTS / CLAUDE routing 與 specs 引用。 |

### docs/architecture

| File | 狀態 | 可否直接 archive | 說明 |
| --- | --- | --- | --- |
| `docs/architecture/server-app-time.md` | `keep-current` | 否 | server-authoritative time policy；被 deploy/specs 引用。 |
| `docs/architecture/default-playback-profile.md` | `keep-current` | 否 | default playback profile 與相容層說明。 |
| `docs/architecture/device-scoped-multisite-playback.md` | `keep-current` | 否 | multisite playback architecture；被多份 specs 與 deploy docs 引用。 |

### docs/runbooks

| File | 狀態 | 可否直接 archive | 說明 |
| --- | --- | --- | --- |
| `docs/runbooks/device-diagnostics-safe-ops.md` | `keep-current` | 否 | 現行裝置診斷安全操作 runbook。 |
| `docs/runbooks/sustainability-calculation-settings.md` | `keep-current` | 否 | 現行換算係數與影響說明。 |
| `docs/runbooks/solar-zone-identity-state.md` | `keep-current` | 否 | 現行 identity sidecar 維運。 |
| `docs/runbooks/pc-server-deploy.md` | `keep-current` | 否 | split topology 的 Windows server deploy runbook。 |
| `docs/runbooks/pi-thin-kiosk-deploy.md` | `keep-current` | 否 | split topology 的 Pi thin-kiosk deploy runbook。 |
| `docs/runbooks/raspi-onekey-kiosk-deploy.md` | `keep-current` | 否 | co-located Pi kiosk deploy runbook。 |

### docs/agents

| File | 狀態 | 可否直接 archive | 說明 |
| --- | --- | --- | --- |
| `docs/agents/domain.md` | `keep-current` | 否 | agent 文件入口與術語路由。 |
| `docs/agents/issue-tracker.md` | `keep-current` | 否 | `.scratch/` issue tracker 使用規範。 |
| `docs/agents/triage-labels.md` | `keep-current` | 否 | triage vocabulary 對照表。 |

### docs/display-assets

| File | 狀態 | 可否直接 archive | 說明 |
| --- | --- | --- | --- |
| `docs/display-assets/README.md` | `keep-current` | 否 | display asset generation guide。 |
| `docs/display-assets/asset-manifest.template.md` | `keep-current` | 否 | asset manifest 模板。 |
| `docs/display-assets/prompt-recipes/display-pages.md` | `keep-current` | 否 | display-page asset recipe。 |
| `docs/display-assets/prompt-recipes/shared-style.md` | `keep-current` | 否 | shared visual recipe。 |

### docs/fhd-witness

| File | 狀態 | 可否直接 archive | 說明 |
| --- | --- | --- | --- |
| `docs/fhd-witness/playback-closeout-matrix.md` | `keep-current` | 否 | witness tooling 的 route/reference/editor mapping，仍被 workflow 和 tests 使用。 |
| `docs/fhd-witness/evidence-template.md` | `keep-current` | 否 | 現行 evidence bundle 模板。 |

### docs/reference-match

| File | 狀態 | 可否直接 archive | 說明 |
| --- | --- | --- | --- |
| `docs/reference-match/fhd-workflow-entrypoints.md` | `keep-current` | 否 | FHD workflow 的文件入口。 |
| `docs/reference-match/playback-visual-canonicals.md` | `keep-current` | 否 | protected canonicals 主文件。 |
| `docs/reference-match/fhd-reference-informed-closeout-boundaries.md` | `keep-current` | 否 | boundary vocabulary 主文件。 |
| `docs/reference-match/fhd-surface-split-guide.md` | `keep-current` | 否 | witness batch / surface family 分流指南。 |
| `docs/reference-match/fhd-evidence-bundle-template.md` | `keep-current` | 否 | closeout evidence bundle template。 |
| `docs/reference-match/fhd-exception-ledger-template.md` | `keep-current` | 否 | exception ledger template。 |
| `docs/reference-match/display-launch-verification-pack.md` | `keep-current` | 否 | launch verification procedure。 |
| `docs/reference-match/display-launch-witness-matrix.md` | `keep-current` | 否 | single authoritative launch ledger；狀態舊不代表可 archive。 |
| `docs/archive/reference-match/2026-05/all-pages-audit.md` | `keep-historical` | 否 | supporting audit；自己已聲明不再維護 authoritative launch status。 |
| `docs/archive/reference-match/2026-05/all-pages-checklist.md` | `keep-historical` | 否 | supporting checklist；自己已聲明只保留 supporting evidence。 |
| `docs/archive/reference-match/2026-06/fhd-playback-boundary-classification-2026-06-05.md` | `keep-historical` | 否 | 仍被 launch matrix 與 specs 當 supporting evidence。 |
| `docs/archive/reference-match/2026-06/fhd-playback-witness-polish-pass-1-2026-06-06.md` | `keep-historical` | 否 | dated witness evidence；仍被 specs 引用。 |
| `docs/archive/reference-match/2026-06/visual-fidelity-review-2026-06-06.md` | `keep-historical` | 否 | dated visual review evidence。 |
| `docs/archive/reference-match/2026-06/overview-density-baseline-2026-06-07.md` | `keep-historical` | 否 | dated baseline evidence；仍被 specs 引用。 |
| `docs/archive/reference-match/2026-06/fhd-closeout-handoff-2026-06-07.md` | `keep-historical` | 否 | dated handoff；仍被 specs 當 trace。 |
| `docs/archive/reference-match/2026-06/phase4-visual-witness-2026-06-07.md` | `keep-historical` | 否 | dated phase witness evidence。 |
| `docs/archive/reference-match/2026-06/flow-connector-refinement-closeout-2026-06-07.md` | `keep-historical` | 否 | dated refinement evidence；仍被 specs 引用。 |
| `docs/archive/reference-match/2026-06/overview-solar-reference-quality-closeout.md` | `keep-historical` | 否 | closeout evidence；仍被 specs 和 matrix 追溯。 |
| `docs/archive/reference-match/2026-06/factory-circuit-reference-quality-closeout.md` | `keep-historical` | 否 | closeout evidence；仍被 specs 和 matrix 追溯。 |
| `docs/archive/reference-match/2026-06/images-reference-quality-closeout.md` | `keep-historical` | 否 | closeout evidence；仍被 specs 和 matrix 追溯。 |
| `docs/archive/reference-match/2026-06/sustainability-reference-quality-closeout.md` | `keep-historical` | 否 | closeout evidence；仍被 specs 和 matrix 追溯。 |
| `docs/archive/reference-match/2026-06/settings-images-layout-refactor-plan.md` | `keep-historical` | 否 | dated plan / evidence；仍被 specs 大量引用。 |
| `docs/reference-match/screenshots/README.md` | `keep-current` | 否 | screenshot evidence container 說明。 |
| `docs/reference-match/screenshots/current/README.md` | `keep-current` | 否 | current screenshots 容器說明。 |
| `docs/reference-match/screenshots/reference/README.md` | `keep-current` | 否 | reference screenshots 容器說明。 |
| `docs/reference-match/screenshots/diff/README.md` | `keep-current` | 否 | diff screenshots 容器說明。 |

### docs/reviews

| File | 狀態 | 可否直接 archive | 說明 |
| --- | --- | --- | --- |
| `docs/reviews/2026-09-08-energy-authoring-review.md` | `keep-historical` | 否 | review record；已被後續 change/spec 引用。 |
| `docs/reviews/2026-09-08-energy-authoring-followup-review.md` | `keep-historical` | 否 | follow-up review；屬正確 bucket。 |
| `docs/reviews/2026-09-08-mqtt-runtime-safety-review.md` | `keep-historical` | 否 | review record；屬正確 bucket。 |
| `docs/reviews/2026-09-09-source-runtime-followup-review.md` | `keep-historical` | 否 | review record；屬正確 bucket。 |
| `docs/reviews/2026-09-09-source-mutation-followup-review.md` | `keep-historical` | 否 | review record；屬正確 bucket。 |

### docs/roadmaps

| File | 狀態 | 可否直接 archive | 說明 |
| --- | --- | --- | --- |
| `docs/roadmaps/2026-07-13-project-improvement-roadmap.md` | `keep-historical` | 否 | dated roadmap，但仍被 specs 當來源參考。 |
| `docs/roadmaps/2026-05-28-settings-status-design-token-alignment-roadmap.md` | `keep-historical` | 否 | dated roadmap；放在 roadmaps 屬正確 bucket。 |

### docs/superpowers/specs

| File | 狀態 | 可否直接 archive | 說明 |
| --- | --- | --- | --- |
| `docs/superpowers/specs/2026-05-19-editor-three-column-layout-design.md` | `keep-historical` | 否 | dated design spec，但仍被多份 openspec specs 引用。 |
| `docs/superpowers/specs/2026-05-23-management-canvas-shell-design.md` | `keep-historical` | 否 | dated design spec，但仍被多份 openspec specs 引用。 |

## Reference / Archive Buckets

下列內容看起來舊，但它們已經在正確的 quarantine bucket，不需要再 archive 一次：

| Bucket | 狀態 | 說明 |
| --- | --- | --- |
| `docs/archive/prompt-pack/**` | `already-reference` | 已歸檔的 prompt pack。 |
| `docs/archive/prototype/**` | `already-reference` | 已歸檔的 prototype 相容頁與相關歷史素材。 |
| `docs/archive/solar-display/**` | `already-reference` | 已歸檔的舊 repo 時期 README。 |
| `docs/downloads/**` | `already-reference` | 匯出 ZIP 與下載產物。 |
| `docs/reference/FHD/**` | `already-reference` | FHD canonical PNG；不是要 archive 的歷史廢料，而是現行 visual canonical。 |
| `docs/reference/Better/**` | `already-reference` | 歷史設計參考。 |
| `docs/reference/mqtt/**` | `already-reference` | MQTT 歷史參考實作與素材。 |
| `docs/reference/solar_complete_spec_md/*.md` | `already-reference` | 舊完整規格主文件群。 |
| `docs/reference/solar_complete_spec_md/UI/*.md` | `already-reference` | 舊 UI 規格文字檔群。 |
| `docs/reference/solar_complete_spec_md/12_database_schema.sql` | `already-reference` | 舊 schema reference。 |
| `docs/reference/solar_complete_spec_md/07_openapi.yaml` | `already-reference` | 舊 OpenAPI reference。 |
| `docs/reference/kuozui-green-fhd-html-prototype/html-pages/*.html` | `already-reference` | 歷史 prototype HTML pages。 |
| `docs/reference/kuozui-green-fhd-html-prototype/prompts/pages/*.md` | `already-reference` | prototype prompt / spec artifacts。 |
| `docs/reference/kuozui-green-fhd-html-prototype/styles/**/*.css` | `already-reference` | prototype style reference。 |
| `docs/reference/kuozui-green-fhd-html-prototype/scripts/*.js` | `already-reference` | prototype helper scripts。 |
| `docs/reference/kuozui-green-fhd-html-prototype/page-artifacts/02-solar/*.{json,md}` | `already-reference` | page artifact / binding evidence。 |
| `docs/reference/kuozui-green-fhd-html-prototype/review.html` | `already-reference` | prototype launcher page。 |

## Archive Feasibility

### 可以現在直接 archive 嗎？

**結論：不建議直接動 active docs。**

原因不是保守，而是目前很多 dated docs 仍有真實依賴：

- `openspec/specs/` 大量引用 dated FHD evidence、roadmaps、design specs、handoff docs
- `apps/web` 有 tests 直接讀 FHD workflow docs
- `deploy.md` 與 architecture docs 直接引用 `docs/ops/device-pairing-and-recovery.md`、`docs/ops/device-scoped-playback-test-matrix.md`

### 這次實際採取的作法

1. **先改引用與目錄分層**
  - 把 FHD.01 的直接引用改到真正的 prototype 參考入口 `docs/reference/kuozui-green-fhd-html-prototype/review.html`
  - 把 `reference-match/` 的 historical evidence 引用與測試路徑改寫到 archive 路徑

2. **再搬移歷史檔**
  - `docs/archive/reference-match/2026-05/` 承接 `all-pages-audit.md` 與 `all-pages-checklist.md`
  - `docs/archive/reference-match/2026-06/` 承接 dated witness / closeout / refinement evidence
  - `docs/archive/prototype/FHD.01.html` 承接單獨的歷史 prototype 相容頁

## 建議優先順序

1. 已完成：`docs/archive/prototype/FHD.01.html` 已移出主線 docs。
2. 已完成：`docs/archive/reference-match/2026-05/` 與 `docs/archive/reference-match/2026-06/` 已承接舊的 audit、checklist 與 dated evidence。
3. `docs/reviews/`、`docs/roadmaps/`、`docs/reference/` 先不要動，它們本來就在合理 bucket。

## 最後判定

- **目前 active docs 沒有一批可以「直接 ARCHIVE 而不引發引用破壞」的低風險目標。**
- **有問題的是放置與分層，不是所有內容本身都過時。**
- **這次 archive move 後，主線 docs 已經只保留現行入口；剩餘工作若還要繼續，主要會是 archive 導覽命名與歷史快照敘述修整，而不是再搬主線文件。**