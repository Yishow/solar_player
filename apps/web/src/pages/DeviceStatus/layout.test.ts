import assert from "node:assert/strict";
import test from "node:test";
import { deviceLayout } from "./layout";

test("device status layout centralizes title, info, resource, network, and action geometry", () => {
  assert.deepEqual(deviceLayout.title, { left: 58, top: 12 });
  assert.deepEqual(deviceLayout.side, { left: 50, top: 64, width: 390 });
  assert.deepEqual(deviceLayout.info, {
    height: 510,
    left: 460,
    top: 64,
    width: 710
  });
  assert.deepEqual(deviceLayout.photo, {
    height: 240,
    left: 1190,
    top: 64,
    width: 680
  });
  assert.deepEqual(deviceLayout.resource, {
    height: 268,
    left: 1190,
    top: 320,
    width: 680
  });
  assert.deepEqual(deviceLayout.network, {
    height: 62,
    left: 1190,
    top: 604,
    width: 680
  });
  assert.deepEqual(deviceLayout.actions, {
    height: 56,
    left: 50,
    top: 686,
    width: 1820
  });
  assert.deepEqual(deviceLayout.feedback, {
    height: 48,
    left: 50,
    top: 758,
    width: 1820
  });
});

test("device status regions never overlap on the y axis where columns share x", () => {
  // right column (left=1190): photo → resource → network must be strictly stacked
  const photoBottom = deviceLayout.photo.top + deviceLayout.photo.height;
  const resourceBottom = deviceLayout.resource.top + deviceLayout.resource.height;
  const networkBottom = deviceLayout.network.top + deviceLayout.network.height;

  assert.ok(deviceLayout.resource.top > photoBottom, "resource must start below photo");
  assert.ok(
    deviceLayout.network.top > resourceBottom,
    "network must start below resource"
  );

  // bottom strip across full width
  assert.ok(deviceLayout.actions.top > networkBottom, "actions must start below network");
  const actionsBottom = deviceLayout.actions.top + deviceLayout.actions.height;
  assert.ok(
    deviceLayout.feedback.top > actionsBottom,
    "feedback must start below actions"
  );

  // total fits within 838
  const feedbackBottom = deviceLayout.feedback.top + deviceLayout.feedback.height;
  assert.ok(feedbackBottom <= 838, "all regions fit within content height 838");
});
