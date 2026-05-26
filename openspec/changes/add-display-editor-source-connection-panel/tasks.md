## Tasks

- [ ] Implement `Display editor exposes a right-side source connection tab` by adding `來源連接` beside `屬性`, `素材健康`, and `發布`.
- [ ] Implement `Right Panel Navigation` so switching tabs preserves the current selected region, object, or visual primitive context.
- [ ] Implement `Source Connection Resolver` for media bindings, managed asset fields, direct src fields, seed-default state, icon registry/glyph fields, ornament keys, and fallback sources.
- [ ] Implement `Source connection tab provides replacement and navigation actions` through `Source Actions` for gallery replacement, opening the integrated asset library workspace, restoring seed/default source, and jumping back to `屬性`.
- [ ] Implement `Source connection tab keeps presentation controls in Properties` through `Effects Summary Boundary` so image effects and presentation settings appear only as read-only summaries with a jump back to `屬性`.
- [ ] Add empty and disabled states for unsupported selections or source actions blocked by pending capabilities.
- [ ] Add tests for tab rendering, source summaries, action states, selection preservation, and non-duplication of effect controls.
- [ ] Run affected web tests for DisplayPagesEditor source connection behavior.
