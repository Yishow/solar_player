import type {
  SustainabilityPeriodKey,
  SustainabilityPeriodStory,
  SustainabilityProvenance
} from "@solar-display/shared";
import { useEffect, useMemo, useRef } from "react";
import { fetchSustainabilityStory } from "../services/api";
import { resolveDisplayPageRuntimeRefreshSpec } from "../pages/runtimeRefreshRegistry";
import { useRuntimeRefreshLifecycle } from "./useRuntimeRefreshLifecycle";
import { useAppTime } from "./useAppTime";
import { useLiveMetricsSelector } from "./useLiveMetrics";
import { resolveClientFreshnessState } from "./useFreshnessState";

type SustainabilityStoryRuntimePayload = Awaited<ReturnType<typeof fetchSustainabilityStory>>["story"];

function advanceProvenance(
  provenance: SustainabilityProvenance,
  input: {
    elapsedMonotonicMs: number;
    payload: SustainabilityStoryRuntimePayload;
    timeSyncState: ReturnType<typeof useAppTime>["state"];
  }
) {
  if (!provenance.freshness) {
    return provenance;
  }
  const freshness = resolveClientFreshnessState({
    connected: false,
    elapsedMonotonicMs: input.elapsedMonotonicMs,
    policy: input.payload.freshnessPolicy,
    serverFreshness: provenance.freshness,
    timeSyncState: input.timeSyncState
  });
  return {
    ...provenance,
    freshness,
    syncState:
      freshness.state === "live"
        ? provenance.syncState
        : freshness.state === "unavailable"
          ? "missing"
          : freshness.state === "delayed"
            ? "warning"
            : "stale"
  } satisfies SustainabilityProvenance;
}

function advancePeriodFreshness(
  period: SustainabilityPeriodStory,
  input: Parameters<typeof advanceProvenance>[1]
) {
  return {
    ...period,
    bigNumberProvenance: Object.fromEntries(
      Object.entries(period.bigNumberProvenance).map(([key, provenance]) => [
        key,
        advanceProvenance(provenance, input)
      ])
    ) as SustainabilityPeriodStory["bigNumberProvenance"],
    highlights: period.highlights.map((highlight) => ({
      ...highlight,
      provenance: advanceProvenance(highlight.provenance, input)
    })),
    provenance: advanceProvenance(period.provenance, input)
  };
}

export function advanceSustainabilityStoryWhileOffline(input: {
  elapsedMonotonicMs: number;
  payload: SustainabilityStoryRuntimePayload;
  timeSyncState: ReturnType<typeof useAppTime>["state"];
}) {
  return {
    ...input.payload,
    period: advancePeriodFreshness(input.payload.period, input),
    periods: Object.fromEntries(
      Object.entries(input.payload.periods).map(([periodKey, period]) => [
        periodKey,
        period ? advancePeriodFreshness(period, input) : period
      ])
    ) as SustainabilityStoryRuntimePayload["periods"]
  };
}

export function useSustainabilityStoryRuntime(
  selectedPeriod: SustainabilityPeriodKey,
  options?: {
    enabled?: boolean;
  }
) {
  const periodPayloadCacheRef = useRef(new Map<SustainabilityPeriodKey, SustainabilityStoryRuntimePayload>());
  const receivedPayloadRef = useRef<SustainabilityStoryRuntimePayload | null>(null);
  const receivedAtMonotonicMsRef = useRef(0);
  const appTime = useAppTime();
  const isSocketConnected = useLiveMetricsSelector(
    (state) => state.connectionState.status === "connected"
  );
  const spec = resolveDisplayPageRuntimeRefreshSpec("sustainability", {
    selectedPeriod
  });
  const warmPayload = periodPayloadCacheRef.current.get(selectedPeriod) ?? null;

  const runtime = useRuntimeRefreshLifecycle<SustainabilityStoryRuntimePayload>({
    enabled: (options?.enabled ?? true) || (typeof window !== "undefined" && window.location.pathname.startsWith("/display-pages/editor")),
    initialPayload: warmPayload,
    load: async () => {
      const response = await fetchSustainabilityStory(selectedPeriod);
      return response.story;
    },
    refreshKey: spec.refreshKey,
    shouldRefresh: (event) => spec.refreshScopes.includes(event.scope),
    runtimeSyncPageKey: "sustainability"
  });

  useEffect(() => {
    if (runtime.payload?.selectedPeriod === selectedPeriod) {
      periodPayloadCacheRef.current.set(selectedPeriod, runtime.payload);
    }
  }, [runtime.payload, selectedPeriod]);

  const cachedPeriodPayload = periodPayloadCacheRef.current.get(selectedPeriod) ?? null;
  const runtimePeriodPayload = runtime.payload?.selectedPeriod === selectedPeriod ? runtime.payload : null;
  const periodPayload = runtimePeriodPayload ?? cachedPeriodPayload;
  if (periodPayload !== receivedPayloadRef.current) {
    receivedPayloadRef.current = periodPayload;
    receivedAtMonotonicMsRef.current =
      typeof performance === "undefined" ? 0 : performance.now();
  }
  const resolvedPayload = useMemo(() => {
    if (!periodPayload || isSocketConnected) {
      return periodPayload;
    }
    const monotonicNow =
      typeof performance === "undefined"
        ? receivedAtMonotonicMsRef.current
        : performance.now();
    return advanceSustainabilityStoryWhileOffline({
      elapsedMonotonicMs: Math.max(
        0,
        monotonicNow - receivedAtMonotonicMsRef.current
      ),
      payload: periodPayload,
      timeSyncState: appTime.state
    });
  }, [appTime.state, appTime.nowEpochMs, isSocketConnected, periodPayload]);

  return {
    ...runtime,
    isLoading: resolvedPayload === null ? runtime.isLoading : false,
    payload: resolvedPayload
  };
}
