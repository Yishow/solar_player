import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  DerivedMetricExpressionError,
  convertDerivedMetricExpressionValue,
  evaluateDerivedMetricExpression,
  parseDerivedMetricExpression,
  validateDerivedMetricExpressionUnit
} from "./derivedMetricExpression.js";

const aliases = new Set(["a", "b", "energy", "factor"]);

test("derived expression parser evaluates precedence, unary arithmetic, and allowlisted functions", () => {
  const expression = parseDerivedMetricExpression(
    "sum((a + b) * 2, avg(4, 6), min(a, b), max(a, b), -1)",
    aliases
  );
  assert.deepEqual(evaluateDerivedMetricExpression(expression, { a: 3, b: 4 }), {
    ok: true,
    value: 25
  });
  assert.deepEqual(
    evaluateDerivedMetricExpression(parseDerivedMetricExpression("a + b * 2", aliases), { a: 3, b: 4 }),
    { ok: true, value: 11 }
  );
});

test("derived expression parser rejects code tokens, unknown functions, aliases, malformed syntax, and arity", () => {
  for (const [expression, code] of [
    ["process.env.SECRET", "invalid-token"],
    ["process.exit()", "invalid-token"],
    ["eval(a)", "unknown-function"],
    ["fetch(a)", "unknown-function"],
    ["Math.max(a, b)", "invalid-token"],
    ["missing + 1", "unknown-input"],
    ["a +", "syntax"],
    ["sum()", "invalid-arity"]
  ] as const) {
    assert.throws(
      () => parseDerivedMetricExpression(expression, aliases),
      (error) => error instanceof DerivedMetricExpressionError && error.detail.code === code
    );
  }
});

test("derived expression parser enforces expression, token, depth, and function argument limits", () => {
  for (const expression of [
    "1".repeat(513),
    Array.from({ length: 130 }, () => "a").join("+"),
    `${"(".repeat(33)}a${")".repeat(33)}`,
    `sum(${Array.from({ length: 65 }, () => "a").join(",")})`,
    `${"-".repeat(33)}a`,
    `${"sum(".repeat(33)}a${")".repeat(33)}`
  ]) {
    assert.throws(
      () => parseDerivedMetricExpression(expression, aliases),
      (error) => error instanceof DerivedMetricExpressionError && error.detail.code === "expression-limit"
    );
  }
  assert.throws(
    () => parseDerivedMetricExpression("1e309", aliases),
    (error) => error instanceof DerivedMetricExpressionError && error.detail.code === "non-finite-number"
  );
});

test("derived expression evaluation contains divide-by-zero and non-finite results", () => {
  assert.deepEqual(
    evaluateDerivedMetricExpression(parseDerivedMetricExpression("a / b", aliases), { a: 1, b: 0 }),
    { code: "divide-by-zero", ok: false }
  );
  assert.deepEqual(
    evaluateDerivedMetricExpression(parseDerivedMetricExpression("a * b", aliases), { a: Number.MAX_VALUE, b: 2 }),
    { code: "non-finite-result", ok: false }
  );
  assert.deepEqual(
    evaluateDerivedMetricExpression(parseDerivedMetricExpression("a + b", aliases), { a: Number.NaN, b: 2 }),
    { code: "invalid-input", ok: false }
  );
  assert.deepEqual(
    evaluateDerivedMetricExpression(
      parseDerivedMetricExpression("a + b", aliases),
      { a: null, b: 2 } as unknown as Record<string, number>
    ),
    { code: "input-unavailable", ok: false }
  );
  assert.deepEqual(
    evaluateDerivedMetricExpression(
      parseDerivedMetricExpression("a + b", aliases),
      { a: undefined, b: 2 } as unknown as Record<string, number>
    ),
    { code: "input-unavailable", ok: false }
  );
  assert.deepEqual(
    evaluateDerivedMetricExpression({ kind: "number", value: Number.POSITIVE_INFINITY }, {}),
    { code: "non-finite-result", ok: false }
  );
});

test("derived expression unit validation rejects power plus energy and accepts energy ratio and CO2 mass", () => {
  const incompatible = parseDerivedMetricExpression("a + b", aliases);
  assert.equal(
    validateDerivedMetricExpressionUnit(incompatible, { a: "kW", b: "kWh" }, "kWh")?.code,
    "unit-incompatible"
  );

  const ratio = parseDerivedMetricExpression("a / b * 100", aliases);
  assert.equal(validateDerivedMetricExpressionUnit(ratio, { a: "kWh", b: "kWh" }, "%"), null);

  const co2 = parseDerivedMetricExpression("energy * factor", aliases);
  assert.equal(
    validateDerivedMetricExpressionUnit(co2, { energy: "kWh", factor: "kg/kWh" }, "kg"),
    null
  );
});

test("derived expression unit conversion applies output scale and rejects irreconcilable units", () => {
  const expression = parseDerivedMetricExpression("energy * factor", aliases);
  const units = { energy: "kWh", factor: "kg/kWh" };
  assert.equal(convertDerivedMetricExpressionValue(expression, units, "t", 50), 0.05);
  assert.equal(convertDerivedMetricExpressionValue(expression, units, "kg", 50), 50);
  assert.equal(convertDerivedMetricExpressionValue(expression, units, "kW", 50), null);
  assert.equal(validateDerivedMetricExpressionUnit(expression, units, "kW")?.code, "unit-incompatible");
});

test("derived expression accepts the named tree output unit without changing its magnitude", () => {
  const expression = parseDerivedMetricExpression("adaptiveRound(co2) * 6.25", new Set(["co2"]));
  const units = { co2: "t" };
  assert.equal(validateDerivedMetricExpressionUnit(expression, units, "trees"), null);
  const evaluated = evaluateDerivedMetricExpression(expression, { co2: 53.52 });
  assert.deepEqual(evaluated, { ok: true, value: 334.375 });
  assert.equal(convertDerivedMetricExpressionValue(expression, units, "trees", 334.375), 334.375);
  assert.deepEqual(
    evaluateDerivedMetricExpression(expression, { co2: 1 }),
    { ok: true, value: 6.25 }
  );
  assert.deepEqual(
    evaluateDerivedMetricExpression(expression, { co2: 8_686.2 }),
    { ok: true, value: 54_287.5 }
  );
});

test("derived expression unit lookup rejects inherited property names", () => {
  const expression = parseDerivedMetricExpression("a", aliases);
  assert.equal(
    validateDerivedMetricExpressionUnit(expression, { a: "toString" }, "%")?.code,
    "unit-incompatible"
  );
  assert.equal(convertDerivedMetricExpressionValue(expression, { a: "constructor" }, "%", 1), null);
});

test("expression engine contains no general-purpose code execution primitive", () => {
  const source = readFileSync(new URL("./derivedMetricExpression.ts", import.meta.url), "utf8");
  assert.equal(source.includes("eval("), false);
  assert.equal(source.includes("new Function"), false);
});
