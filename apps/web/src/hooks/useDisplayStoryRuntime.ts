import type {
  DisplayStoryPageId,
  DisplayStoryPayloadByPageId,
  FactoryCircuitStoryPayload,
  FreshnessResult,
  TimeSyncState
} from "@solar-display/shared";
import { useMemo, useRef } from "react";
import { fetchDisplayStoryPage } from "../services/api";
import { resolveDisplayPageRuntimeRefreshSpec } from "../pages/runtimeRefreshRegistry";
import { useRuntimeRefreshLifecycle } from "./useRuntimeRefreshLifecycle";
import { useAppTime } from "./useAppTime";
import { useLiveMetricsSelector } from "./useLiveMetrics";
import { resolveClientFreshnessState } from "./useFreshnessState";

function advanceFactoryFreshness(
  freshness: FreshnessResult | undefined,
  input: {
    elapsedMonotonicMs: number;
    payload: FactoryCircuitStoryPayload;
    timeSyncState: TimeSyncState;
  }
) {
  if (!freshness || !input.payload.freshnessPolicy) {
    return freshness;
  }
  return resolveClientFreshnessState({
    connected: false,
    elapsedMonotonicMs: input.elapsedMonotonicMs,
    policy: input.payload.freshnessPolicy,
    serverFreshness: freshness,
    timeSyncState: input.timeSyncState
  });
}

function toMonitoringFreshnessState(freshness: FreshnessResult | undefined) {
  if (freshness?.state === "live") {
    return "fresh" as const;
  }
  return !freshness || freshness.state === "unavailable"
    ? "fallback" as const
    : "stale" as const;
}

export function advanceFactoryCircuitStoryWhileOffline(input: {
  elapsedMonotonicMs: number;
  payload: FactoryCircuitStoryPayload;
  timeSyncState: TimeSyncState;
}) {
  const slots = input.payload.slots.map((slot) => {
    const freshness = advanceFactoryFreshness(slot.freshness, input);
    const freshnessState = toMonitoringFreshnessState(freshness);
    return {
      ...slot,
      alertTone: freshnessState === "fresh" ? slot.alertTone : "warning" as const,
      fallbackReason:
        freshnessState === "fresh"
          ? slot.fallbackReason
          : freshnessState === "stale"
            ? "stale-data" as const
            : "socket-disconnected" as const,
      freshness,
      freshnessState
    };
  });
  const kpis = input.payload.kpis.map((kpi) => {
    const freshness = advanceFactoryFreshness(kpi.freshness, input);
    const freshnessState = toMonitoringFreshnessState(freshness);
    return {
      ...kpi,
      alertTone: freshnessState === "fresh" ? kpi.alertTone : "warning" as const,
      fallbackReason:
        freshnessState === "fresh"
          ? kpi.fallbackReason
          : freshnessState === "stale"
            ? "stale-data" as const
            : "socket-disconnected" as const,
      freshness,
      freshnessState,
      helper:
        freshnessState === "fresh"
          ? kpi.helper
          : kpi.helper.replaceAll("目前總負載", "最近總負載"),
      label:
        freshnessState === "fresh"
          ? kpi.label
          : kpi.label.replace(/^目前/u, "")
    };
  });
  const degraded = [...slots, ...kpis].find(
    (item) => item.freshness && item.freshness.state !== "live"
  );
  return {
    ...input.payload,
    kpis,
    slots,
    summary: degraded
      ? {
          alertTone: "warning",
          bindingState: input.payload.summary.bindingState,
          fallbackReason:
            degraded.freshness?.state === "unavailable"
              ? "socket-disconnected"
              : "stale-data",
          freshnessState:
            degraded.freshness?.state === "unavailable" ? "fallback" : "stale"
        }
      : input.payload.summary
  } satisfies FactoryCircuitStoryPayload;
}

export async function loadDisplayStoryRuntimePayload<PageKey extends DisplayStoryPageId>(
  pageKey: PageKey
) {
  const response = await fetchDisplayStoryPage(pageKey);
  return response.payload as DisplayStoryPayloadByPageId[PageKey];
}

export function useDisplayStoryRuntime<PageKey extends DisplayStoryPageId>(
  pageKey: PageKey,
  options?: {
    dependencyKey?: string | null;
    enabled?: boolean;
    initialPayload?: DisplayStoryPayloadByPageId[PageKey] | null;
  }
) {
  const receivedFactoryPayloadRef = useRef<FactoryCircuitStoryPayload | null>(null);
  const receivedAtMonotonicMsRef = useRef(0);
  const appTime = useAppTime();
  const isSocketConnected = useLiveMetricsSelector(
    (state) => state.connectionState.status === "connected"
  );
  const spec = resolveDisplayPageRuntimeRefreshSpec(pageKey, {
    dependencyKey: options?.dependencyKey
  });

  const runtime = useRuntimeRefreshLifecycle<DisplayStoryPayloadByPageId[PageKey]>({
    enabled: (options?.enabled ?? true) || (typeof window !== "undefined" && window.location.pathname.startsWith("/display-pages/editor")),
    initialPayload: options?.initialPayload,
    load: () => loadDisplayStoryRuntimePayload(pageKey),
    refreshKey: spec.refreshKey,
    shouldRefresh: (event) => spec.refreshScopes.includes(event.scope)
  });
  const isFactoryCircuit =
    pageKey === "factory-circuit" || pageKey === "factory-circuit-guanyin";
  const factoryPayload = isFactoryCircuit
    ? runtime.payload as FactoryCircuitStoryPayload | null
    : null;
  if (factoryPayload !== receivedFactoryPayloadRef.current) {
    receivedFactoryPayloadRef.current = factoryPayload;
    receivedAtMonotonicMsRef.current =
      typeof performance === "undefined" ? 0 : performance.now();
  }
  const resolvedPayload = useMemo(() => {
    if (!factoryPayload || isSocketConnected || !factoryPayload.freshnessPolicy) {
      return runtime.payload;
    }
    const monotonicNow =
      typeof performance === "undefined"
        ? receivedAtMonotonicMsRef.current
        : performance.now();
    return advanceFactoryCircuitStoryWhileOffline({
      elapsedMonotonicMs: Math.max(
        0,
        monotonicNow - receivedAtMonotonicMsRef.current
      ),
      payload: factoryPayload,
      timeSyncState: appTime.state
    }) as DisplayStoryPayloadByPageId[PageKey];
  }, [
    appTime.nowEpochMs,
    appTime.state,
    factoryPayload,
    isSocketConnected,
    runtime.payload
  ]);

  return {
    ...runtime,
    payload: resolvedPayload
  };
}
