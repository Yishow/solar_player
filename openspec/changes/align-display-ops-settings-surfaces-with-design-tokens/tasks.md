## Tasks

- [ ] Implement `Align display-ops settings and preview surfaces to the same semantic token family` by `Scope the display-ops settings family explicitly` across playback, image management, MQTT, circuits, and slideshow preview.
- [ ] Implement `Reposition image management as governance and editor handoff after asset-library integration` by `Reposition image management around governance and editor handoff` so `/settings/images` no longer duplicates the integrated asset library role.
- [ ] Align playback settings and slideshow preview to the same tokenized preview/status/action surface family.
- [ ] Implement `Preserve explicit high-risk settings state readability during token alignment` by `Reuse shared reference-management primitives and semantic tokens` without regressing MQTT and circuit display-state mapping.
- [ ] Implement `Keep asset and shell authoring as editor handoffs rather than revived settings destinations` by `Preserve compatibility handoffs without restoring hidden footer destinations` for `/settings/assets` and `/shell-decorations/editor`.
- [ ] Add or update tests covering image-management handoff role, preview-surface alignment, and high-risk settings readability.
- [ ] Run affected web tests for PlaybackSettings, ImageManagement, MqttSettings, CircuitSettings, and SlideshowPreview.
