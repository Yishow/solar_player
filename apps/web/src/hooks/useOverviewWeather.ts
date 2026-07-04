import { useCallback, useEffect, useState } from "react";
import type { WeatherCurrentSnapshot, WeatherHeaderContract } from "@solar-display/shared";
import { getHeaderWeatherContract } from "../services/api";
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
      setContract(nextContract);
    } catch {
      setContract(null);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const intervalMinutes = contract?.settings?.updateIntervalMinutes ?? 30;
    const isEnabled = enabled && (contract?.settings?.enabled ?? false);
    return setupWeatherPolling(isEnabled, intervalMinutes, load);
  }, [enabled, load, contract?.settings?.updateIntervalMinutes, contract?.settings?.enabled]);

  return contract?.current ?? undefined;
}
