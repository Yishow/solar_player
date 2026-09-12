# UI 草稿與互動一致性驗證

- Change：`fix-ui-draft-and-interaction-consistency`
- 比較基線：`f45da8d1bb6157d74e1f1c0b4a5c72a43f51b642`；開始時工作樹乾淨。
- 使用者已授權依序實作、review、修正、archive、commit；本文件的工程驗證不代替人工 FHD acceptance 或正式部署驗收。

## Requirement 實作與執行

下表 hook/component 路徑在 `apps/web/src/`，頁面路徑在其 `pages/` 下；每項執行證據均為最後同一批 affected tests 的 passed-current，與 source-identity.json 對應。

| Requirement | 實作位置 | 情境測試 | Example | 執行 |
| --- | --- | --- | --- | --- |
| Draft editing requires an authoritative initial baseline | hooks/useDisplayPageConfig.ts、DisplayPagesEditor/draftInteractionState.ts、EditorToolbar.tsx / index.tsx | cold/retry/page-stage 3 scenarios，見下表 | 無 | PASS |
| Discarding a dirty draft requires explicit confirmation | hook reload、DisplayPagesEditor handleReload / conflict UI | cancel/success/failure 3 scenarios | 無 | PASS |
| Shared management selects support keyboard selection and accessible names | components/management/CustomSelect.tsx 與 6 個管理頁呼叫檔案 | keyboard/dismiss/labels 3 scenarios | 無 | PASS |
| Disabling a shared select blocks every change path | CustomSelect handlers / disabled lifecycle | disabled-while-open 1 scenario | 無 | PASS |
| Fleet dialogs manage focus and dismissal over their lifecycle | useModalFocus.ts、GroupEditDialog、PairingDialog、DeviceFleetContent | focus/removed-trigger/pending 3 scenarios | 無 | PASS |
| Playback settings prevent draft mutation while saving | PlaybackSettings/index.tsx、PlaybackSettingsFormSections.tsx | input/held/failure/partial-settled 4 scenarios | 無 | PASS |
| Embedded shell draft indicators share the latest saved content baseline | DisplayPagesEditor/shellWorkspaceState.ts、parent index.tsx、ShellDecorationEditor/index.tsx | save/metadata/asset-failure 3 scenarios，另加 pending response regressions | 無 | PASS |
| Display editor draft config hydration avoids repeated full-object work | useDisplayPageConfig.ts、既有 displayPageDraftSession.ts、draft UI controls | dirty actions/seed-failure 2 scenarios | 無 | PASS |
| Trend axes and curves share the same numeric domain | EnergyTrend/chartModel.ts、index.tsx、trend.css | unit/percent/zero-missing 3 scenarios | 0/1200/2400 kWh | PASS |

## 規格情境與測試對照

下表為測試覆蓋位置；最終執行結果另記，不能只憑測試存在判為 PASS。

