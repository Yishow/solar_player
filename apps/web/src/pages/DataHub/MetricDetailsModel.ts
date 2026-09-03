import type { MetricScope } from "@solar-display/shared";
import {
  fetchDataHubDiagnosticsModel,
  type DataHubDiagnosticsModel
} from "./DiagnosticsModel";
import {
  fetchDataHubUsageModel,
  type DataHubUsageModel
} from "./UsageModel";

export type MetricDetailsIdentity = {
  metricKey: string;
  metricScope: MetricScope;
};

export type MetricDetailsStatus = "idle" | "loading" | "ready" | "empty" | "error";

export type MetricDetailsSlice<T> = {
  errorMessage: string | null;
  model: T | null;
  status: MetricDetailsStatus;
};

export type MetricDetailsState = {
  diagnostics: MetricDetailsSlice<DataHubDiagnosticsModel>;
  diagnosticsLatencyMs: number | null;
  identity: MetricDetailsIdentity;
  usage: MetricDetailsSlice<DataHubUsageModel>;
};

export type MetricDetailsLoaders = {
  diagnostics: (requestUrl: string) => Promise<DataHubDiagnosticsModel | null>;
  now?: () => number;
  usage: (requestUrl: string) => Promise<DataHubUsageModel>;
};

export type MetricDetailsStore = {
  dispose: () => void;
  get: (identity: MetricDetailsIdentity) => MetricDetailsState;
  invalidate: (identity: MetricDetailsIdentity) => void;
  load: (identity: MetricDetailsIdentity) => void;
  subscribe: (listener: () => void) => () => void;
};

const defaultLoaders: MetricDetailsLoaders = {
  diagnostics: fetchDataHubDiagnosticsModel,
  usage: fetchDataHubUsageModel
};

function now() {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;
}

export function metricDetailsKey(identity: MetricDetailsIdentity) {
  return `${identity.metricScope}:${identity.metricKey}`;
}

export function buildMetricDetailsRequestUrl(identity: MetricDetailsIdentity) {
  const params = new URLSearchParams({
    metricKey: identity.metricKey,
    scope: identity.metricScope
  });
  const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
  return new URL(`/settings/data-hub/metrics?${params.toString()}`, origin).toString();
}

function idleSlice<T>(): MetricDetailsSlice<T> {
  return { errorMessage: null, model: null, status: "idle" };
}

function idleState(identity: MetricDetailsIdentity): MetricDetailsState {
  return {
    diagnostics: idleSlice<DataHubDiagnosticsModel>(),
    diagnosticsLatencyMs: null,
    identity,
    usage: idleSlice<DataHubUsageModel>()
  };
}

function loadingState(identity: MetricDetailsIdentity): MetricDetailsState {
  return {
    diagnostics: { errorMessage: null, model: null, status: "loading" },
    diagnosticsLatencyMs: null,
    identity,
    usage: { errorMessage: null, model: null, status: "loading" }
  };
}

function usageState(
  identity: MetricDetailsIdentity,
  model: DataHubUsageModel
): MetricDetailsSlice<DataHubUsageModel> {
  const usage = model.usage.filter((row) => row.metricKey === identity.metricKey);
  const scopedModel = usage.length === model.usage.length ? model : { ...model, usage };
  return {
    errorMessage: null,
    model: scopedModel,
    status: usage.length === 0 ? "empty" : "ready"
  };
}

function diagnosticsState(model: DataHubDiagnosticsModel | null): MetricDetailsSlice<DataHubDiagnosticsModel> {
  return {
    errorMessage: null,
    model,
    status: model === null || (model.nodes.length === 0 && model.edges.length === 0) ? "empty" : "ready"
  };
}

type CacheEntry = {
  generation: number;
  inFlight: boolean;
  state: MetricDetailsState;
};

export function createMetricDetailsStore(
  loaders: MetricDetailsLoaders = defaultLoaders
): MetricDetailsStore {
  const entries = new Map<string, CacheEntry>();
  const listeners = new Set<() => void>();
  let generation = 0;
  let disposed = false;

  const notify = () => {
    if (disposed) return;
    for (const listener of listeners) listener();
  };

  const get = (identity: MetricDetailsIdentity) => {
    const key = metricDetailsKey(identity);
    return entries.get(key)?.state ?? idleState(identity);
  };

  const update = (
    identity: MetricDetailsIdentity,
    entryGeneration: number,
    updater: (state: MetricDetailsState) => MetricDetailsState
  ) => {
    if (disposed) return;
    const key = metricDetailsKey(identity);
    const entry = entries.get(key);
    if (!entry || entry.generation !== entryGeneration) return;
    entry.state = updater(entry.state);
    notify();
  };

  const load = (identity: MetricDetailsIdentity) => {
    if (disposed) return;

    const key = metricDetailsKey(identity);
    const existing = entries.get(key);
    if (existing?.inFlight || existing) return;

    const entryGeneration = ++generation;
    const entry: CacheEntry = {
      generation: entryGeneration,
      inFlight: true,
      state: loadingState(identity)
    };
    entries.set(key, entry);
    notify();

    const requestUrl = buildMetricDetailsRequestUrl(identity);
    const diagnosticsStartedAt = (loaders.now ?? now)();
    const usagePromise = Promise.resolve().then(() => loaders.usage(requestUrl));
    const diagnosticsPromise = Promise.resolve().then(() => loaders.diagnostics(requestUrl));

    void usagePromise.then(
      (model) => update(identity, entryGeneration, (state) => ({
        ...state,
        usage: usageState(identity, model)
      })),
      (error) => update(identity, entryGeneration, (state) => ({
        ...state,
        usage: {
          errorMessage: errorMessage(error, "Usage 資料同步失敗。"),
          model: null,
          status: "error"
        }
      }))
    );

    void diagnosticsPromise.then(
      (model) => update(identity, entryGeneration, (state) => ({
        ...state,
        diagnostics: diagnosticsState(model),
        diagnosticsLatencyMs: Math.max(0, (loaders.now ?? now)() - diagnosticsStartedAt)
      })),
      (error) => update(identity, entryGeneration, (state) => ({
        ...state,
        diagnostics: {
          errorMessage: errorMessage(error, "Diagnostics 資料同步失敗。"),
          model: null,
          status: "error"
        },
        diagnosticsLatencyMs: Math.max(0, (loaders.now ?? now)() - diagnosticsStartedAt)
      }))
    );

    void Promise.allSettled([usagePromise, diagnosticsPromise]).then(() => {
      const current = entries.get(key);
      if (current && current.generation === entryGeneration) {
        current.inFlight = false;
      }
    });
  };

  const invalidate = (identity: MetricDetailsIdentity) => {
    if (disposed) return;
    entries.delete(metricDetailsKey(identity));
    notify();
  };

  const subscribe = (listener: () => void) => {
    if (disposed) return () => undefined;
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const dispose = () => {
    disposed = true;
    entries.clear();
    listeners.clear();
  };

  return { dispose, get, invalidate, load, subscribe };
}
