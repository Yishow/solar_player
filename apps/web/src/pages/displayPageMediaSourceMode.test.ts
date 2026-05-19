import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeDisplayPageMediaBindingBySourceMode,
  resolveDisplayPageMediaSource,
  resolveDisplayPageMediaSourceMode
} from "@solar-display/shared";

test("display page media bindings infer explicit source modes from legacy persisted payloads", () => {
  assert.equal(resolveDisplayPageMediaSourceMode({ assetId: 42 }), "managed-asset");
  assert.equal(resolveDisplayPageMediaSourceMode({ src: "/uploads/images/hero.png" }), "direct-src");
  assert.equal(resolveDisplayPageMediaSourceMode({ alt: "seed fallback only" }), "seed-default");
});

test("display page media bindings keep only the payload owned by their explicit source mode", () => {
  assert.deepEqual(
    normalizeDisplayPageMediaBindingBySourceMode({
      alt: "Overview hero",
      assetId: 42,
      sourceMode: "managed-asset",
      src: "/should-not-persist.png"
    }),
    {
      alt: "Overview hero",
      assetId: 42,
      sourceMode: "managed-asset"
    }
  );

  assert.deepEqual(
    normalizeDisplayPageMediaBindingBySourceMode({
      alt: "Solar hero",
      assetId: 7,
      sourceMode: "direct-src",
      src: "/uploads/images/solar-hero.png"
    }),
    {
      alt: "Solar hero",
      sourceMode: "direct-src",
      src: "/uploads/images/solar-hero.png"
    }
  );

  assert.deepEqual(
    normalizeDisplayPageMediaBindingBySourceMode({
      alt: "Sustainability hero",
      assetId: 9,
      sourceMode: "seed-default",
      src: "/brand-logo.png"
    }),
    {
      alt: "Sustainability hero",
      sourceMode: "seed-default"
    }
  );
});

test("display page media bindings resolve render sources without changing their placement contract", () => {
  assert.equal(
    resolveDisplayPageMediaSource({
      fitMode: "contain",
      sourceMode: "direct-src",
      src: "/uploads/images/overview-direct.png"
    }),
    "/uploads/images/overview-direct.png"
  );

  assert.equal(
    resolveDisplayPageMediaSource({
      fitMode: "cover",
      sourceMode: "seed-default",
      src: "/brand-logo.png"
    }),
    "/brand-logo.png"
  );

  assert.equal(
    resolveDisplayPageMediaSource({
      assetId: 42,
      fitMode: "cover",
      sourceMode: "managed-asset"
    }),
    null
  );
});
