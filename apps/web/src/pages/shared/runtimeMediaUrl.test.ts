import assert from "node:assert/strict";
import test from "node:test";
import { resolveRuntimeMediaUrl } from "./runtimeMediaUrl";
import { buildRuntimeUploadedMediaUrl } from "../../services/runtimeOrigin";

test("resolveRuntimeMediaUrl keeps uploaded media same-origin in dev", () => {
  const originalWindow = globalThis.window;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: {
        hostname: "100.76.76.75",
        port: "4173",
        protocol: "http:"
      }
    }
  });

  try {
    assert.equal(
      resolveRuntimeMediaUrl("/uploads/images/display-seed-images-main-stage.jpg"),
      "http://100.76.76.75:4173/uploads/images/display-seed-images-main-stage.jpg"
    );
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow
    });
  }
});

test("resolveRuntimeMediaUrl keeps external and bundled media URLs unchanged", () => {
  assert.equal(resolveRuntimeMediaUrl("https://cdn.example.com/image.jpg"), "https://cdn.example.com/image.jpg");
  assert.equal(resolveRuntimeMediaUrl("/assets/image.abc123.png"), "/assets/image.abc123.png");
  assert.equal(resolveRuntimeMediaUrl(null), undefined);
});

test("buildRuntimeUploadedMediaUrl uses the explicit API origin override", () => {
  assert.equal(
    buildRuntimeUploadedMediaUrl("/uploads/images/display-seed-images-main-stage.jpg", {
      apiBaseUrl: "https://display-api.example.test"
    }),
    "https://display-api.example.test/uploads/images/display-seed-images-main-stage.jpg"
  );
});
