import React from "react";
import { Outlet, useLoaderData, useLocation } from "react-router-dom";
import { routeMetaMap } from "../app/routeMeta";
import { AppFooterNav } from "../components/AppFooterNav";
import { AppHeader } from "../components/AppHeader";
import { ManagementFixedLayoutFrame } from "../components/ManagementFixedLayoutFrame";
import { useBrandAssets, type BrandView } from "../hooks/useBrandAssets";
import { useHeaderWeatherMeta } from "../hooks/useHeaderWeatherMeta";

export function ManagementShellFrame({
  children,
  headerMeta,
  hideChrome = false,
  initialBrandView,
  usesFixedLayoutFrame = false
}: {
  children?: React.ReactNode;
  headerMeta?: Parameters<typeof AppHeader>[0]["meta"];
  hideChrome?: boolean;
  initialBrandView?: BrandView;
  usesFixedLayoutFrame?: boolean;
}) {
  return (
    <div
      data-shell-primitive="management-shell-viewport"
      className="shell-stage relative h-screen w-screen overflow-hidden text-neutral-900"
    >
      <div
        data-shell-primitive="management-shell-surface"
        className="shell-stage-surface relative flex h-full w-full flex-col overflow-hidden"
      >
        <div className="shell-stage-overlay pointer-events-none absolute inset-0" />
        {!hideChrome ? <AppHeader brandView={initialBrandView} meta={headerMeta} /> : null}
        <main
          data-shell-primitive="management-shell-content"
          className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
        >
          <div
            data-shell-primitive="management-scroll"
            className="h-full w-full overflow-y-auto overflow-x-hidden"
          >
            {usesFixedLayoutFrame ? (
              <ManagementFixedLayoutFrame>
                {children}
              </ManagementFixedLayoutFrame>
            ) : (
              children
            )}
          </div>
        </main>
        {!hideChrome ? <AppFooterNav brandView={initialBrandView} /> : null}
      </div>
    </div>
  );
}

export function ManagementShell({ initialBrandView }: { initialBrandView?: BrandView }) {
  const location = useLocation();
  const brandView = useBrandAssets(initialBrandView);
  const headerWeatherMeta = useHeaderWeatherMeta();
  const routeMeta = routeMetaMap.get(location.pathname);
  const usesFixedLayoutFrame = routeMeta?.managementFrame === "fixed-fhd";

  return (
    <ManagementShellFrame
      headerMeta={{
        weather: headerWeatherMeta
      }}
      initialBrandView={brandView}
      usesFixedLayoutFrame={usesFixedLayoutFrame}
    >
      <Outlet />
    </ManagementShellFrame>
  );
}

export function ManagementShellRoute() {
  const initialBrandView = useLoaderData() as BrandView;
  return <ManagementShell initialBrandView={initialBrandView} />;
}
