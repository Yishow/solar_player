# Shell And Mapping Foundation Evidence

## Scope Review

- Change: `align-solar-display-shell-and-mapping-foundation`
- This phase only locks:
  - shared FHD shell family
  - reusable shell primitives and density variants
  - 14-page prototype-to-runtime mapping baseline
  - downstream verification matrix and hard phase gates
- This phase does not claim any page-body migration beyond shell witness review.

## Fresh Verification

1. `pnpm --filter @solar-display/web test -- src/components/shellFoundation.test.ts`
   - Result: pass (`12/12`)
   - Note: `tsx --test` still resolves the existing web test corpus, but the shell witness assertions remain covered and green.
2. `pnpm --filter @solar-display/web build`
   - Result: pass

## Shell Witness Review

### Playback witness: `/overview`

- Screenshot:
  - `artifacts/umbrella-final-fhd/01-overview.png`
- Manual review:
  - header family、environment badge、MQTT status chip、page number pill 與 footer rail 都由 shared shell 提供。
  - hero + media canvas 採用 playback density，沒有 route-local 自製 shell markup。

### Management witness: `/settings/playback`

- Screenshot:
  - `artifacts/umbrella-final-fhd/07-settings-playback.png`
- Manual review:
  - header / footer / page number pill 與 `/overview` 同源一致。
  - content canvas 改為 management density，表單與 save panel 共用同一套 shell family，而不是另一套頁框。

## Mapping Baseline Review

- Source of truth:
  - `openspec/changes/align-solar-display-shell-and-mapping-foundation/design.md`
- Reviewed outcomes:
  - `01-14` 每頁都有 prototype source、runtime route、page file、shared primitives、major runtime data source。
  - 每頁都有 `reference-only` 與 `fallback-only` 說明，沒有把 prototype sample value 升格成 runtime contract。
  - downstream verification matrix 已對應 shell foundation、playback batches、settings batches、monitoring batch 與 umbrella final closeout。

## Phase 1 Boundary Note

- Phase 1 exit 已具備：
  - shared shell witness
  - build/test command evidence
  - durable 14-page mapping baseline
- 仍未完成但屬於後續 phase 的 page-specific gap：
  - `/overview` 以外的 playback body alignment
  - `/settings/playback` 以外的 management body alignment
  - 所有 interaction-heavy route 的 dedicated smoke / evidence bundle
