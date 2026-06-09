// Representative clear-day solar generation *power* (kW) for each hour of the
// day. Shape: dark overnight, a steep morning ramp once the sun clears the
// horizon, a broad peak just after solar noon (~13:00), then a gentle, longer
// afternoon decline into dusk. This asymmetric profile reads as a real PV
// generation curve rather than a symmetric sine arch.
//
// Shared by the dev seed (metric_snapshots history) and the mock metrics feed
// (runtime live values) so both paths render the same daily curve.
export const SOLAR_GENERATION_PROFILE_KW: readonly number[] = [
  0, // 00
  0, // 01
  0, // 02
  0, // 03
  0, // 04
  0, // 05
  60, // 06 — dawn
  650, // 07 — steep morning ramp begins
  1750, // 08
  2800, // 09
  3550, // 10
  4020, // 11
  4180, // 12
  4200, // 13 — peak, just after solar noon
  4090, // 14
  3820, // 15
  3420, // 16
  2900, // 17
  2250, // 18 — gentle afternoon decline
  1450, // 19
  650, // 20
  150, // 21 — dusk tail
  0, // 22
  0 // 23
];

// Instantaneous generation power for an arbitrary moment, linearly interpolating
// between the hourly profile samples so a periodic feed produces a smooth curve.
export function computeSolarGenerationPowerAt(date: Date): number {
  const hour = date.getHours();
  const fraction = date.getMinutes() / 60 + date.getSeconds() / 3600;
  const current = SOLAR_GENERATION_PROFILE_KW[hour] ?? 0;
  const next = SOLAR_GENERATION_PROFILE_KW[(hour + 1) % 24] ?? 0;
  return Math.round(current + (next - current) * fraction);
}
