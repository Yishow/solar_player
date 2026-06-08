import { useCallback, useEffect, useRef } from "react";
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
import { useShellDecorations } from "../hooks/useShellDecorations";
import { useScreenWakeLock } from "../hooks/useScreenWakeLock";
import { useDisplayTransition } from "../hooks/displayTransition";
import { shouldRedirectToOffline } from "./offlineRouting";
import { resolvePlaybackRotationEnabled } from "./playbackRotationFreeze";
import type { ShellBootstrap } from "./shellBootstrap";

export function LayoutShell({
  initialBrandView,
  initialShellBootstrap
}: {
  initialBrandView?: BrandView;
  initialShellBootstrap?: ShellBootstrap;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const brandView = useBrandAssets(initialShellBootstrap?.brandView ?? initialBrandView);
  const registry = useDisplayPageRegistry();
  const { isHydrated, status } = useMqttStatus(initialShellBootstrap?.mqttStatus);
  const routeMeta = resolvePlaybackRouteMeta(location.pathname, registry.pages);
  const playbackEntries = buildPlaybackFooterEntries(registry.pages);
  const headerWeatherMeta = useHeaderWeatherMeta(initialShellBootstrap?.weatherContract);
  const shellDecorations = useShellDecorations();
  const headerConnectionMeta = resolveHeaderConnectionMeta({
    connected: status.connected,
    reason: status.reason,
    isHydrated
  });
  // 穩定 forwarder：usePageRotation 需要 onRouteChange，但過場 handler 需要 controller.settings，
  // 兩者互為依賴。forwarder 讀 ref 打破循環，實際 handler 在 controller 建立後回填。
  const routeChangeHandlerRef = useRef<(route: string) => void>(() => {});
  const forwardRouteChange = useCallback((route: string) => {
    routeChangeHandlerRef.current(route);
  }, []);
  const controller = usePageRotation({
    currentPath: location.pathname,
    onRouteChange: forwardRouteChange,
    routeRotationEnabled: resolvePlaybackRotationEnabled({
      isPlaybackGroup: routeMeta?.group === "playback",
      search: location.search
    })
  });
  const navigateReplace = useCallback(
    (route: string) => {
      navigate(route, { replace: true });
    },
    [navigate]
  );
  const transition = useDisplayTransition({
    currentPath: location.pathname,
    navigate: navigateReplace,
    transitionSpeed: controller.settings?.transitionSpeed,
    transitionType: controller.settings?.transitionType
  });
  routeChangeHandlerRef.current = transition.onRouteChange;
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
      brightness={controller.settings?.brightness}
      orientation={controller.settings?.orientation}
      header={
        <AppHeader
          brandView={brandView}
          decorationObjects={shellDecorations.headerObjects}
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
          decorationObjects={shellDecorations.footerObjects}
          playbackEntries={playbackEntries}
          resolvedPlaybackRouteMeta={routeMeta}
        />
      }
    >
      <div
        className="display-transition"
        data-phase={transition.phase}
        data-transition={transition.transitionMode}
        key={location.pathname}
        onAnimationEnd={transition.onInAnimationEnd}
        style={transition.transitionVars}
      >
        <PlaybackErrorBoundary>
          <Outlet />
        </PlaybackErrorBoundary>
      </div>
    </DisplayCanvas>
  );
}

export function LayoutShellRoute() {
  const initialShellBootstrap = useLoaderData() as ShellBootstrap;
  return <LayoutShell initialShellBootstrap={initialShellBootstrap} />;
}
