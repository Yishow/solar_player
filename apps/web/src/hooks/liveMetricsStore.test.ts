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
