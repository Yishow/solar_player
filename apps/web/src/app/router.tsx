import { Navigate, createBrowserRouter } from "react-router-dom";
import { LayoutShellRoute } from "../layouts/LayoutShell";
import { ManagementShellRoute } from "../layouts/ManagementShell";
import { loadShellBootstrap } from "../layouts/shellBootstrap";
import { BrandAssets } from "../pages/BrandAssets";
import { CircuitSettings, loadCircuitSettingsRoute } from "../pages/CircuitSettings";
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
        element: <EnergyTrend />
      },
      {
        path: "brand",
        element: <BrandAssets />
      },
      {
        path: "settings/playback",
        loader: loadPlaybackSettingsRoute,
        hydrateFallbackElement: <></>,
        element: <PlaybackSettings />
      },
      {
        path: "settings/assets",
        element: <Navigate to="/display-pages/editor?workspace=assets" replace />
      },
      {
        path: "settings/images",
        loader: loadImageManagementRoute,
        hydrateFallbackElement: <></>,
        element: <ImageManagement />
      },
      {
        path: "settings/mqtt",
        loader: loadMqttSettingsRoute,
        hydrateFallbackElement: <></>,
        element: <MqttSettings />
      },
      {
        path: "settings/circuits",
        loader: loadCircuitSettingsRoute,
        hydrateFallbackElement: <></>,
        element: <CircuitSettings />
      },
      {
        path: "history",
        element: <EnergyHistory />
      },
      {
        path: "offline",
        element: <OfflineError />
      },
      {
        path: "slideshow-preview",
        element: <SlideshowPreview />
      },
      {
        path: "device-status",
        loader: loadDeviceStatusRoute,
        hydrateFallbackElement: <></>,
        element: <DeviceStatus />
      }
    ]
  },
  {
    path: "display-pages/editor",
    loader: loadDisplayPagesEditorRoute,
    hydrateFallbackElement: <></>,
    element: <DisplayPagesEditorRoute />
  },
  {
    path: "shell-decorations/editor",
    element: <Navigate to="/display-pages/editor?workspace=shell" replace />
  }
]);
