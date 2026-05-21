import assert from "node:assert/strict";
import test from "node:test";

import { startServer } from "./server-startup.js";

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
