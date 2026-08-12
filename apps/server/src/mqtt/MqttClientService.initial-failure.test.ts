import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import Database from "better-sqlite3";
import type { MqttClient } from "mqtt";
import { MqttClientService } from "./MqttClientService.js";

class FailingClient extends EventEmitter {
  connected = false;
  endCalls = 0;

  end(_force: boolean, _options: Record<string, never>, callback: () => void) {
    this.endCalls += 1;
    callback();
    return this;
  }

  subscribe(_topics: string[], callback: (error?: Error | null) => void) {
    callback(null);
    return this;
  }

  unsubscribe(_topics: string[], callback: (error?: Error | null) => void) {
    callback(null);
    return this;
  }
}

function createDatabase() {
  const database = new Database(":memory:");
  database.exec(`
    CREATE TABLE mqtt_settings (
      broker_host TEXT,
      broker_port INTEGER,
      username TEXT,
      password TEXT,
      client_id TEXT,
      reconnect_interval INTEGER,
      message_timeout INTEGER,
      data_mode TEXT
    );
    INSERT INTO mqtt_settings (
      broker_host, broker_port, username, password, client_id,
      reconnect_interval, message_timeout, data_mode
    ) VALUES ('localhost', 1883, '', '', 'test-client', 5000, 1, 'mqtt');

    CREATE TABLE topic_mappings (
      topic TEXT,
      enabled INTEGER
    );

    CREATE TABLE system_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME
    );
  `);
  return database;
}

test("MqttClientService ends a failed initial client before leaving the runtime lease free", async () => {
  const database = createDatabase();
  const client = new FailingClient();
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("error", new Error("initial failure")));
      return client as unknown as MqttClient;
    },
    database,
    logger: {
      error: () => undefined,
      info: () => undefined,
      warn: () => undefined
    }
  });

  await assert.rejects(() => service.connect(), /initial failure/);

  assert.equal(client.endCalls, 1);
  assert.equal(
    database.prepare("SELECT value FROM system_settings WHERE key = 'mqtt_runtime_lease'").get(),
    undefined
  );
  assert.equal(service.getStatus().connected, false);
  assert.match(service.getStatus().reason ?? "", /initial failure/);

  database.close();
});
