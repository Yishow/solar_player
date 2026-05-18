## 1. Typed inspector schema

- [ ] 1.1 Deliver `Describe region fields with a schema-aware inspector contract` and reference `Describe region fields with a schema-aware inspector contract` by introducing reusable field-schema definitions and typed inspector rendering, verified by targeted web tests for mixed field types.
- [ ] 1.2 Deliver `Enforce typed inspector constraints during editing` by surfacing invalid ranges, required values, and compatibility errors in inspector controls, verified by targeted web tests.

## 2. Reset and diff tools

- [ ] 2.1 Deliver `Compute reset and diff tools against seed and current draft state` and reference `Compute reset and diff tools against seed and current draft state` by marking dirty fields and allowing field or region reset, verified by `pnpm --filter @solar-display/web test` covering dirty-state and reset behavior.
- [ ] 2.2 Deliver `Keep reset and diff tools scoped to the current page draft` by ensuring reset operations only affect the active draft page unless explicitly broadened, verified by targeted hook or component tests.

## 3. Region presets

- [ ] 3.1 Deliver `Keep region presets opt-in and scoped by compatibility` and reference `Keep region presets opt-in and scoped by compatibility` by defining preset compatibility rules and apply actions, verified by targeted inspector tests.
- [ ] 3.2 Deliver `Surface incompatible presets before they overwrite content` by blocking or flagging incompatible presets without mutating content, verified by targeted web tests for preset selection failures.
