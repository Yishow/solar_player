import { randomBytes } from "node:crypto";
import { connect, type IClientOptions, type MqttClient } from "mqtt";
import type Database from "better-sqlite3";
import type { MqttTransportEvidence } from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import type { DiscoveryTransport } from "../services/mqttObservationCatalogService.js";
import { resolveMqttSettings, type MqttSettingsRow } from "./settings-source.js";

const DISCOVERY_CLIENT_ID_PREFIX = "solar-display-discovery-";

function readSettings(database: Database.Database) {
  const row = database
    .prepare(`
      SELECT broker_host, broker_port, username, password, client_id, reconnect_interval, message_timeout, data_mode
      FROM mqtt_settings LIMIT 1
    `)
    .get() as MqttSettingsRow | undefined;
  return resolveMqttSettings(process.env, row ?? null);
}

/**
 * An approved active capture gets its own client so discovery never joins, and
 * never can unsubscribe, the production subscription list. The client does not
 * reconnect: a capture session is short-lived by contract.
 */
export function createMqttDiscoveryTransport(options: {
  connectFn?: (url: string, clientOptions: IClientOptions) => MqttClient;
  database?: () => Database.Database;
} = {}): DiscoveryTransport {
  const connectFn = options.connectFn ?? connect;
  const readDatabase = options.database ?? getDatabase;
  return {
    open({ connectionRef, filter, onMessage }) {
      const settings = readSettings(readDatabase());
      if (settings.data_mode === "mock") {
        return Promise.reject(Object.assign(new Error("DISCOVERY_MOCK_MODE"), { code: "DISCOVERY_MOCK_MODE" }));
      }
      const timeoutMs = Math.max((settings.message_timeout ?? 30) * 1000, 1000);
      const client = connectFn(`mqtt://${settings.broker_host?.trim() || "localhost"}:${settings.broker_port ?? 1883}`, {
        clean: true,
        clientId: `${DISCOVERY_CLIENT_ID_PREFIX}${randomBytes(4).toString("hex")}`,
        connectTimeout: timeoutMs,
        password: settings.password ?? undefined,
        reconnectPeriod: 0,
        username: settings.username ?? undefined
      });
      const close = () => new Promise<void>((resolve) => { client.end(true, {}, () => resolve()); });

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          cleanup();
          void close();
          reject(Object.assign(new Error("DISCOVERY_CONNECT_TIMEOUT"), { code: "DISCOVERY_CONNECT_TIMEOUT" }));
        }, timeoutMs);
        const cleanup = () => {
          clearTimeout(timer);
          client.off("connect", onConnect);
          client.off("error", onError);
        };
        const onError = (error: Error) => {
          cleanup();
          void close();
          reject(Object.assign(error, { code: (error as { code?: string }).code ?? "SUBSCRIPTION_REFUSED" }));
        };
        const onConnect = () => {
          client.subscribe(filter, (error) => {
            if (error) {
              onError(Object.assign(error, { code: "SUBSCRIPTION_REFUSED" }));
              return;
            }
            cleanup();
            client.on("message", (exactTopic, payload, packet) => {
              onMessage({
                connectionRef,
                dup: packet?.dup ?? null,
                exactTopic,
                origin: "mqtt",
                qos: packet?.qos ?? null,
                receivedAt: new Date().toISOString(),
                retain: packet?.retain ?? null,
                sourceTimestampEvidence: null
              } satisfies MqttTransportEvidence, payload.toString());
            });
            resolve({ close });
          });
        };
        client.once("connect", onConnect);
        client.once("error", onError);
      });
    }
  };
}
