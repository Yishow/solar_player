# Overview Background Rotation Pool — Witness

Captured at 1920×1080 via agent-browser against `pnpm run dev` (`/overview`).

## Evidence

- `overview-background-pool.png` — random pick `overview_bg-3`; full-canvas
  factory photo fills the 1920×1080 canvas, hero copy（以綠色製造 / 驅動美好生活）
  overlaid top-left, weather / three-phase / generation-trend widgets and the
  five KPI cards layered above as frosted-glass surfaces.
- `overview-background-pool-alt.png` — reload re-mounted the page and selected a
  different candidate `overview_bg-1`, demonstrating the per-rotation random pick.

## Observed behaviour

- `.overview-page-background` element present (count 1) when the pool is
  non-empty; `.overview-hero-banner` count drops to 0 (background replaces the
  hero banner, per contract).
- `.overview-kpi-card` count 5 — widgets/cards remain layered above the
  background (z-index 0 background, widgets 11/12).
- Reloading 8× produced varying candidates (bg-1, bg-3, bg-4), confirming the
  mount-time random selection over the seeded 4-image pool.
- Background `<img>` resolves to the Vite-bundled `overview_bg-N.png` (dev:
  `/@fs/.../uploads/overview_bg-3.png`; build bundles them into `dist/assets`).

## Empty-pool fallback

Empty-pool fallback to existing hero media is covered by
`backgroundPool.test.ts` (`pickOverviewBackground([]) → null`) and the render
conditional asserted in `render.test.ts`; not separately screenshotted because
the seed pool always provides 4 candidates at runtime.
