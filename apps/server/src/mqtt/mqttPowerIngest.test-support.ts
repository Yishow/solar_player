import { EventEmitter } from "node:events";
import type Database from "better-sqlite3";
import type { MeterSourceDefinition } from "@solar-display/shared";
import type { MqttClient } from "mqtt";
import { applyGuidedMapping, previewGuidedMapping } from "../services/guidedMqttMappingService.js";
import { getDatabase } from "../routes/display-pages-asset-governance.test-support.js";
import { MqttClientService, type MqttClientServiceOptions } from "./MqttClientService.js";

export { getDatabase };

export type TestLogger = MqttClientServiceOptions["logger"];

export const silentLogger: TestLogger = {
  error: () => undefined,
  info: () => undefined,
  warn: () => undefined
};

export class FakeMqttClient extends EventEmitter {
  connected = true;
  subscriptions: string[][] = [];

  subscribe(topics: string[], callback: (error?: Error | null) => void) {
    this.subscriptions.push([...topics]);
    queueMicrotask(() => callback(null));
    return this;
  }

  unsubscribe(_topics: string[], callback: (error?: Error | null) => void) {
    queueMicrotask(() => callback(null));
    return this;
  }

  publish(_topic: string, _payload: string, _options: unknown, callback?: (error?: Error | null) => void) {
    queueMicrotask(() => callback?.(null));
    return this;
  }

  end(_force: boolean, _options: Record<string, never>, callback: () => void) {
    callback();
    return this;
  }
}

export const powerSource: MeterSourceDefinition = {
  channelId: "kn-main-power", meterId: "kn-main-power", metricKey: "consumptionPower", metricScope: "kn",
  enabled: true, reviewStatus: "reviewed", measurementKind: "power-gauge", energyFlowRole: "consumption",
  inputUnit: "kW", scaleDecimal: "1", sourceRevision: 1, epochId: "one", expectedCadenceSeconds: 60,
  sourceTimestampTimeZone: null, timestampPolicy: "allow-receive-time-estimate"
};

export const powerTopic = "factory/kn/power";

export function reviewMapping(
  database: Database.Database,
  source: MeterSourceDefinition,
  topic: string,
  selector: { path: string[]; tagEquals?: string },
  idempotencyKey: string
) {
  const draft = {
    channelId: source.channelId, energyFlowRole: source.energyFlowRole, measurementKind: source.measurementKind,
    metricScope: source.metricScope, selector, source, timestampPolicy: source.timestampPolicy, topic
  };
  const preview = previewGuidedMapping(database, draft);
  return applyGuidedMapping(database, {
    canonicalDraft: preview.canonicalDraft, idempotencyKey, meterId: source.meterId,
    previewToken: preview.previewToken, source
  });
}

type RuntimePacket = { dup?: boolean | null; qos?: number | null; retain?: boolean | null };

export async function withRuntime(
  run: (emit: (topic: string, payload: unknown, packet?: RuntimePacket) => Promise<void>) => Promise<void>,
  options: {
    logger?: TestLogger;
    socketService?: MqttClientServiceOptions["socketService"];
    meterReadingEventSink?: MqttClientServiceOptions["meterReadingEventSink"];
  } = {}
) {
  const client = new FakeMqttClient();
  const service = new MqttClientService({
    connectFn: () => {
      queueMicrotask(() => client.emit("connect"));
      return client as unknown as MqttClient;
    },
    database: getDatabase(),
    logger: options.logger ?? silentLogger,
    socketService: options.socketService,
    meterReadingEventSink: options.meterReadingEventSink
  });
  try {
    await service.connect();
    await run(async (topic, payload, packet) => {
      client.emit("message", topic, Buffer.from(JSON.stringify(payload)), {
        dup: false,
        qos: 0,
        retain: false,
        ...packet
      });
      await new Promise((resolve) => setImmediate(resolve));
    });
  } finally {
    await service.disconnect();
  }
}

export function readLive(metricScope: string, metricKey: string) {
  return getDatabase().prepare(`
    SELECT value, unit, timestamp, quality, raw_payload
    FROM live_metric_values
    WHERE metric_scope = ? AND metric_key = ?
  `).get(metricScope, metricKey) as {
    quality: string | null;
    raw_payload: string | null;
    timestamp: string;
    unit: string;
    value: number;
  } | undefined;
}

export function countRows(table: string) {
  return (getDatabase().prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count;
}
