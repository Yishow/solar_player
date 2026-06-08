import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDisplayCardStyleFields,
  buildDisplayCardStyleVars,
  createDisplayCardStyleConfig,
  displayCardValueRowAlignOptions
} from "./displayCardStyleConfig";

test("createDisplayCardStyleConfig seeds trendHeight to the current 56px sparkline height", () => {
  assert.equal(createDisplayCardStyleConfig().trendHeight, 56);
});

test("createDisplayCardStyleConfig accepts a custom trendHeight and falls back on invalid values", () => {
  assert.equal(createDisplayCardStyleConfig({ trendHeight: 80 }).trendHeight, 80);
  assert.equal(createDisplayCardStyleConfig({ trendHeight: -5 }).trendHeight, 56);
  assert.equal(createDisplayCardStyleConfig({ trendHeight: "tall" }).trendHeight, 56);
});

test("createDisplayCardStyleConfig accepts end as a value-row alignment", () => {
  assert.equal(createDisplayCardStyleConfig({ valueRowAlign: "end" }).valueRowAlign, "end");
  assert.equal(createDisplayCardStyleConfig({ valueRowAlign: "nonsense" }).valueRowAlign, "start");
});

test("buildDisplayCardStyleVars exposes the trend height custom property", () => {
  const vars = buildDisplayCardStyleVars(createDisplayCardStyleConfig({ trendHeight: 72 }));
  assert.equal((vars as Record<string, string>)["--display-card-trend-height"], "72px");
});

test("displayCardValueRowAlignOptions include end and buildDisplayCardStyleFields exposes trend height", () => {
  assert.ok(
    displayCardValueRowAlignOptions.some((option) => option.value === "end"),
    "expected an end alignment option"
  );

  const fields = buildDisplayCardStyleFields({ idPrefix: "overview-power", path: ["cardStyles", "power"] });
  const trendField = fields.find((field) => field.path.join(".") === "cardStyles.power.trendHeight");
  assert.ok(trendField, "expected a trendHeight inspector field");
  assert.equal(trendField.fieldType, "number");
});
