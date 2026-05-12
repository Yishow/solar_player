import { useEffect } from "react";
import { subscribeSocketEvent } from "../services/socket";
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

  useEffect(() => {
    const unsubscribe = subscribeSocketEvent("playback:settingsUpdated", () => {
      void controller.reload();
    });

    return () => {
      unsubscribe();
    };
  }, [controller.reload]);

  useEffect(() => {
    if (!options.routeRotationEnabled) {
      return;
    }

    if (!controller.currentPage?.route || controller.currentPage.route === options.currentPath) {
      return;
    }

    options.onRouteChange?.(controller.currentPage.route);
  }, [
    controller.currentPage?.route,
    options.currentPath,
    options.onRouteChange,
    options.routeRotationEnabled
  ]);

  return controller;
}
