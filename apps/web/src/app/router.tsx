import { Navigate, createBrowserRouter, redirect, type LoaderFunctionArgs } from "react-router-dom";
import {
  getConfiguredHiddenManagementRoutePaths,
  getManagementRouteRedirectPath,
  isManagementRouteHidden
} from "./managementRouteVisibility";
import { routeMetaList } from "./routeMeta";
import { resolveDataHubCompatibilityRedirect } from "./dataHubCompatibility";
import { LayoutShellRoute } from "../layouts/LayoutShell";
import { ManagementShellRoute } from "../layouts/ManagementShell";
import { loadShellBootstrap } from "../layouts/shellBootstrap";
import { DisplayPageRouteHost, loadDisplayPageRoute } from "../pages/shared/displayPageRouteHost";

type ManagementRouteLoader = (args: LoaderFunctionArgs) => unknown | Promise<unknown>;

const hiddenManagementRoutePaths = getConfiguredHiddenManagementRoutePaths();
const managementRouteRedirectPath = getManagementRouteRedirectPath(routeMetaList, hiddenManagementRoutePaths);

function createManagementRouteLoader(path: string, routeLoader?: ManagementRouteLoader): ManagementRouteLoader {
  const routePath = path.startsWith("/") ? path : `/${path}`;

  return async (args) => {
    if (isManagementRouteHidden(routePath, hiddenManagementRoutePaths)) {
      throw redirect(managementRouteRedirectPath);
    }

    return routeLoader ? routeLoader(args) : null;
  };
}

function createLazyManagementRouteLoader(
  path: string,
  loadRouteLoader: () => Promise<ManagementRouteLoader>
): ManagementRouteLoader {
  return createManagementRouteLoader(path, async (args) => {
    const routeLoader = await loadRouteLoader();
    return routeLoader(args);
  });
}

function createDataHubCompatibilityRedirectLoader(path: string): ManagementRouteLoader {
  return createManagementRouteLoader(path, ({ request }) => {
    const target = resolveDataHubCompatibilityRedirect(request.url);
    if (!target) {
      throw new Error(`Missing Data Hub compatibility target for /${path}`);
    }
    throw redirect(target);
  });
}

