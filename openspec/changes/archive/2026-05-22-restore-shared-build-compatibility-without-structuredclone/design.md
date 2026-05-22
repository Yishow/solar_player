## Context

`@solar-display/shared` 目前以 `target/lib = ES2022` 編譯，這代表 package 公開宣告的編譯契約不包含 `structuredClone` 全域型別。`packages/shared/src/displayPageCardRail.ts` 卻直接用 `structuredClone` 做 frame/payload 複製，導致 shared package build 失敗，進而讓 root `pnpm build` 在第一步就中止。

這個 change 不處理整個 monorepo 的 clone 風格統一；它只處理 shared package 對外可 build、且 card rail helper 不因替換 clone 實作而改變資料隔離語意。

## Goals / Non-Goals

**Goals:**

- 恢復 `@solar-display/shared` 與 root build 的成功路徑。
- 在不擴張 shared package 編譯契約的前提下，保留 `displayPageCardRail` 對 frame/payload 的 detached copy 行為。
- 讓未來 reviewer 可以從 artifact 明確知道這是一個 build compatibility 修補，而不是 card rail schema 變更。

**Non-Goals:**

- 不把 repo 其他 `structuredClone` 呼叫一併抽成共用 helper。
- 不調整 `packages/shared/tsconfig.json` 去升級 `lib`、加入 DOM typings，或引入 runtime polyfill 套件。
- 不變更 `displayPageCardRail` 匯出型別、legacy upgrade 行為或下游頁面資料結構。

## Decisions

### Keep the ES2022 shared package contract

shared package SHALL 繼續遵守目前宣告的 `ES2022` build contract，而不是為了通過編譯把 `lib` 拉高或加入與 package runtime 假設不一致的全域 typings。這能確保 build 成功代表 package 真正符合自身宣告的環境，而不是單純對型別系統放寬。

替代方案是修改 `packages/shared/tsconfig.json` 或加入環境型別宣告。這會把「shared 需要什麼 runtime」變得模糊，也可能掩蓋其他未宣告的全域依賴，因此排除。

### Replace structuredClone with a package-local clone helper for card rail data

`displayPageCardRail` SHALL 改用 package-local clone helper，僅覆蓋目前 card rail payload、frame、legacy rail container 這些 plain-object/array/string/number 結構。這保留目前 helper 需要的深拷貝語意，又不把 shared package 綁死在 `structuredClone`。

替代方案是直接改成淺拷貝。那會讓外部呼叫者在 mutate 原始 frame/payload 時污染 helper 產出的資料，不符合現有 card rail helper 的保護語意，因此排除。

### Verify compatibility through shared and root builds

這個 change 的主要 acceptance SHALL 來自實際 build，而不是只看型別片段或單元測試。shared package build 成功只能證明局部修復；root `pnpm build` 也必須通過，才能證明修補沒有留下 monorepo integration regression。

替代方案是只跑 `pnpm test`。目前測試已經能通過卻無法 build，無法涵蓋這次問題，因此排除。

## Implementation Contract

- Behavior: `@solar-display/shared` 在既有 `ES2022` TypeScript lib/runtime 契約下可以成功 build；root `pnpm build` 不再因 `displayPageCardRail` 的 clone helper 使用未宣告全域而失敗。
- Interface / data shape: `createMetricHighlightCard`、`upgradeLegacyMetricHighlightRail`、以及相關 card rail helper 的公開型別與回傳 shape 保持不變；唯一改變是內部 clone 實作不再依賴 `structuredClone`。
- Failure modes: 如果輸入不是既有 validator 已接受的 plain-object card rail 結構，helper 行為維持現況；本 change 不新增寬鬆容錯或新的錯誤 shape。
- Acceptance criteria:
  - `pnpm --filter @solar-display/shared build` 通過。
  - root `pnpm build` 通過 shared/build 階段，且不再出現 `Cannot find name 'structuredClone'`。
  - 受影響的 card rail helper regression 驗證 clone 後資料與原始輸入脫鉤。
- Scope boundaries: 只修 shared package build 相容性與 card rail clone semantics；不變更其他 package 的 clone helper、不新增 polyfill 依賴，也不改 card rail schema。

## Risks / Trade-offs

- [Risk] package-local clone helper 若假設過度保守，可能漏掉未來新增的 card rail 欄位型別。 → Mitigation：將 helper 範圍限定在目前已知 plain-object 結構，並在 artifact 明示 schema 變更不在本次範圍。
- [Risk] 只修 shared 這一路徑，repo 其他 `structuredClone` 呼叫仍可能各自依賴不同 runtime。 → Mitigation：本 change 明確只處理目前被 root build 證實阻斷的 shared package，其他路徑另案追蹤。
