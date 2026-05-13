type ResolvePlaybackRouteNavigationInput = {
  controllerRoute?: string;
  currentPath?: string;
  previousControllerRoute?: string;
  routeRotationEnabled?: boolean;
};

export function resolvePlaybackRouteNavigation({
  controllerRoute,
  currentPath,
  previousControllerRoute,
  routeRotationEnabled
}: ResolvePlaybackRouteNavigationInput) {
  if (!routeRotationEnabled || !controllerRoute || controllerRoute === currentPath) {
    return null;
  }

  if (previousControllerRoute === controllerRoute) {
    return null;
  }

  return controllerRoute;
}
