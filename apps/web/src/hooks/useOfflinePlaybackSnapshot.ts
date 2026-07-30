import type {
  DisplayPlaybackRuntimeResponse,
  FreshnessPolicy
} from "@solar-display/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  OFFLINE_PLAYBACK_SCHEMA_VERSION,
  createBrowserOfflinePlaybackRepository,
  type OfflinePlaybackRepository,
  type OfflinePlaybackSnapshot
} from "../services/offlinePlaybackStore";

export function resolveOfflineProfileVersion(
  runtime: DisplayPlaybackRuntimeResponse
) {
  return runtime.profileRollout.appliedVersion;
}

export function createOfflinePlaybackSnapshot(input: {
  appRelease: string;
  freshnessPolicy: FreshnessPolicy;
  runtime: DisplayPlaybackRuntimeResponse;
  savedAtServerEpoch: number;
}): OfflinePlaybackSnapshot | null {
  const profileVersion = resolveOfflineProfileVersion(input.runtime);
  if (profileVersion === null) {
    return null;
  }
  return {
    appRelease: input.appRelease,
    freshnessPolicy: input.freshnessPolicy,
    metricSnapshots: [],
    profileVersion,
    runtime: input.runtime,
    savedAtServerEpoch: input.savedAtServerEpoch,
    schemaVersion: OFFLINE_PLAYBACK_SCHEMA_VERSION,
    siteScope: input.runtime.context.siteScope
  };
}

export function useOfflinePlaybackSnapshot(options: {
  repository?: OfflinePlaybackRepository;
} = {}) {
  const repository = useMemo(
    () => options.repository ?? createBrowserOfflinePlaybackRepository(),
    [options.repository]
  );
  const [snapshot, setSnapshot] = useState<OfflinePlaybackSnapshot | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void repository.read().then((value) => {
      if (!cancelled) {
        setSnapshot(value);
        setHydrated(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [repository]);

  const persist = useCallback(async (value: OfflinePlaybackSnapshot) => {
    await repository.commit(value);
    setSnapshot(value);
  }, [repository]);

  return {
    hydrated,
    persist,
    snapshot
  };
}
