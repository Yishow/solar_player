import type { WeatherHeaderContract } from "@solar-display/shared";
import { loadRuntimeBrandView, type BrandView } from "../hooks/useBrandAssets";
import { loadHeaderWeatherContract } from "../hooks/useHeaderWeatherMeta";
import { loadRuntimeMqttStatus } from "../hooks/useMqttStatus";
import type { MqttConnectionStatus } from "../services/socket";

export type ShellBootstrap = {
  brandView: BrandView;
  mqttStatus: MqttConnectionStatus | null;
  weatherContract: WeatherHeaderContract | null;
};

type ShellBootstrapLoaderOptions = {
  loadBrandView?: () => Promise<BrandView>;
  loadMqttStatus?: () => Promise<MqttConnectionStatus>;
  loadWeatherContract?: () => Promise<WeatherHeaderContract>;
};

export async function resolveShellBootstrap({
  loadBrandView = loadRuntimeBrandView,
  loadMqttStatus = loadRuntimeMqttStatus,
  loadWeatherContract = loadHeaderWeatherContract
}: ShellBootstrapLoaderOptions = {}): Promise<ShellBootstrap> {
  const [brandView, mqttStatus, weatherContract] = await Promise.all([
    loadBrandView(),
    loadMqttStatus().catch(() => null),
    loadWeatherContract().catch(() => null)
  ]);

  return {
    brandView,
    mqttStatus,
    weatherContract
  };
}

export function createShellBootstrapLoader(options: ShellBootstrapLoaderOptions = {}) {
  let cachedBootstrap: ShellBootstrap | null = null;
  let pendingBootstrap: Promise<ShellBootstrap> | null = null;

  return function loadCachedShellBootstrap() {
    if (cachedBootstrap) {
      return cachedBootstrap;
    }

    if (!pendingBootstrap) {
      pendingBootstrap = resolveShellBootstrap(options)
        .then((bootstrap) => {
          cachedBootstrap = bootstrap;
          return bootstrap;
        })
        .finally(() => {
          pendingBootstrap = null;
        });
    }

    return pendingBootstrap;
  };
}

export const loadShellBootstrap = createShellBootstrapLoader();
