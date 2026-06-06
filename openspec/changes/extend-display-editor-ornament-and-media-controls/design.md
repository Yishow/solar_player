## Context

Phase 2 witness notes classified several playback gaps as editor capability gaps: media tone controls, Solar ornament hardcodes, Sustainability leaf layout hardcodes, and Images stage/thumb framing values that are currently CSS-only or inferred from a page-local runtime condition.

Current code already exposes some adjacent capability:

- Hero/media bindings already use shared media effect surfaces and the layer-based media effect inspector.
- Ring ornament `thickness` and `glowOpacity` already exist in `RingOrnamentChromeConfig`, editor fields, and Sustainability runtime CSS vars.
- Typography and palette gaps belong to `extend-typography-palette-and-fix-ornament-bindings` and are not part of this change.

This change fills the remaining actual gaps without changing routes, APIs, DB schema, shell chrome, or playback data contracts.

## Goals / Non-Goals

**Goals:**

- Add editor-backed full-frame media saturation/contrast controls through the shared media effect model.
- Move Solar gold line base left/top/width and rotation from page-local hardcode/CSS into seed-backed chrome config.
- Move Solar and Sustainability leaf base left/top/width/height from page-local hardcode/layout constants into seed-backed chrome config.
- Add Images main stage radius/shadow/full-bleed controls and thumbnail radius controls, replacing the runtime-only `isReferenceHeroCrop` framing decision for stage chrome.
- Preserve current visual defaults when new persisted config values are absent.

**Non-Goals:**

- Do not duplicate ring thickness/glow models; only verify the already-present ring fields remain wired.
- Do not change shell, routes, API, SQLite/MQTT, publish contracts, or runtime data sources.
- Do not implement Factory circuit routing SVG editing.
- Do not declare any playback page launch-ready.

## Decisions

### Extend the existing media effect layer model

Add a full-frame `tone` media effect layer with `saturation` and `contrast` numeric values. This keeps the capability in the same shared resolver/inspector path as opacity, blur, fade, and mist. Runtime combines tone filters with existing full-frame blur filters instead of replacing one with the other.

### Keep ornament base layout in chrome config

Gold line and leaf ornament base geometry belongs beside the existing ornament opacity, offset, scale, and rotation controls. The seed config stores current page defaults; runtime computes content offset from those config values. Existing offset controls remain relative nudges.

### Keep Images framing in a page chrome module

Images main stage and thumbnail framing are presentation chrome, not playlist data. Add an Images chrome module for stage radius/shadow/full-bleed and thumbnail radius. Runtime uses the config to decide border radius, shadow, overlay visibility, and info-card visibility; the active image source no longer owns that decision.

## Implementation Contract

**Behavior:**

- A supported media surface can add/edit a `tone` layer with saturation and contrast values.
- Runtime media rendering applies tone layers as CSS `saturate(...)` and `contrast(...)`, while preserving existing blur and opacity behavior.
- Solar gold line base left/top/width and rotation are read from resolved config instead of page-local literals or CSS-only rotation.
- Solar and Sustainability leaf base geometry is read from resolved config instead of page-local hardcoded layout objects.
- Images main stage border radius, shadow, full-bleed mode, and thumbnail radius are read from resolved config. Full-bleed disables main-stage overlays and hides the info card through config, not through `isReferenceHeroCrop`.
- Ring thickness and glow remain editor-backed through the existing `RingOrnamentChromeConfig` path.

**Interface / data shape:**

- `DisplayPageMediaEffectKind` gains `tone`; `DisplayPageMediaEffectSupport` can advertise `tone` for `full-frame`.
- `GoldLineChromeConfig` gains base layout and `rotationDeg`.
- `LeafOrnamentChromeConfig` gains base layout values.
- `ImagesDisplayPageConfig.chrome.modules` gains a stage/thumb framing module.

**Failure modes:**

- Missing new persisted values fall back to seed-specific config.
- Invalid media tone numbers fall back or clamp through the shared media effect resolver.
- Full-frame filters compose deterministically; a tone layer must not silently remove blur or opacity.

**Acceptance criteria:**

- Targeted tests fail before implementation and pass after implementation.
- `spectra analyze extend-display-editor-ornament-and-media-controls --json` has no findings.
- `spectra validate --strict --changes extend-display-editor-ornament-and-media-controls` passes.
- Targeted web/shared tests, `pnpm run build`, `pnpm test`, and `graphify update .` complete.

## Audit Notes

- New persisted numeric config values use bounded or finite normalization with safe visual fallbacks.
- No new security-sensitive API, auth, file path, or network behavior is introduced.
- The main silent-failure risk is partial persisted config replacing seed defaults; runtime merges must be seed-backed for the new objects.