| 規格情境 | 正式測試位置 / case |
| --- | --- |
| Draft dirty state updates through editor actions | `src/hooks/useDisplayPageConfig.test.ts`：dirty flag edits/reset/undo/redo、save/conflict/version cases |
| Draft config failure keeps seed fallback visible | `src/hooks/useDisplayPageConfig.test.ts`：draft-load-failure-retry；`src/pages/DisplayPagesEditor/draftInteraction.test.tsx`：draft-cold-edit-blocked |
| Keyboard users open and choose an option | `src/components/management/CustomSelect.interaction.test.tsx`：select-keyboard-selection；browser select keyboard |
| Keyboard users dismiss without changing the value | `CustomSelect.interaction.test.tsx`：select dismissal；browser select keyboard |
| Use sites expose field names | `CustomSelect.useSites.test.ts`：6 個呼叫檔案盤點；`src/pages/DataHub/Weather.test.tsx`：真實 combobox triggers；browser PlaybackSettings trigger |
| The select becomes disabled while open | `CustomSelect.interaction.test.tsx`：select-disabled-while-open、placeholder/disabled-only |
| Dialog opens and closes with keyboard | `src/pages/DeviceFleet/dialogFocus.test.tsx`：fleet-dialog-focus-cycle；browser Fleet dialog |
| The trigger is absent or controls become unavailable | `dialogFocus.test.tsx`：fleet-dialog-pending-escape（dialog/fallback focus） |
| Pairing mutation is pending | `dialogFocus.test.tsx`：Fleet pairing existing close lifecycle；browser group pending Escape |
| Editing is attempted before a cold draft read completes | `useDisplayPageConfig.test.ts`：draft-cold-edit-blocked；`draftInteraction.test.tsx`：實際 editor controls |
| Failed initial load can recover | `useDisplayPageConfig.test.ts`：draft-load-failure-retry；`draftInteraction.test.tsx`：retry |
| A page switch isolates readiness | `useDisplayPageConfig.test.ts`：draft-page-stage-isolation 與既有 cache/version/owner tests |
| Conflict reload is cancelled | `draftInteraction.test.tsx`：draft-discard-cancel；browser conflict discard；hook conflict preserves local edit |
| Confirmed reload succeeds | `draftInteraction.test.tsx`：draft-discard-confirm；browser conflict discard；hook stage/page cache isolation |
| Confirmed reload fails | `draftInteraction.test.tsx`：draft-discard-read-failure；hook failed dirty reload despite external cache commit |
| Pending save cannot lose newer input | `src/pages/PlaybackSettings/interaction.test.tsx`：playback-save-locks-input-and-sort、mounted lock；browser pending playback save |
| A held stepper or drag crosses into pending save | `PlaybackSettings/interaction.test.tsx`：playback-save-stops-held-stepper、mounted lock；browser pending playback save |
| A save fails | `PlaybackSettings/interaction.test.tsx`：playback-save-failure-retains-draft |
| One failed request does not unlock another pending write | `PlaybackSettings/interaction.test.tsx`：playback-partial-failure-keeps-lock-until-settled；browser pending playback save |
| Shell save clears both indicators | `src/pages/ShellDecorationEditor/shellWorkspaceState.interaction.test.tsx`：shell-parent-child-dirty-parity、shell-page-draft-isolation |
| Metadata updates do not invent edits | `shellWorkspaceState.interaction.test.tsx`：shell-metadata-only-update；`src/pages/DisplayPagesEditor/shellWorkspaceState.test.ts`：metadata-only |
| Save failure and asset return preserve the draft | `shellWorkspaceState.interaction.test.tsx`：shell-save-failure-preserves-draft-and-baseline、shell-asset-return-keeps-baseline、shell-save-pending-preserves-later-asset-edit、shell-publish-pending-preserves-new-draft |
| Power and energy axes use their units | `src/pages/EnergyTrend/chartRendering.test.tsx`：trend-axis-shares-domain；browser trend axes |
| Energy uses the shared linear scale（Example） | `chartRendering.test.tsx`：0/1200/2400 kWh，path 8,212 → 136,110 → 264,8 |
| A percentage below one hundred is not stretched to one hundred | `chartRendering.test.tsx`：trend-percent-40-of-100；`chartModel.test.ts`：out-of-range domain；browser trend axes |
| Zero and missing data remain distinct | `chartRendering.test.tsx`：trend-zero-and-missing；`chartModel.test.ts`：zero/null/nonfinite |

測試路徑以 `apps/web/` 為根，browser cases 在 `tests/browser/ui-interactions.spec.ts`。25 個 Scenario 與 1 個 Example 均分類為 covered；excluded 0、uncovered 0。受影響測試最後版本 683/683 PASS（passed-current）。瀏覽器與人工判定另外記錄。

## 已修正的 review / witness 問題

