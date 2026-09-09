import type Database from "better-sqlite3";
import type {
  GuidedMappingReception,
  MeterSourceDefinition
} from "@solar-display/shared";

export type PowerReceptionSourceIdentity = Readonly<Pick<
  MeterSourceDefinition,
  "metricScope" | "metricKey" | "meterId" | "channelId" | "sourceRevision" | "epochId"
>>;

export function powerReceptionSourceIdentity(
  source: PowerReceptionSourceIdentity
): PowerReceptionSourceIdentity {
  return Object.freeze({
    channelId: source.channelId,
    epochId: source.epochId,
    meterId: source.meterId,
    metricKey: source.metricKey,
    metricScope: source.metricScope,
    sourceRevision: source.sourceRevision
  });
}

type StoredPowerReceptionEvidence = {
  lastAcceptedAt: string;
  source: PowerReceptionSourceIdentity;
};

type MeterSourceCatalogRow = {
  channel_id: string;
  enabled: number;
  epoch_id: string;
  meter_id: string;
  metric_key: string;
  metric_scope: MeterSourceDefinition["metricScope"];
  review_status: MeterSourceDefinition["reviewStatus"];
  source_revision: number;
};

function sourceKey(source: PowerReceptionSourceIdentity) {
  return `${source.metricScope}:${source.channelId}`;
}

function sameSourceIdentity(
  left: PowerReceptionSourceIdentity,
  right: PowerReceptionSourceIdentity
) {
  return left.metricScope === right.metricScope
    && left.metricKey === right.metricKey
    && left.meterId === right.meterId
    && left.channelId === right.channelId
    && left.sourceRevision === right.sourceRevision
    && left.epochId === right.epochId;
}

function rowToSourceIdentity(row: MeterSourceCatalogRow): PowerReceptionSourceIdentity {
  return powerReceptionSourceIdentity({
    channelId: row.channel_id,
    epochId: row.epoch_id,
    meterId: row.meter_id,
    metricKey: row.metric_key,
    metricScope: row.metric_scope,
    sourceRevision: row.source_revision
  });
}

/**
 * Holds only current-runtime proof that a reviewed power source committed a
 * live update. The source tuple is deliberately kept beside the receipt time;
 * generic live rows do not carry enough identity to prove this fact.
 */
export class PowerReceptionEvidenceStore {
  private readonly evidence = new Map<string, StoredPowerReceptionEvidence>();

  constructor(private readonly database: Database.Database) {}

  record(source: PowerReceptionSourceIdentity, receivedAt: string) {
    this.pruneStaleSources();
    this.evidence.set(sourceKey(source), {
      lastAcceptedAt: receivedAt,
      source: powerReceptionSourceIdentity(source)
    });
  }

  read(source: PowerReceptionSourceIdentity): GuidedMappingReception {
    this.pruneStaleSources();
    const evidence = this.evidence.get(sourceKey(source));
    if (!evidence || !sameSourceIdentity(evidence.source, source)) {
      return { lastAcceptedAt: null, observed: false };
    }
    return {
      lastAcceptedAt: evidence.lastAcceptedAt,
      observed: true
    };
  }

  private pruneStaleSources() {
    for (const [key, evidence] of this.evidence) {
      const current = this.readCurrentSource(evidence.source.metricScope, evidence.source.channelId);
      if (!current || !sameSourceIdentity(current, evidence.source)) {
        this.evidence.delete(key);
      }
    }
  }

  private readCurrentSource(metricScope: PowerReceptionSourceIdentity["metricScope"], channelId: string) {
    try {
      const row = this.database.prepare(`
        SELECT metric_scope, metric_key, meter_id, channel_id, source_revision, epoch_id,
          enabled, review_status
        FROM meter_sources
        WHERE metric_scope = ? AND channel_id = ?
        ORDER BY source_revision DESC, rowid DESC
        LIMIT 1
      `).get(metricScope, channelId) as MeterSourceCatalogRow | undefined;
      if (!row || row.enabled !== 1 || row.review_status !== "reviewed") {
        return null;
      }
      return rowToSourceIdentity(row);
    } catch {
      // Isolated readers and a partially initialized database must fail closed.
      return null;
    }
  }
}
