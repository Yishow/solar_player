import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFlowConnectorTreatmentFields,
  buildFlowNodeTreatmentFields,
  buildFlowConnectorTreatmentStyle,
  buildFlowNodeTreatmentStyle,
  createFlowConnectorTreatmentConfig,
  createFlowNodeTreatmentConfig,
  resolveFlowConnectorTreatmentConfig,
  resolveFlowNodeTreatmentConfig
} from "./displayPageFlowTreatmentConfig";

test("flow treatment helpers create bounded seed-backed connector tokens and fields", () => {
  const treatment = createFlowConnectorTreatmentConfig({
    lineCap: "square",
    opacity: 0.62,
    radius: 8,
    strokeWidth: 12,
    zIndex: 14
  });

  assert.deepEqual(treatment, {
    lineCap: "square",
    opacity: 0.62,
    radius: 8,
    strokeColor: "#4ade80",
    strokeWidth: 12,
    zIndex: 14
  });
  assert.deepEqual(
    createFlowConnectorTreatmentConfig({
      lineCap: "dashed",
      opacity: 2,
      radius: -1,
      strokeWidth: 0,
      zIndex: Number.NaN
    }),
    createFlowConnectorTreatmentConfig()
  );
  assert.deepEqual(
    buildFlowConnectorTreatmentFields({
      idPrefix: "solar-solarToInverter",
      path: ["connectorTreatments", "solarToInverter"]
    }).map((field) => field.id),
    [
      "solar-solarToInverter-connector-stroke-width",
      "solar-solarToInverter-connector-stroke-color",
      "solar-solarToInverter-connector-opacity",
      "solar-solarToInverter-connector-line-cap",
      "solar-solarToInverter-connector-radius",
      "solar-solarToInverter-connector-layer"
    ]
  );
  assert.deepEqual(buildFlowConnectorTreatmentStyle(treatment), {
    borderRadius: "8px",
    opacity: 0.62,
    zIndex: 14,
    "--display-flow-connector-line-cap": "square",
    "--display-flow-connector-stroke-color": "#4ade80",
    "--display-flow-connector-stroke-width": "12px"
  });
  assert.deepEqual(
    resolveFlowConnectorTreatmentConfig(
      { lineCap: "dashed", opacity: -1, radius: Number.NaN, strokeWidth: 0, zIndex: 99 },
      createFlowConnectorTreatmentConfig({ lineCap: "butt", opacity: 0.7, radius: 4, strokeWidth: 16, zIndex: 9 })
    ),
    {
      lineCap: "butt",
      opacity: 0.7,
      radius: 4,
      strokeColor: "#4ade80",
      strokeWidth: 16,
      zIndex: 9
    }
  );
});

test("flow treatment helpers create bounded node tokens and CSS variables", () => {
  const treatment = createFlowNodeTreatmentConfig({
    iconLabelGap: 18,
    iconScale: 1.2,
    valueAlign: "right"
  });

  assert.deepEqual(treatment, {
    iconLabelGap: 18,
    iconScale: 1.2,
    valueAlign: "right"
  });
  assert.deepEqual(
    createFlowNodeTreatmentConfig({
      iconLabelGap: -200,
      iconScale: 4,
      valueAlign: "justify"
    }),
    createFlowNodeTreatmentConfig()
  );
  assert.deepEqual(
    buildFlowNodeTreatmentFields({
      idPrefix: "factory-inverter",
      path: ["nodeTreatments", "inverter"]
    }).map((field) => field.id),
    [
      "factory-inverter-node-icon-scale",
      "factory-inverter-node-icon-label-gap",
      "factory-inverter-node-value-align"
    ]
  );
  assert.deepEqual(buildFlowNodeTreatmentStyle(treatment), {
    textAlign: "right",
    "--display-flow-node-icon-label-gap": "18px",
    "--display-flow-node-icon-scale": "1.2",
    "--display-flow-node-value-align": "right"
  });
  assert.deepEqual(
    resolveFlowNodeTreatmentConfig(
      { iconLabelGap: -200, iconScale: 4, valueAlign: "justify" },
      createFlowNodeTreatmentConfig({ iconLabelGap: 12, iconScale: 1.3, valueAlign: "left" })
    ),
    {
      iconLabelGap: 12,
      iconScale: 1.3,
      valueAlign: "left"
    }
  );
});
