import assert from "node:assert/strict";
import test from "node:test";
import type { ScopedLiveMetricsSnapshot, SocketConnectionState } from "../services/socket";
import {
  createLiveMetricsSelectorSubscription,
  createLiveMetricsStore
} from "./liveMetricsStore";
import {
  isLiveMetricsSelectionEqual,
  selectLiveMetricsSelection
} from "./useLiveMetrics";

const baseConnectionState: SocketConnectionState = {
  lastError: null,
  lastHeartbeatAt: "2026-07-05T10:00:00.000Z",
  status: "connected",
  transport: "websocket"
};

function createSnapshot(
  values: Record<string, number>,
  timestamp = "2026-07-05T10:00:00.000Z",
  metricScope: "cl" | "kn" | "global" = "cl"
): ScopedLiveMetricsSnapshot {
  return {
    metricScope,
    metrics: Object.fromEntries(
      Object.entries(values).map(([metricKey, value]) => [
        metricKey,
        {
          quality: null,
          timestamp,
          unit: "kW",
          value
        }
      ])
    ),
    timestamp
  };
}

test("scoped snapshots merge explicit global metrics and replace stale other-site state", () => {
  const store = createLiveMetricsStore();
  store.setSnapshot(createSnapshot({ globalWeather: 30 }, "2026-07-05T10:00:00.000Z", "global"));
  store.setSnapshot(createSnapshot({ realTimePower: 11 }, "2026-07-05T10:00:01.000Z", "cl"));
  assert.deepEqual(
    Object.fromEntries(Object.entries(store.getState().snapshot.metrics).map(([key, reading]) => [key, reading.value])),
    { globalWeather: 30, realTimePower: 11 }
  );

  store.setSnapshot(createSnapshot({ realTimePower: 22 }, "2026-07-05T10:00:02.000Z", "kn"));
  assert.deepEqual(
    Object.fromEntries(Object.entries(store.getState().snapshot.metrics).map(([key, reading]) => [key, reading.value])),
    { globalWeather: 30, realTimePower: 22 }
  );
});

test("selector subscription updates when the selected metric value changes", () => {
  const store = createLiveMetricsStore({
    connectionState: baseConnectionState,
    snapshot: createSnapshot({
      todayGeneration: 812.4
    })
  });
  const updates: Array<number | null> = [];
  const subscription = createLiveMetricsSelectorSubscription(
    store,
    (state) => state.snapshot.metrics.todayGeneration?.value ?? null
  );
  const unsubscribe = subscription.subscribe(() => {
    updates.push(subscription.getSnapshot());
  });

  store.setSnapshot(
    createSnapshot(
      {
        todayGeneration: 813.0
      },
      "2026-07-05T10:00:05.000Z"
    )
  );

  assert.deepEqual(updates, [813.0]);
  unsubscribe();
});

test("selector subscription stays stable when only unrelated metrics change", () => {
  const store = createLiveMetricsStore({
    connectionState: baseConnectionState,
    snapshot: createSnapshot({
      phaseRPower: 50.2,
      todayGeneration: 812.4
    })
  });
  const subscription = createLiveMetricsSelectorSubscription(
    store,
    (state) => state.snapshot.metrics.todayGeneration?.value ?? null
  );
  let updateCount = 0;
  const unsubscribe = subscription.subscribe(() => {
    updateCount += 1;
  });

  store.setSnapshot(
    createSnapshot(
      {
        phaseRPower: 51.7,
        todayGeneration: 812.4
      },
      "2026-07-05T10:00:05.000Z"
    )
  );

  assert.equal(subscription.getSnapshot(), 812.4);
  assert.equal(updateCount, 0);
  unsubscribe();
});

