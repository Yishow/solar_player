import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { buildPlaybackFooterEntries, resolvePlaybackRouteMeta } from "../app/playbackRouteMeta";
import { AppFooterNav } from "../components/AppFooterNav";
import { AppHeader } from "../components/AppHeader";
import { DisplayCanvas } from "../components/DisplayCanvas";
import { useDisplayPageRegistry } from "../hooks/useDisplayPageRegistry";
import { useMqttStatus } from "../hooks/useMqttStatus";
import { usePageRotation } from "../hooks/usePageRotation";
import { shouldRedirectToOffline } from "./offlineRouting";

export function LayoutShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const registry = useDisplayPageRegistry();
  const { isHydrated, status } = useMqttStatus();
  const routeMeta = resolvePlaybackRouteMeta(location.pathname, registry.pages);
  const playbackEntries = buildPlaybackFooterEntries(registry.pages);
  const controller = usePageRotation({
    currentPath: location.pathname,
    onRouteChange: (route) => {
      navigate(route, { replace: true });
    },
    routeRotationEnabled: routeMeta?.group === "playback"
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
      header={<AppHeader />}
      footer={<AppFooterNav playbackEntries={playbackEntries} resolvedPlaybackRouteMeta={routeMeta} />}
    >
      <Outlet />
    </DisplayCanvas>
  );
}
