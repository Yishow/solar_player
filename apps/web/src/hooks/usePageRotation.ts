import { useEffect } from "react";
import { useRef } from "react";
import { subscribeSocketEvent } from "../services/socket";
import { createDisplaySyncPlaybackReloadCoordinator } from "./displaySyncPlaybackReload";
import { resolvePlaybackRouteNavigation } from "./playbackRouteNavigation";
import { usePlaybackController } from "./usePlaybackController";

type UsePageRotationOptions = {
  currentPath?: string;
  onRouteChange?: (route: string) => void;
  routeRotationEnabled?: boolean;
  tickMs?: number;
};

export function usePageRotation(options: UsePageRotationOptions = {}) {
  const controller = usePlaybackController({
    currentPath: options.currentPath,
    tickMs: options.tickMs
  });
  const previousControllerRouteRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const coordinator = createDisplaySyncPlaybackReloadCoordinator({
      reloadPlayback: controller.reload
    });
    const unsubscribePlayback = subscribeSocketEvent("playback:settingsUpdated", () => {
      void controller.reload();
    });
    const unsubscribeDisplaySync = subscribeSocketEvent("display:sync", (event) => {
      coordinator.notify(event);
    });

    return () => {
      coordinator.dispose();
      unsubscribePlayback();
      unsubscribeDisplaySync();
    };
  }, [controller.reload]);

  useEffect(() => {
    if (previousControllerRouteRef.current === undefined) {
      previousControllerRouteRef.current = controller.currentPage?.route;
      return;
    }

    const nextRoute = resolvePlaybackRouteNavigation({
      controllerRoute: controller.currentPage?.route,
      currentPath: options.currentPath,
      previousControllerRoute: previousControllerRouteRef.current,
      routeRotationEnabled: options.routeRotationEnabled
    });

    previousControllerRouteRef.current = controller.currentPage?.route;

    if (!nextRoute) {
      return;
    }

    options.onRouteChange?.(nextRoute);
  }, [
    controller.currentPage?.route,
    options.currentPath,
    options.onRouteChange,
    options.routeRotationEnabled
  ]);

  return controller;
}
