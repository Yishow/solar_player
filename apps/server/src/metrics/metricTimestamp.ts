/**
 * Stored live metric timestamps exist in two forms:
 *
 * - an ISO 8601 form carrying an explicit zone designator, written from MQTT
 *   payload timestamps;
 * - a zone-less `YYYY-MM-DD HH:MM:SS` form written by SQLite CURRENT_TIMESTAMP,
 *   whose content is a UTC wall clock.
 *
 * `Date.parse` reads the zone-less form as *server local* time, so on a non-UTC
 * server it lands a full zone offset away from the true instant. Normalizing at
 * the storage read boundary keeps that assumption in one place instead of
 * leaking "zone-less means UTC" into the shared freshness layer — where it would
 * be wrong for `metric_snapshots.captured_at`, which really is a local wall clock.
 */

const ZONELESS_UTC_WALL_CLOCK =
  /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2}(?:\.\d+)?)$/;

/**
 * Normalize a stored live metric timestamp to a form carrying an explicit zone
 * designator.
 *
 * Idempotent: a value that already carries `Z` or a numeric offset is returned
 * unchanged, so repeated application is safe. Never throws — input that is not a
 * recognizable timestamp is returned unchanged so the existing
 * "unparseable timestamp means unavailable" handling downstream still applies.
 */
export function normalizeMetricTimestamp(value: string): string {
  const match = ZONELESS_UTC_WALL_CLOCK.exec(value);
  if (!match) {
    return value;
  }

  // The shape matched, but the field values may still be nonsense (month 13,
  // hour 99). Appending a designator to those would manufacture a well-formed
  // string that denotes no real instant, hiding bad data instead of surfacing it.
  const candidate = `${match[1]}T${match[2]}Z`;
  return Number.isNaN(Date.parse(candidate)) ? value : candidate;
}
