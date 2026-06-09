import assert from "node:assert/strict";
import test from "node:test";
import { REACT_GRAB_BOOTSTRAP_ALIAS, resolveReactGrabBootstrapTarget } from "./reactGrabBootstrapTarget";

test("react grab alias keeps the real bootstrap module in development", () => {
  assert.equal(REACT_GRAB_BOOTSTRAP_ALIAS, "@devtools/react-grab-bootstrap");
  assert.match(resolveReactGrabBootstrapTarget("development"), /reactGrabBootstrap\.ts$/);
});

test("react grab alias swaps to the noop bootstrap outside development", () => {
  assert.match(resolveReactGrabBootstrapTarget("production"), /reactGrabNoop\.ts$/);
  assert.match(resolveReactGrabBootstrapTarget("test"), /reactGrabNoop\.ts$/);
});
