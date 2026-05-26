## Context

Shell decoration objects use header/footer-local coordinates, while the page editor canvas uses content-surface coordinates. The existing shell editor previews objects in the right place but does not expose interaction primitives. A small interaction adapter can reuse canvas math without merging shell objects into page regions.

## Goals

- Make shell decoration authoring feel like an editor canvas, not a static preview.
- Keep shell objects constrained to their mounted header or footer band.
- Preserve object list controls for crowded or overlapping decoration layers.

## Non-Goals

- Do not change shell decoration schema.
- Do not merge shell draft/live lifecycle with page draft/live lifecycle.
- Do not implement arbitrary multi-object shell layout tools in this change.

## Decisions

### Shell Canvas Interaction Model

The shell canvas SHALL adapt existing canvas interaction primitives to shell object frames. Header objects use header-local bounds; footer objects use footer-local bounds. Drag and resize operations update the selected object's `frame` values in shell coordinates.

### Band-Constrained Guides

The shell canvas SHALL render guides for the active mount band and shell boundaries. Measurement feedback uses design-space values and MUST identify whether the selected object is mounted in header or footer.

### List And Canvas Cooperation

Object list remains authoritative for ordering, visibility, locking, deletion, and duplication. Canvas selection SHOULD update the same selected object state used by the list and inspector.

## Verification

- Tests cover selecting a shell object from the canvas.
- Tests cover drag/resize updates staying inside header/footer mount bounds.
- Tests cover locked shell objects remaining selectable but not draggable.
