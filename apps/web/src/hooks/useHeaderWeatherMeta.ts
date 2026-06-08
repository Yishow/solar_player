import type { DisplaySyncEventScope, HeaderWeatherMeta, WeatherHeaderContract } from "@solar-display/shared";
import { useCallback, useEffect, useState } from "react";
import { resolveHeaderWeatherMeta } from "../components/headerWeatherMeta";
import { getHeaderWeatherContract } from "../services/api";
import { useDisplaySyncRefresh } from "./useDisplaySyncRefresh";

const HEADER_WEATHER_SYNC_SCOPES: readonly DisplaySyncEventScope[] = ["weather"];

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
      setContract(await loadHeaderWeatherContract());
    } catch {
      setContract(null);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    void refreshWeather();
  }, [refreshWeather]);

  // Re-pull the persisted contract whenever weather settings are saved so the
  // shell header reflects the new selection without a manual reload.
  useDisplaySyncRefresh(refreshWeather, HEADER_WEATHER_SYNC_SCOPES);

  return resolveHeaderWeatherMeta({
    current: contract?.current ?? null,
    isHydrated,
    settings: contract?.settings ?? null
  });
}
