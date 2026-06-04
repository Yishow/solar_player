## 1. Editor Handoff Completion

- [x] 1.1 Implement `Keep asset replacement and focal editing on the editor handoff path` so `Provide actionable editor handoff for focal editing instead of disabled placeholders` becomes a real selected-asset workflow; verify with apps/web/src/pages/ImageManagement/index.test.tsx and a manual selected-asset handoff assertion.
- [x] 1.2 Implement `Provide actionable editor handoff for focal editing instead of disabled placeholders` with visible selected-asset context and operator guidance; verify with apps/web/src/pages/ImageManagement/ImageManagementContent.tsx content review and a manual `/settings/images` interaction review.

## 2. Multi-Entry Governance

- [x] 2.1 Implement `Separate asset metadata governance from playlist entry governance` so `Support structured governance for one asset to many playlist entries` is explicit in the right-side governance surface; verify with apps/web/src/pages/ImageManagement/viewModel.test.ts.
- [x] 2.2 Implement `Support structured governance for one asset to many playlist entries` with row selection or row summary behavior for title, fallback mode, duration, order, and enabled state; verify with apps/web/src/pages/ImageManagement/index.test.tsx and a manual multi-row governance scenario.

## 3. Reference and Delete Triage

- [x] 3.1 Implement `Make references and delete blockers structured triage surfaces` so live, draft, slideshow, and blocker contexts are grouped by purpose instead of raw status text; verify with apps/web/src/pages/ImageManagement/index.test.tsx and a content review of the rendered triage surface.
- [x] 3.2 Implement `Present references and delete blockers as structured triage surfaces` so operators can identify the blocking source and next step before delete or bootstrap actions; verify with apps/web/src/pages/ImageManagement/viewModel.test.ts and a manual delete-blocker review.
