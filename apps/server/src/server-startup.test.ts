import assert from "node:assert/strict";
import test from "node:test";

import { config } from "./config.js";
import { startServer } from "./server-startup.js";

function acquireNoopServerRuntimeGuard() {
  return () => undefined;
}

test("startServer starts listening before awaiting MQTT initial connection", async () => {
  const connectResolvers: Array<() => void> = [];
  let listenCalled = false;
  const callOrder: string[] = [];
  const app = {
    addHook: () => undefined,
    close: async () => {
      callOrder.push("close");
    },
    listen: async () => {
      listenCalled = true;
      callOrder.push("listen");
    },
    log: {
      error: () => undefined,
      warn: () => undefined
    },
    mqttClientService: {
      connect: async () =>
        await new Promise<void>((resolve) => {
          connectResolvers[0] = () => {
            callOrder.push("connect-resolved");
            resolve();
          };
        })
    },
    socketService: {
      emitDisplaySync: () => undefined
    }
  } as unknown as Awaited<ReturnType<typeof import("./app.js").buildApp>>;

  const startPromise = startServer({
    acquireServerRuntimeGuard: acquireNoopServerRuntimeGuard,
    buildApp: async () => app,
    createDailySummaryService: () => ({
      start: () => undefined,
      stop: () => undefined
    }),
    createMetricsAccumulatorService: () => ({
      initialize: () => undefined,
      start: () => undefined,
      stop: () => undefined
    }),
    createSnapshotWriterService: () => ({
      start: () => undefined,
      stop: () => undefined
    }),
    migrateDatabase: () => undefined,
    seedDatabase: () => undefined
  });

  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

  assert.equal(listenCalled, true);
  assert.deepEqual(callOrder, ["listen"]);

  assert.equal(connectResolvers.length, 1);
  connectResolvers[0]!();

  await startPromise;
  assert.deepEqual(callOrder, ["listen", "connect-resolved"]);
});

test("startServer wires MetricHistoryRetentionService into server lifecycle", async () => {
  const callOrder: string[] = [];
  let onCloseHook: (() => Promise<void> | void) | null = null;
  const app = {
    addHook: (_name: string, hook: () => Promise<void> | void) => {
      onCloseHook = hook;
    },
    close: async () => undefined,
    listen: async () => {
      callOrder.push("listen");
    },
    log: {
      error: () => undefined,
      warn: () => undefined
    },
    mqttClientService: {
      connect: async () => undefined
    },
    socketService: {
      emitDisplaySync: () => undefined
    }
  } as unknown as Awaited<ReturnType<typeof import("./app.js").buildApp>>;

  let started = 0;
  let stopped = 0;

  await startServer({
    acquireServerRuntimeGuard: acquireNoopServerRuntimeGuard,
    buildApp: async () => app,
    createDailySummaryService: () => ({
      start: () => undefined,
      stop: () => undefined
    }),
    createMetricHistoryRetentionService: (options) => {
      assert.equal(options.logger, app.log);
      assert.equal(options.snapshotRetentionDays, config.metricSnapshotRetentionDays);
      assert.equal(options.summaryRetentionDays, config.dailySummaryRetentionDays);
      assert.equal(options.vacuumEnabled, config.metricRetentionVacuumEnabled);

      return {
        start: () => {
          started += 1;
        },
        stop: () => {
          stopped += 1;
        }
      };
    },
    createMetricsAccumulatorService: () => ({
      initialize: () => undefined,
      start: () => undefined,
      stop: () => undefined
    }),
    createSnapshotWriterService: () => ({
      start: () => undefined,
      stop: () => undefined
    }),
    migrateDatabase: () => undefined,
    seedDatabase: () => undefined
  });

  assert.equal(started, 1);
  assert.ok(onCloseHook);
  if (!onCloseHook) {
    throw new Error("Expected onClose hook to be registered");
  }

  const closeHook = onCloseHook as () => Promise<void> | void;
  await closeHook();
  assert.equal(stopped, 1);
  assert.deepEqual(callOrder, ["listen"]);
});

test("startServer releases the backend runtime guard on close", async () => {
  let onCloseHook: (() => Promise<void> | void) | null = null;
  let released = 0;
  const app = {
    addHook: (_name: string, hook: () => Promise<void> | void) => {
      onCloseHook = hook;
    },
    close: async () => undefined,
    listen: async () => undefined,
    log: {
      error: () => undefined,
      warn: () => undefined
    },
    mqttClientService: {
      connect: async () => undefined
    },
    socketService: {
      emitDisplaySync: () => undefined
    }
  } as unknown as Awaited<ReturnType<typeof import("./app.js").buildApp>>;

  await startServer({
    acquireServerRuntimeGuard: () => () => {
      released += 1;
    },
    buildApp: async () => app,
    createDailySummaryService: () => ({
      start: () => undefined,
      stop: () => undefined
    }),
    createMetricHistoryRetentionService: () => ({
      start: () => undefined,
      stop: () => undefined
    }),
    createMetricsAccumulatorService: () => ({
      initialize: () => undefined,
      start: () => undefined,
      stop: () => undefined
    }),
    createSnapshotWriterService: () => ({
      start: () => undefined,
      stop: () => undefined
    }),
    migrateDatabase: () => undefined,
    seedDatabase: () => undefined
  });

  assert.ok(onCloseHook);
  if (!onCloseHook) {
    throw new Error("Expected onClose hook to be registered");
  }

  const closeHook = onCloseHook as () => Promise<void> | void;
  await closeHook();
  assert.equal(released, 1);
});
