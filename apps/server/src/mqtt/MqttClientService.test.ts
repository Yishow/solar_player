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

function createDatabase() {
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
          reconnect_interval: 5000,
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
