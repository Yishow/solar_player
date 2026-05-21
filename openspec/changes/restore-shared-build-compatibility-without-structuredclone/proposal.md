## Why

目前 root `pnpm build` 會在 `packages/shared/src/displayPageCardRail.ts` 卡住，因為 `@solar-display/shared` 以 `lib: ["ES2022"]` 編譯時沒有 `structuredClone` 型別，但 card rail helper 已直接依賴它。這讓 repo 在測試通過的情況下仍無法產出正式 shared build，屬於真實的 release blocker。

## What Changes

- 定義 shared package 的 build compatibility contract，要求 `@solar-display/shared` 在既有 `ES2022` TypeScript lib 設定下可成功編譯，不依賴 `structuredClone` 這類超出宣告契約的全域。
- 將 `displayPageCardRail` 的 clone 行為改為 package-local、與目前資料形狀相容的實作，維持 card rail payload/frame 的 detached copy semantics。
- 補上 build 驗證，確認 `pnpm --filter @solar-display/shared build` 與 root `pnpm build` 不再因 shared package 失敗而中斷。

## Non-Goals

- 不全面移除整個 repo 的 `structuredClone` 使用；這個 change 只處理目前阻斷 shared build 的路徑。
- 不變更 `displayPageCardRail` schema、Sustainability card rail 呈現邏輯或 editor authoring contract。
- 不透過提升 shared package `lib` 或額外安裝 polyfill 來掩蓋編譯契約問題。

## Capabilities

### New Capabilities

- `shared-build-compatibility`: 定義 `@solar-display/shared` 必須在宣告的 TypeScript/runtime 契約下成功 build，且保留 shared card-rail helper 的 clone 隔離行為。

### Modified Capabilities

(none)

## Impact

- Affected specs: `shared-build-compatibility`
- Affected code:
  - Modified:
    - `packages/shared/src/displayPageCardRail.ts`
    - `packages/shared/package.json`
    - `package.json`
  - New:
    - `packages/shared/src/cloneValue.ts`
    - `openspec/changes/restore-shared-build-compatibility-without-structuredclone/specs/shared-build-compatibility/spec.md`
  - Removed:
    - (none)
