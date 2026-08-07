import assert from "node:assert/strict";
import test from "node:test";

import { normalizeMetricTimestamp } from "./metricTimestamp.js";

// The zone-less form is written by SQLite CURRENT_TIMESTAMP and is a UTC wall
// clock. Date.parse would otherwise read it as server local time.
test("normalizeMetricTimestamp reads the zone-less form as UTC", () => {
    assert.equal(
        Date.parse(normalizeMetricTimestamp("2026-08-06 17:14:25")),
        Date.parse("2026-08-06T17:14:25Z")
    );
});

test("normalizeMetricTimestamp keeps fractional seconds on the zone-less form", () => {
    assert.equal(
        Date.parse(normalizeMetricTimestamp("2026-08-06 17:14:25.125")),
        Date.parse("2026-08-06T17:14:25.125Z")
    );
});

test("normalizeMetricTimestamp leaves an explicit Z designator untouched", () => {
    const input = "2026-08-06T17:14:25.000Z";

    assert.equal(Date.parse(normalizeMetricTimestamp(input)), Date.parse(input));
});

test("normalizeMetricTimestamp preserves an explicit numeric offset", () => {
    const input = "2026-08-06T17:14:25+08:00";

    assert.equal(Date.parse(normalizeMetricTimestamp(input)), Date.parse(input));
});

test("normalizeMetricTimestamp is idempotent across every supported form", () => {
    for (const input of [
        "2026-08-06 17:14:25",
        "2026-08-06 17:14:25.125",
        "2026-08-06T17:14:25.000Z",
        "2026-08-06T17:14:25+08:00"
    ]) {
        const once = normalizeMetricTimestamp(input);

        assert.equal(normalizeMetricTimestamp(once), once, `not idempotent for ${input}`);
    }
});

test("normalizeMetricTimestamp returns unrecognized input unchanged without throwing", () => {
    for (const input of ["", "not-a-timestamp", "2026-13-45 99:99:99"]) {
        assert.equal(normalizeMetricTimestamp(input), input);
    }
});
