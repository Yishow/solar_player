import type { HeaderWeatherMeta, WeatherHeaderContract } from "@solar-display/shared";
import { useEffect, useState } from "react";
import { resolveHeaderWeatherMeta } from "../components/headerWeatherMeta";
import { getHeaderWeatherContract } from "../services/api";

export async function loadHeaderWeatherContract(
  loadContract: () => Promise<WeatherHeaderContract> = getHeaderWeatherContract
) {
  return loadContract();
}

export function useHeaderWeatherMeta(initialContract?: WeatherHeaderContract | null): HeaderWeatherMeta {
  const [contract, setContract] = useState<WeatherHeaderContract | null>(initialContract ?? null);
  const [isHydrated, setIsHydrated] = useState(initialContract !== undefined);

  useEffect(() => {
    let active = true;

    const bootstrapWeather = async () => {
      try {
        const nextContract = await loadHeaderWeatherContract();
        if (!active) {
          return;
        }

        setContract(nextContract);
      } catch {
        if (!active) {
          return;
        }

        setContract(null);
      } finally {
        if (active) {
          setIsHydrated(true);
        }
      }
    };

    void bootstrapWeather();

    return () => {
      active = false;
    };
  }, []);

  return resolveHeaderWeatherMeta({
    current: contract?.current ?? null,
    isHydrated,
    settings: contract?.settings ?? null
  });
}
