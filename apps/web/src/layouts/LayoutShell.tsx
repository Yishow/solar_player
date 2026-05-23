import { useEffect } from "react";
import { Outlet, useLoaderData, useLocation, useNavigate } from "react-router-dom";
import { buildPlaybackFooterEntries, resolvePlaybackRouteMeta } from "../app/playbackRouteMeta";
import { AppFooterNav } from "../components/AppFooterNav";
import { AppHeader } from "../components/AppHeader";
import { DisplayCanvas } from "../components/DisplayCanvas";
import { PlaybackErrorBoundary } from "../components/PlaybackErrorBoundary";
import { resolveHeaderConnectionMeta } from "../components/headerConnectionMeta";
import { useBrandAssets, type BrandView } from "../hooks/useBrandAssets";
import { useDisplayClientHeartbeat } from "../hooks/useDisplayClientHeartbeat";
import { useHeaderWeatherMeta } from "../hooks/useHeaderWeatherMeta";
import { useDisplayPageRegistry } from "../hooks/useDisplayPageRegistry";
import { useMqttStatus } from "../hooks/useMqttStatus";
import { usePageRotation } from "../hooks/usePageRotation";
import { usePlaybackWatchdog } from "../hooks/usePlaybackWatchdog";
import { useScreenWakeLock } from "../hooks/useScreenWakeLock";
import { shouldRedirectToOffline } from "./offlineRouting";

export function LayoutShell({ initialBrandView }: { initialBrandView?: BrandView }) {
  const location = useLocation();
  const navigate = useNavigate();
  const brandView = useBrandAssets(initialBrandView);
  const registry = useDisplayPageRegistry();
  const { isHydrated, status } = useMqttStatus();
  const routeMeta = resolvePlaybackRouteMeta(location.pathname, registry.pages);
  const playbackEntries = buildPlaybackFooterEntries(registry.pages);
  const headerWeatherMeta = useHeaderWeatherMeta();
  const headerConnectionMeta = resolveHeaderConnectionMeta({
    connected: status.connected,
    reason: status.reason,
    isHydrated
  });
  const controller = usePageRotation({
    currentPath: location.pathname,
    onRouteChange: (route) => {
      navigate(route, { replace: true });
    },
    routeRotationEnabled: routeMeta?.group === "playback"
  });
  useDisplayClientHeartbeat({
    isIdle: controller.isIdle,
    isPlaying: controller.isPlaying,
    pageKey: controller.currentPage?.pageKey ?? null,
    route: location.pathname
  });
  usePlaybackWatchdog({
    currentPageKey: controller.currentPage?.pageKey ?? null,
    expectedDurationMs: (controller.currentPage?.durationSeconds ?? 0) * 1000,
    isPlaying: controller.isPlaying,
    playablePageCount: controller.pages.length
  });
  useScreenWakeLock({
    enabled: true
  });

  useEffect(() => {
    if (
      !shouldRedirectToOffline({
        isHydrated,
        pathname: location.pathname,
        rotation: {
          fallbackRoute: controller.fallbackRoute,
          hasPlayablePages: controller.pages.length > 0
        },
        routeMeta,
        status
      })
    ) {
      return;
    }

    navigate("/offline", {
      replace: true,
      state: {
        returnTo: location.pathname
      }
    });
  }, [
    controller.fallbackRoute,
    controller.pages.length,
    isHydrated,
    location.pathname,
    navigate,
    routeMeta,
    status.connected,
    status.reason
  ]);

  return (
    <DisplayCanvas
      header={
        <AppHeader
          brandView={brandView}
          meta={{
            status: headerConnectionMeta.status,
            statusLabel: headerConnectionMeta.label,
            weather: headerWeatherMeta
          }}
        />
      }
      footer={
        <AppFooterNav
          brandView={brandView}
          playbackEntries={playbackEntries}
          resolvedPlaybackRouteMeta={routeMeta}
        />
      }
    >
      <PlaybackErrorBoundary>
        <Outlet />
      </PlaybackErrorBoundary>
    </DisplayCanvas>
  );
}

export function LayoutShellRoute() {
  const initialBrandView = useLoaderData() as BrandView;
  return <LayoutShell initialBrandView={initialBrandView} />;
}
