export type MonitoringHistoryRange = "day" | "month" | "total" | "week" | "year";

export type MonitoringHistorySnapshot = {
  capturedAt: string;
  co2?: number | null;
  consumption?: number | null;
  efficiency?: number | null;
  generation?: number | null;
  ratio?: number | null;
  selfConsumption?: number | null;
};

export type MonitoringHistoryPayload<TSnapshot extends MonitoringHistorySnapshot = MonitoringHistorySnapshot> = {
  range: MonitoringHistoryRange;
  snapshots: TSnapshot[];
};

type ResolveMonitoringHistoryPayloadArgs<TSnapshot extends MonitoringHistorySnapshot> = {
  cachedPayload: MonitoringHistoryPayload<TSnapshot> | null;
  range: MonitoringHistoryRange;
  runtimePayload: MonitoringHistoryPayload<TSnapshot> | null;
};

const monitoringHistoryPayloadCache = new Map<MonitoringHistoryRange, MonitoringHistoryPayload>();

export function readCachedMonitoringHistoryPayload<TSnapshot extends MonitoringHistorySnapshot>(
  range: MonitoringHistoryRange
) {
  return (monitoringHistoryPayloadCache.get(range) as MonitoringHistoryPayload<TSnapshot> | undefined) ?? null;
}

export function rememberMonitoringHistoryPayload<TSnapshot extends MonitoringHistorySnapshot>(
  payload: MonitoringHistoryPayload<TSnapshot> | null
) {
  if (!payload) {
    return;
  }

  monitoringHistoryPayloadCache.set(payload.range, payload);
}

export function resolveMonitoringHistoryPayloadForRange<TSnapshot extends MonitoringHistorySnapshot>({
  cachedPayload,
  range,
  runtimePayload
}: ResolveMonitoringHistoryPayloadArgs<TSnapshot>) {
  if (runtimePayload?.range === range) {
    return runtimePayload;
  }

  return cachedPayload;
}

export function clearMonitoringHistoryPayloadCacheForTest() {
  monitoringHistoryPayloadCache.clear();
}