test("connection-only selector updates do not force unchanged metric selectors to refresh", () => {
  const store = createLiveMetricsStore({
    connectionState: baseConnectionState,
    snapshot: createSnapshot({
      todayGeneration: 812.4
    })
  });
  const metricSubscription = createLiveMetricsSelectorSubscription(
    store,
    (state) => state.snapshot.metrics.todayGeneration?.value ?? null
  );
  const connectionSubscription = createLiveMetricsSelectorSubscription(
    store,
    (state) => state.connectionState.status
  );
  let metricUpdateCount = 0;
  const connectionUpdates: string[] = [];
  const unsubscribeMetric = metricSubscription.subscribe(() => {
    metricUpdateCount += 1;
  });
  const unsubscribeConnection = connectionSubscription.subscribe(() => {
    connectionUpdates.push(connectionSubscription.getSnapshot());
  });

  store.setConnectionState({
    ...baseConnectionState,
    lastError: "transport close",
    status: "disconnected"
  });

  assert.equal(metricUpdateCount, 0);
  assert.deepEqual(connectionUpdates, ["disconnected"]);
  unsubscribeMetric();
  unsubscribeConnection();
});

test("legacy live metrics selection keeps snapshot and derived connection fields compatible", () => {
  const initialSnapshot = createSnapshot(
    {
      todayGeneration: 812.4
    },
    "2026-07-05T10:00:00.000Z"
  );
  const store = createLiveMetricsStore({
    connectionState: baseConnectionState,
    snapshot: initialSnapshot
  });
  const subscription = createLiveMetricsSelectorSubscription(
    store,
    selectLiveMetricsSelection,
    isLiveMetricsSelectionEqual
  );

  const initialSelection = subscription.getSnapshot();

  assert.equal(initialSelection.snapshot, initialSnapshot);
  assert.equal(initialSelection.connectionState, "connected");
  assert.equal(initialSelection.isSocketConnected, true);
  assert.equal(initialSelection.lastUpdatedAt, "2026-07-05T10:00:00.000Z");

  store.setConnectionState({
    ...baseConnectionState,
    lastError: "transport close",
    status: "disconnected"
  });

  const degradedSelection = subscription.getSnapshot();

  assert.equal(degradedSelection.snapshot, initialSnapshot);
  assert.equal(degradedSelection.connectionState, "disconnected");
  assert.equal(degradedSelection.isSocketConnected, false);
  assert.equal(degradedSelection.lastUpdatedAt, "2026-07-05T10:00:00.000Z");

  store.setSnapshot(
    createSnapshot(
      {
        todayGeneration: 813.0
      },
      "2026-07-05T10:00:05.000Z"
    )
  );

  const refreshedSelection = subscription.getSnapshot();

  assert.equal(refreshedSelection.connectionState, "disconnected");
  assert.equal(refreshedSelection.isSocketConnected, false);
  assert.equal(refreshedSelection.lastUpdatedAt, "2026-07-05T10:00:05.000Z");
  assert.equal(refreshedSelection.snapshot.metrics.todayGeneration?.value, 813.0);
});

test("disabled selector subscription freezes updates until re-enabled", () => {
  const store = createLiveMetricsStore({
    connectionState: baseConnectionState,
    snapshot: createSnapshot({
      todayGeneration: 812.4
    })
  });
  const subscription = createLiveMetricsSelectorSubscription(
    store,
    (state) => state.snapshot.metrics.todayGeneration?.value ?? null
  );
  let updateCount = 0;
  const unsubscribe = subscription.subscribe(() => {
    updateCount += 1;
  });

  subscription.setEnabled(false);
  store.setSnapshot(
    createSnapshot(
      {
        todayGeneration: 813.0
      },
      "2026-07-05T10:00:05.000Z"
    )
  );

  assert.equal(updateCount, 0);
  assert.equal(subscription.getSnapshot(), 812.4);

  subscription.setEnabled(true);

  assert.equal(subscription.getSnapshot(), 813.0);
  unsubscribe();
});

function createForeignSnapshot(
  values: Record<string, number>,
  timestamp: string,
  metricScope: "cl" | "kn"
): ScopedLiveMetricsSnapshot {
  return { ...createSnapshot(values, timestamp, metricScope), foreignSite: true };
}

function readValues(store: ReturnType<typeof createLiveMetricsStore>) {
  return Object.fromEntries(
    Object.entries(store.getState().snapshot.metrics).map(([key, reading]) => [key, reading.value])
  );
}

