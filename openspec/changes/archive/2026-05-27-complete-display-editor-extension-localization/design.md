## Context

The editor already has a localization helper, but newer field schemas and standalone shell editor controls bypass or underuse it. The fix should be surgical: localize visible UI text where it is declared, and expand the helper only for shared labels.

## Goals

- Make primary editor operation labels Traditional Chinese.
- Keep labels consistent across page objects, shell objects, asset pickers, and media effects.
- Add coverage that catches future unlocalized editor labels.

## Non-Goals

- Do not introduce a full i18n framework.
- Do not localize stored config keys, API payloads, or route paths.
- Do not rewrite unrelated management pages.

## Decisions

### Primary Label Rule

Visible button labels, field labels, status text, and empty states in display editor extension surfaces SHALL use Traditional Chinese. English may appear only as a secondary subtitle or literal technical identifier when the identifier is necessary.

### Shared Label Map

Common field labels SHOULD go through `localizeDisplayEditorLabel` or be declared in Chinese at schema creation time. One-off shell editor labels may be localized directly in the component.

### Regression Coverage

Tests SHALL cover representative effect field labels, shell object controls, and asset picker labels so newly added editor extensions do not regress to English-first UI.

## Verification

- Tests assert media effect field labels render in Traditional Chinese.
- Tests assert shell decoration mount/type/options and geometry labels render in Traditional Chinese.
- Tests assert asset picker labels and empty states render in Traditional Chinese.
