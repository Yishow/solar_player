import type { DisplaySyncEventScope, HeaderWeatherMeta, WeatherHeaderContract } from "@solar-display/shared";
import { useCallback, useEffect, useState } from "react";
import { resolveHeaderWeatherMeta } from "../components/headerWeatherMeta";
import { getHeaderWeatherContract } from "../services/api";
import { useDisplaySyncRefresh } from "./useDisplaySyncRefresh";
import { setupWeatherPolling } from "./weatherPolling.js";

const HEADER_WEATHER_SYNC_SCOPES: readonly DisplaySyncEventScope[] = ["weather"];

export function shouldPollWeatherContract(enabled: boolean, contract: WeatherHeaderContract | null) {
  return enabled && (contract === null || contract.settings.enabled);
}

export function resolveWeatherContractAfterRefresh(
  previous: WeatherHeaderContract | null,
  next: WeatherHeaderContract | null
) {
  return next ?? previous;
}

export async function loadHeaderWeatherContract(
  loadContract: () => Promise<WeatherHeaderContract> = getHeaderWeatherContract
) {
  return loadContract();
}

export function useHeaderWeatherMeta(initialContract?: WeatherHeaderContract | null): HeaderWeatherMeta {
  const [contract, setContract] = useState<WeatherHeaderContract | null>(initialContract ?? null);
  const [isHydrated, setIsHydrated] = useState(initialContract !== undefined);

  const refreshWeather = useCallback(async () => {
    try {
      const nextContract = await loadHeaderWeatherContract();
      setContract((current) => resolveWeatherContractAfterRefresh(current, nextContract));
    } catch {
      setContract((current) => resolveWeatherContractAfterRefresh(current, null));
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    void refreshWeather();
  }, [refreshWeather]);

  useEffect(() => {
    const intervalMinutes = contract?.settings?.updateIntervalMinutes ?? 30;
    return setupWeatherPolling(shouldPollWeatherContract(true, contract), intervalMinutes, refreshWeather);
  }, [refreshWeather, contract, contract?.settings?.updateIntervalMinutes]);

  // Re-pull the persisted contract whenever weather settings are saved so the
  // shell header reflects the new selection without a manual reload.
  useDisplaySyncRefresh(refreshWeather, HEADER_WEATHER_SYNC_SCOPES);

  return resolveHeaderWeatherMeta({
    current: contract?.current ?? null,
    isHydrated,
    settings: contract?.settings ?? null
  });
}
