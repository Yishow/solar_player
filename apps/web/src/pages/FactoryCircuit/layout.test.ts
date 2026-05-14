import assert from "node:assert/strict";
import test from "node:test";
import {
  factoryCircuitConnectorLayout,
  factoryCircuitKpiLayout,
  factoryCircuitLayoutMeta,
  factoryCircuitLoadRowLayout,
  factoryCircuitNodeLayout,
  factoryCircuitTitleLayout
} from "./layout";

test("factory circuit layout centralizes the reference geometry for the playback body", () => {
  assert.deepEqual(factoryCircuitTitleLayout, {
    left: 78,
    top: 190,
    width: 590
  });
  assert.deepEqual(factoryCircuitNodeLayout.board, {
    height: 300,
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
  assert.deepEqual(factoryCircuitKpiLayout.routing, {
    height: 196,
    left: 1556,
    top: 760,
    width: 308
  });
  assert.equal(factoryCircuitLayoutMeta.pageNumber, "03");
});
