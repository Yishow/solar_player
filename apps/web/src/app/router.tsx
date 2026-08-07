import { Navigate, createBrowserRouter, redirect, type LoaderFunctionArgs } from "react-router-dom";
import {
  getConfiguredHiddenManagementRoutePaths,
  getManagementRouteRedirectPath,
  isManagementRouteHidden
} from "./managementRouteVisibility";
import { routeMetaList } from "./routeMeta";
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
        loader: createLazyManagementRouteLoader(
          "settings/data-source",
          async () => {
            const { loadDataSourceSettingsRoute } = await import("../pages/DataSourceSettings");
            return loadDataSourceSettingsRoute;
          }
        ),
        hydrateFallbackElement: <></>,
        lazy: async () => {
          const { DataSourceSettings } = await import("../pages/DataSourceSettings");
          return { Component: DataSourceSettings };
        }
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
        loader: createLazyManagementRouteLoader(
          "settings/mqtt",
          async () => {
            const { loadMqttSettingsRoute } = await import("../pages/MqttSettings");
            return loadMqttSettingsRoute;
          }
        ),
        hydrateFallbackElement: <></>,
        lazy: async () => {
          const { MqttSettings } = await import("../pages/MqttSettings");
          return { Component: MqttSettings };
        }
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
