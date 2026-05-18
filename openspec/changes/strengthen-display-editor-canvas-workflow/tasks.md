## 1. Canvas manipulation

- [ ] 1.1 Deliver `Manipulate display editor geometry directly on canvas` and reference `Manipulate geometry directly on canvas` by implementing drag and resize interactions for editable regions, verified by targeted interaction tests and manual `/display-pages/editor` verification.
- [ ] 1.2 Deliver `Support zoom, pan, and keyboard nudge during canvas editing` by adding viewport controls and keyboard nudging for selected regions, verified by `pnpm --filter @solar-display/web test` on interaction reducers or hooks plus manual checks.

## 2. Region navigation

- [ ] 2.1 Deliver `Keep region navigation separate from visual overlay` and reference `Keep region navigation separate from visual overlay` by adding a region tree that synchronizes with canvas selection, verified by targeted web tests for selection sync.
- [ ] 2.2 Deliver `Support locked regions in display editor navigation` by preventing direct manipulation on locked regions while keeping them selectable, verified by interaction tests.

## 3. Layout reuse and history

- [ ] 3.1 Deliver `Reuse layout adjustments within an editor session` by adding reset and copy-and-paste geometry actions for compatible regions, verified by manual editor checks and targeted reducer tests.
- [ ] 3.2 Deliver `Persist editor history per page session` and reference `Persist editor history per page session` by implementing undo and redo stacks for unsaved changes, verified by targeted web tests covering undo and redo behavior.
