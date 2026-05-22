import assert from "node:assert/strict";
import test from "node:test";
import { computeCanvasLayout } from "./displayCanvasLayout";

test("computeCanvasLayout preserves aspect ratio and centers the design surface", () => {
  const design = {
    height: 1080,
    width: 1920
  };

  const examples = [
    {
      expected: { offsetX: 0, offsetY: 0, scale: 1 },
      viewport: { height: 1080, width: 1920 }
    },
    {
      expected: { offsetX: 0, offsetY: 0, scale: 0.6667 },
      viewport: { height: 720, width: 1280 }
    },
    {
      expected: { offsetX: 0, offsetY: 60, scale: 1 },
      viewport: { height: 1200, width: 1920 }
    },
    {
      expected: { offsetX: 0, offsetY: 656, scale: 0.5625 },
      viewport: { height: 1920, width: 1080 }
    }
  ];

  for (const example of examples) {
    const result = computeCanvasLayout(example.viewport, design);
    assert.ok(Math.abs(result.scale - example.expected.scale) < 0.0001);
    assert.ok(Math.abs(result.offsetX - example.expected.offsetX) < 0.5);
    assert.ok(Math.abs(result.offsetY - example.expected.offsetY) < 0.5);
  }
});
