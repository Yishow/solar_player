## Tasks

- [x] Implement `Expose Shared Shell Decorations authoring inside Display Pages Editor` by adding a Shared Shell Decorations workspace entry inside `/display-pages/editor`.
- [x] Apply the `Workspace Model` design by rendering the existing shell decoration authoring surface inside the editor workspace layout.
- [x] Apply `Shared Preview Foundation` by using the same shell preview foundation for header/footer dimensions, guides, and asset picking.
- [x] Preserve shell object list, inspector, canvas selection, ordering, visibility, locking, and asset picker behavior.
- [x] Implement `Preserve separate shell draft and publish lifecycle` by keeping shell save/publish controls separate from page draft/live controls and labeling their state clearly.
- [x] Apply `Lifecycle Separation` in tests so page publish and shell publish remain separate operations.
- [x] Route or redirect `/shell-decorations/editor` to the integrated editor workspace as a compatibility entry.
- [x] Add tests proving shell authoring is reachable in `/display-pages/editor` and still uses shell APIs.
- [x] Run affected web tests for DisplayPagesEditor, ShellDecorationEditor, shell decoration services, and routing.
