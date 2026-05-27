import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import type Database from "better-sqlite3";
import type { MqttClient } from "mqtt";
import { MqttClientService } from "./MqttClientService.js";

class FakeMqttClient extends EventEmitter {
  connected = true;
  subscribeError: Error | null = null;

  subscribe(_topics: string[], callback: (error?: Error | null) => void) {
    queueMicrotask(() => callback(this.subscribeError));
    return this;
  }

  unsubscribe(_topics: string[], callback: (error?: Error | null) => void) {
    queueMicrotask(() => callback(null));
    return this;
  }

  end(_force: boolean, _options: Record<string, never>, callback: () => void) {
    callback();
    return this;
  }
}

function createDatabase(options?: { reconnectInterval?: number }) {
  return {
    prepare(sql: string) {
      return {
        all: () => {
          if (sql.includes("FROM topic_mappings")) {
            return [{ topic: "kuozui/plant/solar/power" }];
          }

          return [];
        },
        get: () => ({
          broker_host: "192.168.31.62",
          broker_port: 1883,
          client_id: "solar-display",
          data_mode: "mqtt",
          message_timeout: 1,
          password: "",
          reconnect_interval: options?.reconnectInterval ?? 5000,
          username: ""
        })
      };
    }
  } as unknown as Database.Database;
}

test("MqttClientService handles subscribe failures from client connect events without unhandled rejections", async () => {
  const client = new FakeMqttClient();
  client.subscribeError = new Error("Connection closed");
  const unhandledRejections: unknown[] = [];
  const onUnhandledRejection = (reason: unknown) => {
    unhandledRejections.push(reason);
  };
  const logger = {
    error: () => undefined,
    info: () => undefined,
    warn: () => undefined
  };
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database: createDatabase(),
    logger
  });

  process.on("unhandledRejection", onUnhandledRejection);

  try {
    await assert.rejects(() => service.connect(), /Connection closed/);
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(unhandledRejections, []);
  } finally {
    process.off("unhandledRejection", onUnhandledRejection);
    await service.disconnect();
  }
});

test("MqttClientService keeps connected status when connect-event subscription sync fails", async () => {
  const client = new FakeMqttClient();
  const logger = {
    error: () => undefined,
    info: () => undefined,
    warn: () => undefined
  };
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database: createDatabase(),
    logger
  });

  await service.connect();

  (service as unknown as { activeTopics: Set<string> }).activeTopics.clear();
  client.subscribeError = new Error("Subscription ACL denied");
  client.emit("connect");
  await new Promise((resolve) => setImmediate(resolve));

  const status = service.getStatus();
  assert.equal(status.connected, true);
  assert.equal(status.reason, "Subscription ACL denied");

  await service.disconnect();
});

test("MqttClientService keeps routine reconnect attempts out of info logs", async () => {
  const client = new FakeMqttClient();
  const logger = {
    debugCalls: [] as Array<{ message?: string; payload: unknown }>,
    error: () => undefined,
    infoCalls: [] as Array<{ message?: string; payload: unknown }>,
    info(payload: unknown, message?: string) {
      this.infoCalls.push({ message, payload });
    },
    debug(payload: unknown, message?: string) {
      this.debugCalls.push({ message, payload });
    },
    warn: () => undefined
  };
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database: createDatabase(),
    logger
  });

  await service.connect();

  client.emit("reconnect");
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(logger.infoCalls.length, 0);
  assert.deepEqual(
    logger.debugCalls.map((call) => call.message),
    ["MQTT reconnecting"]
  );

  await service.disconnect();
});

test("MqttClientService keeps reconnecting status stable across close and offline retry events", async () => {
  const client = new FakeMqttClient();
  const emittedStatuses: Array<{ connected: boolean; reason: string | null }> = [];
  const logger = {
    debug: () => undefined,
    error: () => undefined,
    info: () => undefined,
    warn: () => undefined
  };
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database: createDatabase(),
    logger,
    socketService: {
      emitCircuitMetrics: () => undefined,
      emitLiveMetrics: () => undefined,
      emitMqttStatus: (status) => {
        emittedStatuses.push({
          connected: status.connected,
          reason: status.reason
        });
      },
      emitSystemError: () => undefined,
      emitSystemRecovered: () => undefined
    }
  });

  await service.connect();
  emittedStatuses.length = 0;

  client.emit("reconnect");
  client.emit("close");
  client.emit("offline");

  assert.deepEqual(emittedStatuses, [
    {
      connected: false,
      reason: "reconnecting"
    }
  ]);
  assert.equal(service.getStatus().reason, "reconnecting");

  await service.disconnect();
});

test("MqttClientService treats offline before reconnect as one stable reconnecting state", async () => {
  const client = new FakeMqttClient();
  const emittedStatuses: Array<{ connected: boolean; reason: string | null }> = [];
  const logger = {
    debug: () => undefined,
    error: () => undefined,
    info: () => undefined,
    warn: () => undefined
  };
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database: createDatabase(),
    logger,
    socketService: {
      emitCircuitMetrics: () => undefined,
      emitLiveMetrics: () => undefined,
      emitMqttStatus: (status) => {
        emittedStatuses.push({
          connected: status.connected,
          reason: status.reason
        });
      },
      emitSystemError: () => undefined,
      emitSystemRecovered: () => undefined
    }
  });

  await service.connect();
  emittedStatuses.length = 0;

  client.emit("offline");
  client.emit("reconnect");
  client.emit("close");

  assert.deepEqual(emittedStatuses, [
    {
      connected: false,
      reason: "reconnecting"
    }
  ]);
  assert.equal(service.getStatus().reason, "reconnecting");

  await service.disconnect();
});

test("MqttClientService falls back to offline when reconnect interval disables retries", async () => {
  const client = new FakeMqttClient();
  const emittedStatuses: Array<{ connected: boolean; reason: string | null }> = [];
  const logger = {
    debug: () => undefined,
    error: () => undefined,
    info: () => undefined,
    warn: () => undefined
  };
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database: createDatabase({ reconnectInterval: 0 }),
    logger,
    socketService: {
      emitCircuitMetrics: () => undefined,
      emitLiveMetrics: () => undefined,
      emitMqttStatus: (status) => {
        emittedStatuses.push({
          connected: status.connected,
          reason: status.reason
        });
      },
      emitSystemError: () => undefined,
      emitSystemRecovered: () => undefined
    }
  });

  await service.connect();
  emittedStatuses.length = 0;

  client.emit("offline");
  client.emit("close");

  assert.deepEqual(emittedStatuses, [
    {
      connected: false,
      reason: "offline"
    }
  ]);
  assert.equal(service.getStatus().reason, "offline");

  await service.disconnect();
});
