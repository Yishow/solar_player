import type { RouteMeta } from "../app/routeMeta";

type MqttStatusLike = {
  connected: boolean;
  reason: string | null;
};

type ShouldRedirectToOfflineInput = {
  isHydrated: boolean;
  pathname: string;
  routeMeta: RouteMeta | undefined;
  status: MqttStatusLike;
};

export function shouldRedirectToOffline({
  isHydrated,
  pathname,
  routeMeta,
  status
}: ShouldRedirectToOfflineInput) {
  if (!isHydrated) {
    return false;
  }

  if (pathname === "/offline") {
    return false;
  }

  if (routeMeta?.group !== "playback") {
    return false;
  }

  if (routeMeta.allowOfflineWhenDisconnected) {
    return false;
  }

  if (status.connected || status.reason === "mock") {
    return false;
  }

  return true;
}
