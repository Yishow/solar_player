## 1. Build Contract Guard

- [x] 1.1 完成 `Keep the ES2022 shared package contract`，讓 `Shared package builds without structuredClone-only globals` 在不升級 shared package typings 契約的前提下仍能成功編譯；驗證方式為執行 `pnpm --filter @solar-display/shared build`，確認不再出現 `Cannot find name 'structuredClone'`。
- [x] 1.2 完成 `Replace structuredClone with a package-local clone helper for card rail data`，讓 `displayPageCardRail` 相關 helper 保持 detached clone semantics，同時不改公開 schema；驗證方式為補齊受影響 helper 的 regression 驗證並執行 `pnpm --filter @solar-display/shared build`。

## 2. Monorepo Verification

- [x] 2.1 完成 `Verify compatibility through shared and root builds`，讓 root build 可以通過 shared package 階段並延續到後續 web/server build，而不是在 shared package 中止；驗證方式為執行 `pnpm build`。
- [x] 2.2 補齊 `Shared package builds without structuredClone-only globals` 的驗證矩陣，確認 shared build 與 root build 都覆蓋到這次修補的 contract，並以 `spectra analyze restore-shared-build-compatibility-without-structuredclone`、`spectra validate restore-shared-build-compatibility-without-structuredclone --strict` 驗證 artifact 完整性。
