## 1. 資產目錄與引用契約

- [x] 1.1 Implement **Model one managed asset catalog with category and usage-scope metadata** so **Asset library management organizes display assets by category and usage scope** returns `background`, `object`, and `icon` assets with explicit usage scope and usage summaries, and verify with server catalog coverage plus `pnpm --filter @solar-display/server test`.
- [x] 1.2 Implement **Assign category and usage scope at upload time** so **Asset library management assigns category and usage scope during upload** stores picker-ready metadata during upload or import instead of creating uncategorized catalog entries, and verify with upload or metadata-ingest coverage plus `pnpm --filter @solar-display/server test`.
- [x] 1.3 [P] Implement **Reuse managed asset references across page media, shell decorations, and page objects** so **Bind display page media fields to managed asset library references** accepts one managed asset reference family for media fields and asset-backed shell or page objects, and verify with cross-surface reference coverage plus `pnpm --filter @solar-display/server test`.

## 2. 管理面與刪除保護

- [x] 2.1 Implement **Provide a dedicated asset library management surface separate from image playlist governance** so **Asset library management organizes display assets by category and usage scope** exposes category tabs, search or filter controls, and usage summaries in one management page, and verify with web route coverage plus `pnpm --filter @solar-display/web test`.
- [x] 2.2 [P] Implement missing-asset diagnostics so **Protect managed asset references from silent breakage** continues to report broken display page, shared shell, and freeform object references through management surfaces, and verify with cross-surface asset health coverage plus `pnpm --filter @solar-display/server test` and `pnpm --filter @solar-display/web test`.
- [x] 2.3 Implement **Prevent destructive deletes when assets are still referenced** so **Asset library management reports cross-surface usage before destructive actions** blocks deletion for assets still used by shell or page configs and surfaces the referencing locations, and verify with server and web delete-guard coverage plus `pnpm --filter @solar-display/server test` and `pnpm --filter @solar-display/web test`.

## 3. 驗證

- [x] 3.1 Run `pnpm --filter @solar-display/server test`, `pnpm --filter @solar-display/web test`, and `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json` to confirm the asset library catalog, management surface, and cross-surface guards compile and pass their targeted suites.
- [x] 3.2 Run `spectra validate --strict --changes add-display-asset-library-management` to confirm the asset library management artifacts remain internally consistent.