test("cross-site snapshot keeps the session's own-site readings", () => {
  const store = createLiveMetricsStore();
  store.setSnapshot(createSnapshot({ todayGeneration: 5, totalPower: 77 }, "2026-07-05T10:00:00.000Z", "kn"));
  store.setSnapshot(createSnapshot({ monthGeneration: 120 }, "2026-07-05T10:00:00.000Z", "global"));
  store.setSnapshot(createForeignSnapshot({ realTimePower: 42 }, "2026-07-05T10:00:00.000Z", "cl"));

  assert.deepEqual(readValues(store), {
    monthGeneration: 120,
    realTimePower: 42,
    todayGeneration: 5,
    totalPower: 77
  });

  store.setSnapshot(createForeignSnapshot({ realTimePower: 43 }, "2026-07-05T10:00:03.000Z", "cl"));
  assert.deepEqual(readValues(store), {
    monthGeneration: 120,
    realTimePower: 43,
    todayGeneration: 5,
    totalPower: 77
  });
});

test("own-site reading wins a metric key collision with a cross-site reading", () => {
  const store = createLiveMetricsStore();
  store.setSnapshot(createForeignSnapshot({ totalPower: 11 }, "2026-07-05T10:00:00.000Z", "cl"));
  store.setSnapshot(createSnapshot({ totalPower: 77 }, "2026-07-05T10:00:01.000Z", "kn"));
  assert.deepEqual(readValues(store), { totalPower: 77 });

  store.setSnapshot(createForeignSnapshot({ totalPower: 12 }, "2026-07-05T10:00:02.000Z", "cl"));
  assert.deepEqual(readValues(store), { totalPower: 77 });
});

test("empty cross-site snapshot clears only the cross-site readings", () => {
  const store = createLiveMetricsStore();
  store.setSnapshot(createSnapshot({ totalPower: 77 }, "2026-07-05T10:00:00.000Z", "kn"));
  store.setSnapshot(createSnapshot({ monthGeneration: 120 }, "2026-07-05T10:00:00.000Z", "global"));
  store.setSnapshot(createForeignSnapshot({ realTimePower: 42 }, "2026-07-05T10:00:00.000Z", "cl"));
  store.setSnapshot(createForeignSnapshot({}, "2026-07-05T10:00:04.000Z", "cl"));

  assert.deepEqual(readValues(store), { monthGeneration: 120, totalPower: 77 });
});

test("cross-site snapshot does not move the session-level timestamp", () => {
  const store = createLiveMetricsStore();
  store.setSnapshot(createSnapshot({ totalPower: 77 }, "2026-07-05T10:00:00.000Z", "kn"));
  store.setSnapshot(createSnapshot({ monthGeneration: 120 }, "2026-07-05T10:00:01.000Z", "global"));
  assert.equal(store.getState().snapshot.timestamp, "2026-07-05T10:00:01.000Z");

  store.setSnapshot(createForeignSnapshot({ realTimePower: 42 }, "2026-07-05T10:09:00.000Z", "cl"));
  assert.equal(store.getState().snapshot.timestamp, "2026-07-05T10:00:01.000Z");
});

test("reconnecting drops cross-site readings that are no longer being delivered", () => {
  const store = createLiveMetricsStore();
  store.setConnectionState({ ...baseConnectionState, status: "connected" });
  store.setSnapshot(createSnapshot({ totalPower: 77 }, "2026-07-05T10:00:00.000Z", "kn"));
  store.setSnapshot(createForeignSnapshot({ realTimePower: 42 }, "2026-07-05T10:00:00.000Z", "cl"));
  assert.deepEqual(readValues(store), { realTimePower: 42, totalPower: 77 });

  // Cross-site readings are only ever delivered by explicit authorization and
  // never age out on their own, so a session that dropped must not keep showing
  // them: the reconnect bootstrap re-delivers whatever is still authorized.
  store.setConnectionState({ ...baseConnectionState, status: "connecting" });
  store.setConnectionState({ ...baseConnectionState, status: "connected" });
  assert.deepEqual(readValues(store), { totalPower: 77 });

  store.setSnapshot(createForeignSnapshot({ realTimePower: 43 }, "2026-07-05T10:05:00.000Z", "cl"));
  assert.deepEqual(readValues(store), { realTimePower: 43, totalPower: 77 });
});
