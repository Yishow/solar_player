## 1. Draft ownership and selection guards

- [x] 1.1 Deliver `Preserve dirty image management drafts across asset selection changes` by making `apps/web/src/pages/ImageManagement/index.tsx` keep, block, or explicitly discard unresolved edits before changing the selected image, and verify with `apps/web/src/pages/ImageManagement/index.test.tsx` scenarios that switching from image A to image B no longer silently loses the draft.
- [x] 1.2 Deliver `Keep one selected asset draft session authoritative` and `Guard selection changes until prior draft is resolved` by aligning dirty ownership with a single selected asset / playlist row session, and verify through `apps/web/src/pages/ImageManagement/viewModel.test.ts` and targeted component assertions that the active draft can always be traced to one persistence target.

## 2. Targeted save and resync contract

- [x] 2.1 Deliver `Save the selected image management draft against the intended asset and playlist row` by updating the save pipeline in `apps/web/src/pages/ImageManagement/index.tsx` and `apps/web/src/services/api.ts` so the persisted payload matches the authoritative selected session, and verify with `apps/web/src/pages/ImageManagement/index.test.tsx` that save feedback maps to the same image the operator was editing.
- [x] 2.2 Deliver `Save and resync only the edited asset/entry pair` by resyncing the same selection after a successful save and retaining the draft on failure, and verify with `pnpm --filter @solar-display/web test -- src/pages/ImageManagement/index.test.tsx src/pages/ImageManagement/viewModel.test.ts`.
