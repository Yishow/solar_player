## 1. Shared display operations summary

- [ ] 1.1 Deliver `Integrate Playback Settings with display operations summary` and reference `Use a shared display operations summary for management surfaces` by adding a shared summary service and surfacing publish state, effective rotation status, and skip reasons in Playback Settings, verified by targeted server tests and management UI checks.
- [ ] 1.2 Deliver `Show pending display changes that affect playback workflow` by exposing unpublished draft impact inside Playback Settings, verified by targeted web tests or manual inspection of `/settings/playback`.

## 2. Image reference integration

- [ ] 2.1 Deliver `Integrate Image Management with display page references` by returning display-page and slideshow references for selected assets and rendering them in Image Management, verified by targeted server tests plus manual inspection of `/settings/images`.
- [ ] 2.2 Deliver `Surface image deletion or replacement blockers from display references` and reference `Surface blockers where operators already work` by warning or blocking destructive actions when live references still exist, verified by targeted tests for delete or replace flows.

## 3. Cross-surface synchronization

- [ ] 3.1 Deliver `Synchronize display operations state across editor, Playback Settings, and Image Management` and reference `Keep playback and image surface actions independent but synchronized` by wiring summary refresh or socket events after relevant actions, verified by targeted web or socket tests.
- [ ] 3.2 Deliver `Surface blockers where operators already work` by showing blocker banners or inline warnings on the current management page, verified by manual cross-surface checks and targeted component tests.
