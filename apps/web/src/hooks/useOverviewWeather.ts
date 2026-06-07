import { useEffect, useState } from "react";
import type { WeatherCurrentSnapshot } from "@solar-display/shared";
import { getHeaderWeatherContract } from "../services/api";

/**
 * Fetches the current weather snapshot for Overview density widgets.
 * On any failure the snapshot stays undefined so the weather card falls back
 * silently instead of breaking the playback surface.
 */
export function useOverviewWeather(enabled: boolean): WeatherCurrentSnapshot | undefined {
  const [snapshot, setSnapshot] = useState<WeatherCurrentSnapshot | undefined>(undefined);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let active = true;

    const load = async () => {
      try {
        const contract = await getHeaderWeatherContract();
        if (active) {
          setSnapshot(contract.current);
        }
      } catch {
        if (active) {
          setSnapshot(undefined);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [enabled]);

  return snapshot;
}
