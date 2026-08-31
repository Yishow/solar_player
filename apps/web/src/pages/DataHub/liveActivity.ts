import { useEffect } from "react";
import { getSocketClient, type ScopedLiveMetricsSnapshot } from "../../services/socket";
import { isSolarAdapterManagedMetricIdentity, type DataHubSourcesModel } from "./SourcesModel";
import type { DataHubMetricsModel } from "./MetricsModel";

export function applyMetricsLiveSnapshot(
  model: DataHubMetricsModel,
  snapshot: ScopedLiveMetricsSnapshot
): DataHubMetricsModel {
  let changed = false;
  const metrics = model.metrics.map((row) => {
    if (row.metricScope !== snapshot.metricScope) return row;
    const reading = snapshot.metrics[row.metricKey];
    if (!reading) return row;
    changed = true;
    return {
      ...row,
      freshness: reading.freshness
        ? {
            ageMs: reading.freshness.ageMs,
            category: reading.freshness.category,
            nextTransitionAt: reading.freshness.nextTransitionAt,
            sourceTimestamp: reading.freshness.sourceTimestamp,
            state: reading.freshness.state
          }
        : row.freshness,
      freshnessState: reading.freshness?.state ?? row.freshnessState,
      provenance: {
        ...row.provenance,
        sourceTimestamp: reading.timestamp
      },
      unit: reading.unit ?? row.unit,
      value: reading.value
    };
  });

  return changed
    ? { ...model, generatedAt: snapshot.timestamp ?? model.generatedAt, metrics }
    : model;
}

function latestSnapshotTimestamp(snapshot: ScopedLiveMetricsSnapshot) {
  const timestamps = Object.values(snapshot.metrics).map(({ timestamp }) => timestamp);
  return timestamps.sort().at(-1) ?? snapshot.timestamp;
}

export function applySourcesLiveSnapshot(
  model: DataHubSourcesModel,
  snapshot: ScopedLiveMetricsSnapshot
): DataHubSourcesModel {
  const latestTimestamp = latestSnapshotTimestamp(snapshot);
  const hasManagedMetric = Object.keys(snapshot.metrics).some((metricKey) =>
    isSolarAdapterManagedMetricIdentity(snapshot.metricScope, metricKey)
  );

  return {
    ...model,
    solar: {
      ...model.solar,
      sources: model.solar.sources.map((source) => source.metricScope === snapshot.metricScope && hasManagedMetric
        ? {
            ...source,
            lastGoodSummaryAt: latestTimestamp ?? source.lastGoodSummaryAt,
            sourceTimestamp: latestTimestamp ?? source.sourceTimestamp
          }
        : source),
      zones: model.solar.zones.map((zone) => {
        if (zone.metricScope !== snapshot.metricScope) return zone;
        const prefix = `solarZone.${zone.zoneId}.`;
        const zoneTimestamps = Object.entries(snapshot.metrics)
          .filter(([metricKey]) => metricKey.startsWith(prefix))
          .map(([, reading]) => reading.timestamp)
          .sort();
        const sourceTimestamp = zoneTimestamps.at(-1);
        return sourceTimestamp ? { ...zone, sourceTimestamp } : zone;
      })
    },
    topics: model.topics.map((topic) => {
      if (topic.metricScope !== snapshot.metricScope) return topic;
      const reading = snapshot.metrics[topic.metricKey];
      return reading
        ? {
            ...topic,
            lastReceivedAt: reading.timestamp,
            lastValue: reading.value,
            quality: reading.quality,
            unit: reading.unit ?? topic.unit
          }
        : topic;
    })
  };
}

export function useDataHubLiveMetrics(onSnapshot: (snapshot: ScopedLiveMetricsSnapshot) => void) {
  useEffect(() => {
    const client = getSocketClient();
    client.on("liveMetrics:update", onSnapshot);
    return () => {
      client.off("liveMetrics:update", onSnapshot);
    };
  }, [onSnapshot]);
}
