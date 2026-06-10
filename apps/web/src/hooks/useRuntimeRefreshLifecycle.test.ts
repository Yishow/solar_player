import assert from "node:assert/strict";
import test from "node:test";
import {
  createRuntimeRefreshState,
  markRuntimeRefreshLoading,
  resolveRuntimeRefreshFailure,
  resolveRuntimeRefreshSuccess,
  shouldApplyRuntimeRefreshResult
} from "./useRuntimeRefreshLifecycle";

test("shared runtime lifecycle marks bootstrap loads consistently before first payload resolves", () => {
  const nextState = markRuntimeRefreshLoading(createRuntimeRefreshState<unknown>());

  assert.equal(nextState.isLoading, true);
  assert.equal(nextState.isRefreshing, false);
  assert.equal(nextState.usesFallback, false);
  assert.equal(nextState.payload, null);
});

test("shared runtime lifecycle preserves the last payload and marks fallback on refresh failure", () => {
  const resolvedState = resolveRuntimeRefreshSuccess(
    markRuntimeRefreshLoading(createRuntimeRefreshState({ greeting: "hello" })),
    { greeting: "hello" },
    "2026-05-20T00:00:00.000Z"
  );
  const failedState = resolveRuntimeRefreshFailure(
    markRuntimeRefreshLoading(resolvedState, { refreshing: true }),
    "runtime source failed"
  );

  assert.deepEqual(failedState.payload, { greeting: "hello" });
  assert.equal(failedState.isLoading, false);
  assert.equal(failedState.isRefreshing, false);
  assert.equal(failedState.usesFallback, true);
  assert.equal(failedState.errorMessage, "runtime source failed");
});

test("shared runtime lifecycle starts from an initial payload without blocking first render", () => {
  const initialState = createRuntimeRefreshState({ greeting: "cached" });
  const loadingState = markRuntimeRefreshLoading(initialState);

  assert.deepEqual(initialState.payload, { greeting: "cached" });
  assert.equal(initialState.isLoading, false);
  assert.equal(loadingState.isLoading, false);
  assert.equal(loadingState.isRefreshing, true);
  assert.deepEqual(loadingState.payload, { greeting: "cached" });
});

test("shared runtime lifecycle ignores stale request results", () => {
  assert.equal(shouldApplyRuntimeRefreshResult(2, 2), true);
  assert.equal(shouldApplyRuntimeRefreshResult(3, 2), false);
});
