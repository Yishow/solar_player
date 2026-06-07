import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PhasePowerTableWidget } from "./PhasePowerTableWidget";

const fullPhases = {
  available: true,
  phases: [
    { available: true, current: "12.3", id: "R" as const, power: "2.70", voltage: "220.5" },
    { available: true, current: "11.9", id: "S" as const, power: "2.60", voltage: "219.8" },
    { available: true, current: "12.1", id: "T" as const, power: "2.65", voltage: "221.1" }
  ]
};

test("PhasePowerTableWidget renders R/S/T rows with V/A/kW values", () => {
  const markup = renderToStaticMarkup(<PhasePowerTableWidget phasePower={fullPhases} />);

  assert.match(markup, /三相電力/);
  assert.match(markup, /220\.5/);
  assert.match(markup, /12\.3/);
  assert.match(markup, /2\.70/);
  assert.match(markup, />R</);
  assert.match(markup, />S</);
  assert.match(markup, />T</);
});

test("PhasePowerTableWidget shows placeholder for missing readings without NaN", () => {
  const markup = renderToStaticMarkup(
    <PhasePowerTableWidget
      phasePower={{
        available: false,
        phases: [
          { available: false, current: "--", id: "R", power: "--", voltage: "--" },
          { available: false, current: "--", id: "S", power: "--", voltage: "--" },
          { available: false, current: "--", id: "T", power: "--", voltage: "--" }
        ]
      }}
    />
  );

  assert.match(markup, /三相電力/);
  assert.doesNotMatch(markup, /NaN/);
  assert.doesNotMatch(markup, /undefined/);
  assert.match(markup, /--/);
});
