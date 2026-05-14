import { Navigate, createBrowserRouter } from "react-router-dom";
import { LayoutShell } from "../layouts/LayoutShell";
import { ManagementShell } from "../layouts/ManagementShell";
import { BrandAssets } from "../pages/BrandAssets";
import { CircuitSettings } from "../pages/CircuitSettings";
import { DeviceStatus } from "../pages/DeviceStatus";
import { EnergyHistory } from "../pages/EnergyHistory";
import { EnergyTrend } from "../pages/EnergyTrend";
import { FactoryCircuit } from "../pages/FactoryCircuit";
import { ImageManagement } from "../pages/ImageManagement";
import { Images } from "../pages/Images";
import { MqttSettings } from "../pages/MqttSettings";
import { OfflineError } from "../pages/OfflineError";
import { Overview } from "../pages/Overview";
import { PlaybackSettings } from "../pages/PlaybackSettings";
import { SlideshowPreview } from "../pages/SlideshowPreview";
import { Solar } from "../pages/Solar";
import { Sustainability } from "../pages/Sustainability";

export const router = createBrowserRouter([
  {
    index: true,
    path: "/",
    element: <Navigate to="/overview" replace />
  },
  {
    element: <LayoutShell />,
    children: [
      {
        path: "overview",
        element: <Overview />
      },
      {
        path: "solar",
        element: <Solar />
      },
      {
        path: "factory-circuit",
        element: <FactoryCircuit />
      },
      {
        path: "images",
        element: <Images />
      },
      {
        path: "sustainability",
        element: <Sustainability />
      }
    ]
  },
  {
    element: <ManagementShell />,
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
        element: <PlaybackSettings />
      },
      {
        path: "settings/images",
        element: <ImageManagement />
      },
      {
        path: "settings/mqtt",
        element: <MqttSettings />
      },
      {
        path: "settings/circuits",
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
        element: <DeviceStatus />
      }
    ]
  }
]);