- 已確認重載開始的同一個 tick 仍可 save：新增同步 readiness guard，回歸測試先失敗後通過。
- 捨棄重載失敗，卻採用其他 owner 新 cache 而清掉本地歷程：強制要求成功讀取，失敗保留 dirty/history。
- canvas 復原／重做在 pending reload 仍呈現可用：canvas history props 共用 canEdit gate，測試涵蓋所有同名控制項。
- 趨勢軸文字與 SVG 格線相差 29.5 px：共用 plot 尺寸與 tick y；瀏覽器量測誤差須小於 0.5 px。
- 趨勢時間軸顯示完整 ISO 造成溢出：縮短有效 ISO 顯示，保留時間點順序。

- shell 較早 save/publish 回應會覆寫素材往返後的新草稿：保留較晚內容、前進 baseline/baseVersion；較舊 response 不得倒退版本。

## 最終結果

- PASS（passed-current）：94 個受影響 web test files，683/683 tests；完整檔案清單與 raw log：`artifacts/ui-consistency/2026-09-12/affected-test-files.json` / `affected-tests.log`。
- PASS：code-review / spectra-review；Standards 與 Spec 最後皆無未解決 finding，詳見 review.md。
- Source identity：`e13f918d28b5f5eac21d10232fe6084700873aad704053c4ceea4277cb398f15`；`artifacts/ui-consistency/2026-09-12/source-identity.json` 記錄 41 個程式/測試檔案、lockfile、Node/pnpm 版本。
- PASS（passed-current）：`pnpm verify` 全 7 stages（build、bundle-budget、shared、server、web、deploy、server-runner）；3,122 passed、2 skipped、0 failed。兩個既有 skip 是 opt-in `accounting read capacity measurements` 與平台條件的 `real flock releases the monitor slot without leaking it to Firefox`；不將 skipped 算成通過。Raw output：`artifacts/ui-consistency/2026-09-12/verify.log`。
- PASS：`git diff --check`、`spectra analyze ... --json`（0 Critical / 0 Warning / 17 Suggestion）、`spectra validate ...`。17 項 Suggestion 為補充具體 Example 的建議，現有情境均有測試對照；raw output：同 evidence 目錄 analyze.log / validate.log。
- PASS（passed-current）：最後 fresh browser/FHD witness，7/7 cases；15 張 FHD 與 6 張管理頁 PNG 均為 1920×1080，主代理已逐張檢視並填寫 gap notes。完整命令、fixture、21 張 screenshot hashes 及限制見 `witness.md` / `witness-manifest.json`。
- 本案必要人工 acceptance 已取得：2026-09-12 使用者「接受本案，畫面差距留待另案」。第二案需等本案 archive/commit 完成才開始；此時沒有聲稱效能增益。

## Conformance 與完成門檻

| Dimension | Status |
| --- | --- |
| Completeness | 12/12 tasks 的實作、驗證、witness 與限定範圍 acceptance 完成。 |
| Correctness | 9/9 requirements 有實作；25/25 Scenarios、1/1 Example 有正式測試且最後 affected suite PASS。 |
| Coherence | 指定互動契約及版本/owner/access 邊界保留；code-review 最後無範圍內未解決 finding。 |

- 最後 conformance：無未完成 requirement/task；0 Critical / 0 Warning。使用者接受本案限定範圍及差距另案處置，正式 FHD launch acceptance 仍保留。
- 本批 capture 沒有證明完整 FHD launch quality。視覺差距、unpaired editor 與 paired runtime context 差異、實體裝置及 publish/fallback 全流程限制均在 `witness.md` 逐項保留。
- Review scope：最後交接更新後重新擷取至 `/tmp/ui-consistency-final-scope.json` 並執行 check-snapshot；base/HEAD 均為 `f45da8d1bb6157d74e1f1c0b4a5c72a43f51b642`。Tracking 含 41 個 implementation/test paths 及 task baseline 自動收錄的 analyze/validate/verify 三個 raw logs；後三者屬本機證據，排除程式碼與 commit 範圍。先前 snapshot 因交接檔案新增而失效，不沿用該檢查結果。
