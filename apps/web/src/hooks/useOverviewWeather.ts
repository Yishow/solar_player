import { useCallback, useEffect, useState } from "react";
import type { WeatherCurrentSnapshot, WeatherHeaderContract } from "@solar-display/shared";
import { getHeaderWeatherContract } from "../services/api";
import {
  resolveWeatherContractAfterRefresh,
  shouldPollWeatherContract
} from "./useHeaderWeatherMeta";
import { setupWeatherPolling } from "./weatherPolling.js";

/**
 * Fetches the current weather snapshot for Overview density widgets.
 * On any failure the snapshot stays undefined so the weather card falls back
 * silently instead of breaking the playback surface.
 */
export function useOverviewWeather(enabled: boolean): WeatherCurrentSnapshot | undefined {
  const [contract, setContract] = useState<WeatherHeaderContract | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const nextContract = await getHeaderWeatherContract();
      setContract((current) => resolveWeatherContractAfterRefresh(current, nextContract));
    } catch {
      setContract((current) => resolveWeatherContractAfterRefresh(current, null));
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const intervalMinutes = contract?.settings?.updateIntervalMinutes ?? 30;
    return setupWeatherPolling(shouldPollWeatherContract(enabled, contract), intervalMinutes, load);
  }, [enabled, load, contract, contract?.settings?.updateIntervalMinutes]);

  return contract?.current ?? undefined;
}
