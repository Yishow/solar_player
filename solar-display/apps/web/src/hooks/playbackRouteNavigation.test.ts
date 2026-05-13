import assert from "node:assert/strict";
import test from "node:test";
import { resolvePlaybackRouteNavigation } from "./playbackRouteNavigation";

test("does not navigate back to stale controller route during manual route changes", () => {
  assert.equal(
    resolvePlaybackRouteNavigation({
      controllerRoute: "/factory-circuit",
      currentPath: "/solar",
      previousControllerRoute: "/factory-circuit",
      routeRotationEnabled: true
    }),
    null
  );
});

test("navigates when autoplay advances controller route to a new page", () => {
  assert.equal(
    resolvePlaybackRouteNavigation({
      controllerRoute: "/solar",
      currentPath: "/factory-circuit",
      previousControllerRoute: "/factory-circuit",
      routeRotationEnabled: true
    }),
    "/solar"
  );
});