export const router = createBrowserRouter([
  {
    index: true,
    path: "/",
    element: <Navigate to="/overview" replace />
  },
  {
    element: <LayoutShellRoute />,
    loader: loadShellBootstrap,
    hydrateFallbackElement: <></>,
    children: [
      {
        path: ":displayPageSlug",
        loader: loadDisplayPageRoute,
        hydrateFallbackElement: <></>,
        element: <DisplayPageRouteHost />
      }
    ]
  },
  {
    element: <ManagementShellRoute />,
    loader: loadShellBootstrap,
    hydrateFallbackElement: <></>,
    children: [
      {
        path: "trends",
        loader: createManagementRouteLoader("trends"),
        lazy: async () => {
          const { EnergyTrend } = await import("../pages/EnergyTrend");
          return { Component: EnergyTrend };
        }
      },
      {
        path: "brand",
        loader: createManagementRouteLoader("brand"),
        lazy: async () => {
          const { BrandAssets } = await import("../pages/BrandAssets");
          return { Component: BrandAssets };
        }
      },
      {
        path: "settings/playback",
        loader: createLazyManagementRouteLoader(
          "settings/playback",
          async () => {
            const { loadPlaybackSettingsRoute } = await import("../pages/PlaybackSettings");
            return loadPlaybackSettingsRoute;
          }
        ),
        hydrateFallbackElement: <></>,
        lazy: async () => {
          const { PlaybackSettings } = await import("../pages/PlaybackSettings");
          return { Component: PlaybackSettings };
        }
      },
      {
        path: "settings/security",
        loader: createManagementRouteLoader("settings/security"),
        lazy: async () => {
          const { SecuritySettings } = await import("../pages/SecuritySettings");
          return { Component: SecuritySettings };
        }
      },
      {
        path: "settings/playback-profiles",
        loader: createLazyManagementRouteLoader(
          "settings/playback-profiles",
          async () => {
            const { loadPlaybackProfilesRoute } = await import("../pages/PlaybackProfiles");
            return loadPlaybackProfilesRoute;
          }
        ),
        hydrateFallbackElement: <></>,
        lazy: async () => {
          const { PlaybackProfiles } = await import("../pages/PlaybackProfiles");
          return { Component: PlaybackProfiles };
        }
      },
      {
        path: "settings/data-source",
        loader: createDataHubCompatibilityRedirectLoader("settings/data-source")
      },
      {
        path: "settings/data-hub",
        loader: createManagementRouteLoader("settings/data-hub"),
        lazy: async () => {
          const { DataHub } = await import("../pages/DataHub");
          return { Component: DataHub };
        },
        children: [
          {
            index: true,
            lazy: async () => {
              const { DataHubTaskHome } = await import("../pages/DataHub/TaskHome");
              return { Component: DataHubTaskHome };
            }
          },
          {
            path: "connections",
            loader: createLazyManagementRouteLoader(
              "settings/data-hub/connections",
              async () => {
                const { loadMqttConnectionsRoute } = await import("../pages/MqttSettings");
                return loadMqttConnectionsRoute;
              }
            ),
            hydrateFallbackElement: <></>,
            lazy: async () => {
              const { MqttConnections } = await import("../pages/MqttSettings");
              return { Component: MqttConnections };
            }
          },
          {
            path: "sources",
            loader: createLazyManagementRouteLoader(
              "settings/data-hub/sources",
              async () => {
                const { loadDataHubSourcesRoute } = await import("../pages/DataHub/SourcesModel");
                return loadDataHubSourcesRoute;
              }
            ),
            hydrateFallbackElement: <></>,
            lazy: async () => {
              const { DataHubSources } = await import("../pages/DataHub/Sources");
              return { Component: DataHubSources };
            }
          },
          {
            path: "sources/operations",
            loader: createLazyManagementRouteLoader(
              "settings/data-hub/sources/operations",
              async () => {
                const { loadMqttOperationsRoute } = await import("../pages/MqttSettings");
                return loadMqttOperationsRoute;
              }
            ),
            hydrateFallbackElement: <></>,
            lazy: async () => {
              const { MqttOperations } = await import("../pages/MqttSettings");
              return { Component: MqttOperations };
            }
          },
          {
            path: "metrics",
            loader: createLazyManagementRouteLoader(
              "settings/data-hub/metrics",
              async () => {
                const { loadDataHubMetricsRoute } = await import("../pages/DataHub/MetricsModel");
                return loadDataHubMetricsRoute;
              }
            ),
            hydrateFallbackElement: <></>,
            lazy: async () => {
              const { DataHubMetrics } = await import("../pages/DataHub/Metrics");
              return { Component: DataHubMetrics };
            }
          },
          {
            path: "derived",
            loader: createDataHubCompatibilityRedirectLoader("settings/data-hub/derived")
          },
          {
            path: "usage",
            loader: createDataHubCompatibilityRedirectLoader("settings/data-hub/usage")
          },
          {
            path: "diagnostics",
            loader: createDataHubCompatibilityRedirectLoader("settings/data-hub/diagnostics")
          },
          {
            path: "diagnostics/operations",
            loader: createDataHubCompatibilityRedirectLoader("settings/data-hub/diagnostics/operations")
          },
          {
            path: "external",
            loader: createLazyManagementRouteLoader(
              "settings/data-hub/external",
              async () => {
                const { loadDataHubWeatherRoute } = await import("../pages/DataHub/WeatherModel");
                return loadDataHubWeatherRoute;
              }
            ),
            hydrateFallbackElement: <></>,
            lazy: async () => {
              const { DataHubWeather } = await import("../pages/DataHub/Weather");
              return { Component: DataHubWeather };
            }
          }
        ]
      },
      {
        path: "settings/assets",
        loader: createManagementRouteLoader("settings/assets"),
        element: <Navigate to="/display-pages/editor?workspace=assets" replace />
      },
      {
        path: "settings/images",
        loader: createLazyManagementRouteLoader(
          "settings/images",
          async () => {
            const { loadImageManagementRoute } = await import("../pages/ImageManagement");
            return loadImageManagementRoute;
          }
        ),
        hydrateFallbackElement: <></>,
        lazy: async () => {
          const { ImageManagement } = await import("../pages/ImageManagement");
          return { Component: ImageManagement };
        }
      },
      {
        path: "settings/mqtt",
        loader: createDataHubCompatibilityRedirectLoader("settings/mqtt")
      },
      {
        path: "settings/circuits",
        loader: createLazyManagementRouteLoader(
          "settings/circuits",
          async () => {
            const { loadCircuitSettingsRoute } = await import("../pages/CircuitSettings");
            return loadCircuitSettingsRoute;
          }
        ),
        hydrateFallbackElement: <></>,
        lazy: async () => {
          const { CircuitSettings } = await import("../pages/CircuitSettings");
          return { Component: CircuitSettings };
        }
      },
      {
        path: "history",
        loader: createManagementRouteLoader("history"),
        lazy: async () => {
          const { EnergyHistory } = await import("../pages/EnergyHistory");
          return { Component: EnergyHistory };
        }
      },
      {
        path: "offline",
        loader: createManagementRouteLoader("offline"),
        lazy: async () => {
          const { OfflineError } = await import("../pages/OfflineError");
          return { Component: OfflineError };
        }
      },
      {
        path: "slideshow-preview",
        loader: createManagementRouteLoader("slideshow-preview"),
        lazy: async () => {
          const { SlideshowPreview } = await import("../pages/SlideshowPreview");
          return { Component: SlideshowPreview };
        }
      },
      {
        path: "device-status",
        loader: createLazyManagementRouteLoader(
          "device-status",
          async () => {
            const { loadDeviceStatusRoute } = await import("../pages/DeviceStatus");
            return loadDeviceStatusRoute;
          }
        ),
        hydrateFallbackElement: <></>,
        lazy: async () => {
          const { DeviceStatus } = await import("../pages/DeviceStatus");
          return { Component: DeviceStatus };
        }
      },
      {
        path: "device-fleet",
        loader: createLazyManagementRouteLoader(
          "device-fleet",
          async () => {
            const { loadDeviceFleetRoute } = await import("../pages/DeviceFleet/route");
            return loadDeviceFleetRoute;
          }
        ),
        hydrateFallbackElement: <></>,
        lazy: async () => {
          const { DeviceFleet } = await import("../pages/DeviceFleet");
          return { Component: DeviceFleet };
        }
      }
    ]
  },
  {
    path: "display-pages/editor",
    loader: createLazyManagementRouteLoader(
      "display-pages/editor",
      async () => {
        const { loadDisplayPagesEditorRoute } = await import("../pages/DisplayPagesEditor/runtime");
        return loadDisplayPagesEditorRoute;
      }
    ),
    hydrateFallbackElement: <></>,
    lazy: async () => {
      const { DisplayPagesEditorRoute } = await import("../pages/DisplayPagesEditor/runtime");
      return { Component: DisplayPagesEditorRoute };
    }
  },
  {
    path: "shell-decorations/editor",
    loader: createManagementRouteLoader("shell-decorations/editor"),
    element: <Navigate to="/display-pages/editor?workspace=shell" replace />
  }
]);
