import assert from "node:assert/strict";
import test from "node:test";
import {
  factoryCircuitConnectorLayout,
  factoryCircuitContentTopOffset,
  factoryCircuitKpiLayout,
  factoryCircuitLayoutMeta,
  factoryCircuitLoadRowLayout,
  factoryCircuitNodeLayout,
  factoryCircuitTitleLayout
} from "./layout";

test("factory circuit layout centralizes the reference geometry for the playback body", () => {
  assert.equal(factoryCircuitContentTopOffset, 110);
  assert.deepEqual(factoryCircuitTitleLayout, {
    left: 88,
    top: 166,
    width: 590
  });
  assert.deepEqual(factoryCircuitNodeLayout.board, {
    height: 336,
    left: 1076,
    top: 286,
    width: 182
  });
  assert.deepEqual(factoryCircuitConnectorLayout.inverterToBoard, {
    left: 1000,
    top: 440,
    width: 74
  });
  assert.deepEqual(factoryCircuitLoadRowLayout[0], {
    height: 84,
    left: 1392,
    top: 146,
    width: 470
  });
  assert.deepEqual(factoryCircuitKpiLayout.totalPower, {
    height: 220,
    left: 32,
    top: 760,
    width: 360
  });
  assert.deepEqual(factoryCircuitKpiLayout.flow, {
    height: 220,
    left: 1516,
    top: 760,
    width: 370
  });
  assert.equal(factoryCircuitLayoutMeta.pageNumber, "03");
});
