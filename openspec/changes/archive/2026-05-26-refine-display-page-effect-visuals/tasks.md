## Tasks

- [x] Audit current media effect config and identify which saved values should drive `Render visible localized mist effects consistently`.
- [x] Implement the `Mist Layer` design in the shared media renderer with a visible edge mist or localized blur layer.
- [x] Apply `Bounded Defaults` by adding conservative visible mist defaults only to pages that require them, starting with Overview.
- [x] Apply `Control Mapping` by keeping editor controls wired to the same renderer used by playback preview.
- [x] Implement `Keep media effects bounded to their owning media layer` so mist and blur do not cover shell chrome or unrelated content.
- [x] Add tests for mist-enabled style output, disabled fallback, bounded clipping, and editor/runtime consistency.
- [x] Run affected web tests for media style, effect fields, and live preview rendering.
