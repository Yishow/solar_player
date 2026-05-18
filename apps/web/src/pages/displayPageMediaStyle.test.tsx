import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildDisplayPageMediaStyle } from "./displayPageMediaStyle";

const overviewSource = readFileSync(path.join(import.meta.dirname, "Overview", "index.tsx"), "utf8");
const imagesSource = readFileSync(path.join(import.meta.dirname, "Images", "index.tsx"), "utf8");

test("display page media style uses align anchors for contain mode", () => {
  const style = buildDisplayPageMediaStyle({
    alignX: 0.2,
    alignY: 0.75,
    fitMode: "contain",
    src: "/overview-placement.png"
  });

  assert.deepEqual(style, {
    objectFit: "contain",
    objectPosition: "20% 75%"
  });
});

test("display page media style uses focus anchors for cover mode", () => {
  const style = buildDisplayPageMediaStyle({
    fitMode: "cover",
    focusX: 0.3,
    focusY: 0.6,
    src: "/images-placement.png"
  });

  assert.deepEqual(style, {
    objectFit: "cover",
    objectPosition: "30% 60%"
  });
});

test("overview and images runtime wire placement styling into hero and main stage media", () => {
  assert.match(overviewSource, /buildDisplayPageMediaStyle\(resolvedConfig\.heroMedia\)/);
  assert.match(imagesSource, /buildDisplayPageMediaStyle\(resolvedConfig\.mainStage\)/);
});
