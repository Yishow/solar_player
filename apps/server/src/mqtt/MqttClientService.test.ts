import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import type Database from "better-sqlite3";
import type { IClientOptions, MqttClient } from "mqtt";
import { MqttClientService } from "./MqttClientService.js";

type ConnectFn = typeof import("mqtt").connect;

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

function createDatabase(options?: {
  clientId?: string;
  generatedClientId?: string | null;
  reconnectInterval?: number;
  systemSettings?: Record<string, string>;
  throwOnTopicLookup?: boolean;
}) {
  const systemSettings = new Map<string, string>(Object.entries(options?.systemSettings ?? {}));
  if (options?.generatedClientId) {
    systemSettings.set("mqtt_generated_client_id", options.generatedClientId);
  }

  return {
    prepare(sql: string) {
      return {
        all: () => {
          if (sql.includes("FROM topic_mappings")) {
            if (options?.throwOnTopicLookup && sql.includes("WHERE topic = ?")) {
              throw new Error("Topic mapping query failed");
            }

            return [{ topic: "kuozui/plant/solar/power" }];
          }

          return [];
        },
        get: (key?: string) => {
          if (sql.includes("FROM system_settings")) {
            if (!key) {
              return undefined;
            }

            const value = systemSettings.get(key);
            return value === undefined ? undefined : { value };
          }

          return {
            broker_host: "192.168.31.62",
            broker_port: 1883,
            client_id: options?.clientId ?? "solar-display",
            data_mode: "mqtt",
            message_timeout: 1,
            password: "",
            reconnect_interval: options?.reconnectInterval ?? 5000,
            username: ""
          };
        },
        run: (key?: string, value?: string) => {
          if (sql.includes("INSERT INTO system_settings") && key) {
            if (value === undefined) {
              systemSettings.delete(key);
            } else {
              systemSettings.set(key, value);
            }
            return { changes: 1 };
          }

          if (sql.includes("DELETE FROM system_settings") && key) {
            const existed = systemSettings.delete(key);
            return { changes: existed ? 1 : 0 };
          }

          return { changes: 0 };
        }
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

test("MqttClientService handles message processing failures without unhandled rejections", async () => {
  const client = new FakeMqttClient();
  const unhandledRejections: unknown[] = [];
  const errorCalls: Array<{ message?: string; payload: unknown }> = [];
  const onUnhandledRejection = (reason: unknown) => {
    unhandledRejections.push(reason);
  };
  const logger = {
    error(payload: unknown, message?: string) {
      errorCalls.push({ message, payload });
    },
    info: () => undefined,
    warn: () => undefined
  };
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database: createDatabase({ throwOnTopicLookup: true }),
    logger
  });

  process.on("unhandledRejection", onUnhandledRejection);

  try {
    await service.connect();
    client.emit("message", "kuozui/plant/solar/power", Buffer.from("{\"value\":1}"));
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(unhandledRejections, []);
    assert.deepEqual(
      errorCalls.map((call) => call.message),
      ["MQTT message handling failed"]
    );
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
      emitDisplaySync: () => undefined,
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
      emitDisplaySync: () => undefined,
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
      emitDisplaySync: () => undefined,
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

test("MqttClientService resolves generic runtime client ids into persisted install-specific ids", async () => {
  const client = new FakeMqttClient();
  let seenClientId: string | undefined;
  const logger = {
    error: () => undefined,
    info: () => undefined,
    warn: () => undefined
  };
  const connectFn = ((brokerUrlOrOptions: string | IClientOptions, maybeOptions?: IClientOptions) => {
    const options = typeof brokerUrlOrOptions === "string" ? maybeOptions : brokerUrlOrOptions;
    seenClientId = options?.clientId;
    queueMicrotask(() => client.emit("connect"));
    return client as unknown as MqttClient;
  }) as ConnectFn;
  const service = new MqttClientService({
    connectFn,
    database: createDatabase(),
    generatedClientIdFn: () => "solar-display-ab12cd34",
    logger
  });

  await service.connect();

  assert.equal(seenClientId, "solar-display-ab12cd34");
  assert.equal(service.getStatus().clientId, "solar-display-ab12cd34");

  await service.disconnect();
});

test("MqttClientService preserves explicit custom runtime client ids", async () => {
  const client = new FakeMqttClient();
  let seenClientId: string | undefined;
  const logger = {
    error: () => undefined,
    info: () => undefined,
    warn: () => undefined
  };
  const connectFn = ((brokerUrlOrOptions: string | IClientOptions, maybeOptions?: IClientOptions) => {
    const options = typeof brokerUrlOrOptions === "string" ? maybeOptions : brokerUrlOrOptions;
    seenClientId = options?.clientId;
    queueMicrotask(() => client.emit("connect"));
    return client as unknown as MqttClient;
  }) as ConnectFn;
  const service = new MqttClientService({
    connectFn,
    database: createDatabase({ clientId: "kuozui-green-display-01" }),
    logger
  });

  await service.connect();

  assert.equal(seenClientId, "kuozui-green-display-01");
  assert.equal(service.getStatus().clientId, "kuozui-green-display-01");

  await service.disconnect();
});

test("MqttClientService reuses an existing generated runtime client id", async () => {
  const client = new FakeMqttClient();
  let seenClientId: string | undefined;
  const logger = {
    error: () => undefined,
    info: () => undefined,
    warn: () => undefined
  };
  const connectFn = ((brokerUrlOrOptions: string | IClientOptions, maybeOptions?: IClientOptions) => {
    const options = typeof brokerUrlOrOptions === "string" ? maybeOptions : brokerUrlOrOptions;
    seenClientId = options?.clientId;
    queueMicrotask(() => client.emit("connect"));
    return client as unknown as MqttClient;
  }) as ConnectFn;
  const service = new MqttClientService({
    connectFn,
    database: createDatabase({ generatedClientId: "solar-display-fedcba98" }),
    generatedClientIdFn: () => "solar-display-should-not-be-used",
    logger
  });

  await service.connect();

  assert.equal(seenClientId, "solar-display-fedcba98");
  assert.equal(service.getStatus().clientId, "solar-display-fedcba98");

  await service.disconnect();
});

test("MqttClientService keeps a second local runtime in standby while the first lease owner is connected", async () => {
  const primaryClient = new FakeMqttClient();
  const standbyClient = new FakeMqttClient();
  let primaryConnectCalls = 0;
  let standbyConnectCalls = 0;
  const logger = {
    error: () => undefined,
    info: () => undefined,
    warn: () => undefined
  };
  const sharedDatabase = createDatabase();
  const primaryConnectFn = ((brokerUrlOrOptions: string | IClientOptions, maybeOptions?: IClientOptions) => {
    primaryConnectCalls += 1;
    const _options = typeof brokerUrlOrOptions === "string" ? maybeOptions : brokerUrlOrOptions;
    queueMicrotask(() => primaryClient.emit("connect"));
    return primaryClient as unknown as MqttClient;
  }) as ConnectFn;
  const standbyConnectFn = ((brokerUrlOrOptions: string | IClientOptions, maybeOptions?: IClientOptions) => {
    standbyConnectCalls += 1;
    const _options = typeof brokerUrlOrOptions === "string" ? maybeOptions : brokerUrlOrOptions;
    queueMicrotask(() => standbyClient.emit("connect"));
    return standbyClient as unknown as MqttClient;
  }) as ConnectFn;
  const primaryService = new MqttClientService({
    connectFn: primaryConnectFn,
    database: sharedDatabase,
    generatedClientIdFn: () => "solar-display-locktest",
    logger
  });
  const standbyService = new MqttClientService({
    connectFn: standbyConnectFn,
    database: sharedDatabase,
    generatedClientIdFn: () => "solar-display-locktest",
    logger
  });

  await primaryService.connect();
  await standbyService.connect();

  assert.equal(primaryConnectCalls, 1);
  assert.equal(standbyConnectCalls, 0);
  assert.equal(primaryService.getStatus().connected, true);
  assert.equal(standbyService.getStatus().connected, false);
  assert.equal(standbyService.getStatus().reason, "standby");

  await standbyService.disconnect();
  await primaryService.disconnect();
});

test("MqttClientService takes over a live lease whose owner pid no longer exists", async () => {
  const client = new FakeMqttClient();
  let connectCalls = 0;
  const logger = {
    error: () => undefined,
    info: () => undefined,
    warn: () => undefined
  };
  const connectFn = ((brokerUrlOrOptions: string | IClientOptions, maybeOptions?: IClientOptions) => {
    connectCalls += 1;
    const _options = typeof brokerUrlOrOptions === "string" ? maybeOptions : brokerUrlOrOptions;
    queueMicrotask(() => client.emit("connect"));
    return client as unknown as MqttClient;
  }) as ConnectFn;
  const service = new MqttClientService({
    connectFn,
    database: createDatabase({
      generatedClientId: "solar-display-locktest",
      systemSettings: {
        mqtt_runtime_lease: JSON.stringify({
          acquiredAt: new Date(Date.now() - 5_000).toISOString(),
          expiresAt: new Date(Date.now() + 10_000).toISOString(),
          ownerToken: "dead-owner",
          pid: 12345
        })
      }
    }),
    logger,
    runtimeProcessAliveFn: () => false
  });

  await service.connect();

  assert.equal(connectCalls, 1);
  assert.equal(service.getStatus().connected, true);
  assert.equal(service.getStatus().reason, "connected");

  await service.disconnect();
});

test("MqttClientService testConnection uses an isolated probe client id", async () => {
  const client = new FakeMqttClient();
  let seenClientId: string | undefined;
  const logger = {
    error: () => undefined,
    info: () => undefined,
    warn: () => undefined
  };
  const connectFn = ((brokerUrlOrOptions: string | IClientOptions, maybeOptions?: IClientOptions) => {
    const options = typeof brokerUrlOrOptions === "string" ? maybeOptions : brokerUrlOrOptions;
    seenClientId = options?.clientId;
    queueMicrotask(() => client.emit("connect"));
    return client as unknown as MqttClient;
  }) as ConnectFn;
  const service = new MqttClientService({
    connectFn,
    database: createDatabase(),
    generatedClientIdFn: () => "solar-display-ab12cd34",
    logger
  });

  const result = await service.testConnection({
    clientId: "solar-display-player",
    dataMode: "mqtt",
    host: "192.168.31.62",
    messageTimeout: 1,
    password: "",
    port: 1883,
    reconnectInterval: 5000,
    username: ""
  });

  assert.equal(result.connected, true);
  assert.equal(seenClientId, "solar-display-ab1-probe");
});
