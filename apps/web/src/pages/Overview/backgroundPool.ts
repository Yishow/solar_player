import type { DisplayPageMediaBinding } from "@solar-display/shared";

/**
 * Pick one background candidate from the Overview background pool.
 *
 * - Empty pool returns null (caller falls back to hero media).
 * - A single-candidate pool always returns that candidate.
 * - For multiple candidates the index is `floor(randomFn() * length)`,
 *   clamped into `[0, length - 1]` so out-of-range random values
 *   (≥ 1 or negative) never produce an undefined selection.
 */
export function pickOverviewBackground(
  pool: readonly DisplayPageMediaBinding[],
  randomFn: () => number = Math.random
): DisplayPageMediaBinding | null {
  if (pool.length === 0) {
    return null;
  }

  const rawIndex = Math.floor(randomFn() * pool.length);
  const index = Math.min(pool.length - 1, Math.max(0, rawIndex));
  return pool[index]!;
}
