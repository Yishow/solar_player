import type Database from "better-sqlite3";
import type {
  GuidedMappingActivation,
  GuidedMappingReception,
  MeterSourceDefinition
} from "@solar-display/shared";
import { listEnabledGenericTopics, type MqttClientService } from "../mqtt/MqttClientService.js";

type SubscriptionOwner = Pick<MqttClientService, "getActiveTopics" | "getStatus" | "subscribe">;

/**
 * Hands the committed reception configuration to the runtime owner and reports
 * whether the broker acknowledged it. The saved configuration is never rolled
 * back by a broker failure, so every non-active outcome stays retryable.
 *
 * The desired subscription set is always recomputed from the committed enabled
 * mappings, so reconciling one owner never unsubscribes another owner of the
 * same topic. A disabled target still reconciles, but reports `inactive`: an
 * acknowledgement earned by a different owner is not its own activation.
 */
export async function activateGuidedMapping(
  runtime: SubscriptionOwner,
  database: Database.Database,
  target: { enabled: boolean; topic: string }
): Promise<GuidedMappingActivation> {
  const { enabled, topic } = target;
  try {
    await runtime.subscribe(listEnabledGenericTopics(database));
  } catch (error) {
    return {
      reason: (error as { code?: string }).code ?? "BROKER_SUBSCRIBE_REFUSED",
      retryable: true,
      state: "failed",
      topic
    };
  }
  if (!enabled) {
    return { reason: "SOURCE_DISABLED", retryable: false, state: "inactive", topic };
  }
  if (runtime.getActiveTopics().includes(topic)) {
    return { reason: null, retryable: false, state: "active", topic };
  }
  return {
    reason: runtime.getStatus().connected ? "SUBSCRIPTION_NOT_CONFIRMED" : "RUNTIME_NOT_CONNECTED",
    retryable: true,
    state: "pending",
    topic
  };
}

/** Activation is not reception: only an admitted reading proves data arrived. */
export function readGuidedMappingReception(
  database: Database.Database,
  source: Pick<MeterSourceDefinition, "channelId" | "epochId" | "meterId" | "metricScope" | "sourceRevision">
): GuidedMappingReception {
  const row = database.prepare(`
    SELECT MAX(received_at) AS last_accepted_at FROM meter_readings_accepted
    WHERE metric_scope = ? AND meter_id = ? AND channel_id = ? AND source_revision = ? AND epoch_id = ?
  `).get(
    source.metricScope, source.meterId, source.channelId, source.sourceRevision, source.epochId
  ) as { last_accepted_at: string | null } | undefined;
  return { lastAcceptedAt: row?.last_accepted_at ?? null, observed: Boolean(row?.last_accepted_at) };
}
