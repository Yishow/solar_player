## Tasks

- [x] Implement `Expose layer controls from the current selection for reorderable authoring nodes` by `Surface layer controls from the current selection`.
- [x] Implement `Define reorderable eligibility explicitly` for freeform objects, shell decoration objects, and any other supported ordered authoring nodes.
- [x] Implement `Explain fixed-layout regions that do not support layer authoring` when the selected region cannot participate in z-order editing.
- [x] Implement `Distinguish z-order authoring from selection-routed media-effect editing` by `Keep z-order eligibility separate from media-effect support` so effect-capable but non-reorderable surfaces do not render misleading z-order controls.
- [x] Implement `Keep parallel layer entry points synchronized` by `Keep list controls as a parallel entry point` on the same ordering path.
- [x] Add tests for eligible reorder actions, fixed-layout explanations, and ordering synchronization.
- [x] Run affected web tests for DisplayPagesEditor and ShellDecorationEditor layer authoring.
