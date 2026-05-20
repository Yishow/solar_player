import assert from "node:assert/strict";
import test from "node:test";
import { resolveSocketOrigin } from "./socket";

test("resolveSocketOrigin maps loopback Vite dev ports back to the backend port", () => {
  assert.equal(
    resolveSocketOrigin({
      hostname: "localhost",
      port: "5173",
      protocol: "http:"
    }),
    "http://localhost:3000"
  );
});

test("resolveSocketOrigin keeps non-loopback Vite dev hosts on the current origin so socket proxying stays same-origin", () => {
  assert.equal(
    resolveSocketOrigin({
      hostname: "100.76.76.75",
      port: "5173",
      protocol: "http:"
    }),
    "http://100.76.76.75:5173"
  );
});
