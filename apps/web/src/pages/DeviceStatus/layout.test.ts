import assert from "node:assert/strict";
import test from "node:test";
import { deviceLayout } from "./layout";

test("device status layout centralizes title, actions, kpiBar, leftPanel, and rightPanel geometry", () => {
  assert.deepEqual(deviceLayout.title, { left: 58, top: 28 });
  assert.deepEqual(deviceLayout.actions, {
    height: 48,
    left: 1190,
    top: 32,
    width: 680
  });
  assert.deepEqual(deviceLayout.kpiBar, {
    height: 116,
    left: 50,
    top: 118,
    width: 1820
  });
  assert.deepEqual(deviceLayout.leftPanel, {
    height: 612,
    left: 50,
    top: 246,
    width: 896
  });
  assert.deepEqual(deviceLayout.rightPanel, {
    height: 612,
    left: 962,
    top: 246,
    width: 908
  });
});

test("device status regions never overlap on the y axis and fit within FHD content area", () => {
  const kpiBottom = deviceLayout.kpiBar.top + deviceLayout.kpiBar.height;
  assert.ok(deviceLayout.leftPanel.top >= kpiBottom, "leftPanel must start below kpiBar");
  assert.ok(deviceLayout.rightPanel.top >= kpiBottom, "rightPanel must start below kpiBar");

  const leftBottom = deviceLayout.leftPanel.top + deviceLayout.leftPanel.height;
  const rightBottom = deviceLayout.rightPanel.top + deviceLayout.rightPanel.height;

  assert.ok(leftBottom <= 858, "leftPanel fits within content height 858");
  assert.ok(rightBottom <= 858, "rightPanel fits within content height 858");
  assert.equal(leftBottom, 858);
  assert.equal(rightBottom, 858);
});
