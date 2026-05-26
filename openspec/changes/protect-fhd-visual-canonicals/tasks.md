## 1. 擴充 playback visual canonical 規格

- [ ] 1.1 完成 `Protect non-negotiable playback witness attributes` 與 `Preserve playback visual canonicals from FHD witnesses` 的規格擴充，讓 `display-surface-visual-guardrails` 正式保護 hero hierarchy、photo fade、card-family rhythm、ornament consistency、source-like icon 與 distance readability；驗證方式為執行 `spectra analyze protect-fhd-visual-canonicals --json` 並做 artifact content review，確認新增 requirement 與現有 spec 不重複衝突。
- [ ] 1.2 完成 `Separate playback visual canonicals from management surface primitives` 與 `Prevent management-surface drift inside playback focus regions` 的邊界說明，確認此 change 只補強 playback 正典與 drift 禁制，不把 editor/runtime/data contract 混進同一批；驗證方式為 proposal/design/spec 內容 review 與 `spectra validate --strict --changes protect-fhd-visual-canonicals`。

## 2. 寫出固定 witness 與 review 依據

- [ ] 2.1 完成 `Anchor review to per-page FHD witness pairs` 與 `Treat FHD witness pairs as the canonical comparison source` 的文件化，讓 `docs/reference-match/playback-visual-canonicals.md` 對五個 playback 頁明確列出 `docs/reference/FHD/` 圖像與對應 prototype artifact，並說清楚各頁的非協商質感要素；驗證方式為內容 review，確認五頁都有 witness pair 與 canonical attributes。
- [ ] 2.2 完成 `docs/display-surface-visual-review-checklist.md` 與 `docs/reference-match/all-pages-checklist.md` 更新，讓後續 review 直接檢查 hero hierarchy、card-family rhythm、photo fade、source-like icon、absolute composition 與 distance readability；驗證方式為內容 review，確認 checklist 條目可直接用於 playback visual change。

## 3. 加入輕量 guardrail 與 review 記錄格式

- [ ] 3.1 完成 `Prevent management-surface drift inside playback focus regions` 的輕量 guardrail，讓既有 `apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts` 或同級測試能捕捉常見 dashboard/table/toolbar drift 類型；驗證方式為執行 `pnpm --filter @solar-display/web test -- src/pages/displaySurfaceVisualGuardrails.test.ts`。
- [ ] 3.2 完成 review artifact 的 preserved-or-changed canonical 記錄格式，讓 `docs/display-surface-visual-review-checklist.md` 與 `docs/reference-match/playback-visual-canonicals.md` 能記錄哪些 protected canonicals 被保留、哪些是有意偏離及其理由；驗證方式為內容 review，確認 reviewer 不需要依賴聊天記憶就能判斷變更是否退化。
