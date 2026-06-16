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
import { BrandAssets } from "../pages/BrandAssets";
import { CircuitSettings, loadCircuitSettingsRoute } from "../pages/CircuitSettings";
import { DataSourceSettings, loadDataSourceSettingsRoute } from "../pages/DataSourceSettings";
import { DeviceStatus, loadDeviceStatusRoute } from "../pages/DeviceStatus";
import { DisplayPagesEditorRoute, loadDisplayPagesEditorRoute } from "../pages/DisplayPagesEditor/runtime";
import { EnergyHistory } from "../pages/EnergyHistory";
import { EnergyTrend } from "../pages/EnergyTrend";
import { ImageManagement, loadImageManagementRoute } from "../pages/ImageManagement";
import { MqttSettings, loadMqttSettingsRoute } from "../pages/MqttSettings";
import { OfflineError } from "../pages/OfflineError";
import { PlaybackSettings, loadPlaybackSettingsRoute } from "../pages/PlaybackSettings";
import { SlideshowPreview } from "../pages/SlideshowPreview";
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
        element: <EnergyTrend />
      },
      {
        path: "brand",
        loader: createManagementRouteLoader("brand"),
        element: <BrandAssets />
      },
      {
        path: "settings/playback",
        loader: createManagementRouteLoader("settings/playback", loadPlaybackSettingsRoute),
        hydrateFallbackElement: <></>,
        element: <PlaybackSettings />
      },
      {
        path: "settings/data-source",
        loader: createManagementRouteLoader("settings/data-source", loadDataSourceSettingsRoute),
        hydrateFallbackElement: <></>,
        element: <DataSourceSettings />
      },
      {
        path: "settings/assets",
        loader: createManagementRouteLoader("settings/assets"),
        element: <Navigate to="/display-pages/editor?workspace=assets" replace />
      },
      {
        path: "settings/images",
        loader: createManagementRouteLoader("settings/images", loadImageManagementRoute),
        hydrateFallbackElement: <></>,
        element: <ImageManagement />
      },
      {
        path: "settings/mqtt",
        loader: createManagementRouteLoader("settings/mqtt", loadMqttSettingsRoute),
        hydrateFallbackElement: <></>,
        element: <MqttSettings />
      },
      {
        path: "settings/circuits",
        loader: createManagementRouteLoader("settings/circuits", loadCircuitSettingsRoute),
        hydrateFallbackElement: <></>,
        element: <CircuitSettings />
      },
      {
        path: "history",
        loader: createManagementRouteLoader("history"),
        element: <EnergyHistory />
      },
      {
        path: "offline",
        loader: createManagementRouteLoader("offline"),
        element: <OfflineError />
      },
      {
        path: "slideshow-preview",
        loader: createManagementRouteLoader("slideshow-preview"),
        element: <SlideshowPreview />
      },
      {
        path: "device-status",
        loader: createManagementRouteLoader("device-status", loadDeviceStatusRoute),
        hydrateFallbackElement: <></>,
        element: <DeviceStatus />
      }
    ]
  },
  {
    path: "display-pages/editor",
    loader: createManagementRouteLoader("display-pages/editor", loadDisplayPagesEditorRoute),
    hydrateFallbackElement: <></>,
    element: <DisplayPagesEditorRoute />
  },
  {
    path: "shell-decorations/editor",
    loader: createManagementRouteLoader("shell-decorations/editor"),
    element: <Navigate to="/display-pages/editor?workspace=shell" replace />
  }
]);
