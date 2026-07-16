import assert from "node:assert/strict";
import test from "node:test";
import {
  factoryCircuitConnectorLayout,
  factoryCircuitContentTopOffset,
  factoryCircuitKpiLayout,
  factoryCircuitLayoutMeta,
  factoryCircuitJungliLoadRows,
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
  assert.deepEqual(factoryCircuitJungliLoadRows[0], {
    height: 84,
    left: 1392,
    top: 160,
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

test("factory circuit centers the six Jungli MQTT projects on the switchboard line without overlap", () => {
  const jungliProjectRows = factoryCircuitJungliLoadRows.slice(0, 6);
  const rowTops = jungliProjectRows.map((row) => row.top);
  const connectorEndpoints = jungliProjectRows.map((row) => row.top - 150 + row.height / 2);

  assert.deepEqual(rowTops, [160, 255, 350, 445, 540, 635]);
  assert.deepEqual(jungliProjectRows.map((row) => row.height), [84, 84, 84, 84, 84, 84]);
  assert.deepEqual(connectorEndpoints, [52, 147, 242, 337, 432, 527]);

  jungliProjectRows.forEach((row, index) => {
    const nextRow = jungliProjectRows[index + 1];
    if (nextRow) {
      assert.equal(nextRow.top - row.top, 95);
      assert.ok(row.top + row.height < nextRow.top, `Jungli project rows ${index + 1} and ${index + 2} overlap`);
    }
  });

  const firstRow = jungliProjectRows[0]!;
  const lastRow = jungliProjectRows.at(-1)!;
  const projectGroupCenter = (firstRow.top + lastRow.top + lastRow.height) / 2;

  assert.ok(Math.abs(projectGroupCenter - 440) <= 1, `Jungli project group center is ${projectGroupCenter}, expected 440`);
});
