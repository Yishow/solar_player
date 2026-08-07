import React, { useEffect, useState } from "react";
import { Outlet, useLoaderData } from "react-router-dom";
import { AppFooterNav } from "../components/AppFooterNav";
import { AppHeader } from "../components/AppHeader";
import { computeCanvasLayout } from "../components/displayCanvasLayout";
import { resolveHeaderConnectionMeta } from "../components/headerConnectionMeta";
import { useBrandAssets, type BrandView } from "../hooks/useBrandAssets";
import { useHeaderWeatherMeta } from "../hooks/useHeaderWeatherMeta";
import { useMqttStatus } from "../hooks/useMqttStatus";
import { useShellDecorations } from "../hooks/useShellDecorations";
import type { ShellDecorationObject } from "@solar-display/shared";
import type { ShellBootstrap } from "./shellBootstrap";
import { ManagementUnlockScreen } from "../components/ManagementUnlockScreen";
import { MANAGEMENT_ACCESS_DENIED_EVENT } from "../services/api";
import { useManagementPasswordGate } from "../hooks/useManagementPasswordGate";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

function getViewportSize() {
  if (typeof window === "undefined") {
    return {
      height: DESIGN_HEIGHT,
      width: DESIGN_WIDTH
    };
  }

  return {
    height: window.visualViewport?.height ?? window.innerHeight,
    width: window.visualViewport?.width ?? window.innerWidth
  };
}

export function ManagementShellFrame({
  children,
  footerDecorationObjects,
  headerMeta,
  headerDecorationObjects,
  hideChrome = false,
  initialBrandView
}: {
  children?: React.ReactNode;
  footerDecorationObjects?: ShellDecorationObject[];
  headerMeta?: Parameters<typeof AppHeader>[0]["meta"];
  headerDecorationObjects?: ShellDecorationObject[];
  hideChrome?: boolean;
  initialBrandView?: BrandView;
}) {
  const gate = useManagementPasswordGate();
  const [layout, setLayout] = useState(() => computeCanvasLayout(
    getViewportSize(),
    { height: DESIGN_HEIGHT, width: DESIGN_WIDTH }
  ));

  useEffect(() => {
    const updateLayout = () => {
      setLayout(computeCanvasLayout(
        getViewportSize(),
        { height: DESIGN_HEIGHT, width: DESIGN_WIDTH }
      ));
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    window.visualViewport?.addEventListener("resize", updateLayout);

    return () => {
      window.removeEventListener("resize", updateLayout);
      window.visualViewport?.removeEventListener("resize", updateLayout);
    };
  }, []);

  useEffect(() => {
    const handleDenied = () => { void gate.refresh(); };
    window.addEventListener(MANAGEMENT_ACCESS_DENIED_EVENT, handleDenied);
    return () => window.removeEventListener(MANAGEMENT_ACCESS_DENIED_EVENT, handleDenied);
  }, [gate.refresh]);

  return (
    <div
      data-shell-primitive="management-shell-viewport"
      className="shell-stage relative h-screen w-screen overflow-hidden text-neutral-900"
      style={{
        backgroundColor: "var(--stage-bg)"
      }}
    >
      <div
        data-shell-primitive="management-shell-frame"
        className="absolute left-0 top-0"
        style={{
          height: `${DESIGN_HEIGHT}px`,
          transform: `translate(${layout.offsetX}px, ${layout.offsetY}px) scale(${layout.scale})`,
          transformOrigin: "top left",
          width: `${DESIGN_WIDTH}px`
        }}
      >
        <div
          data-shell-primitive="management-shell-surface"
          className="shell-stage-surface relative flex h-full w-full flex-col overflow-hidden"
        >
          <div className="shell-stage-overlay pointer-events-none absolute inset-0" />
          {!hideChrome ? (
            <AppHeader
              brandView={initialBrandView}
              decorationObjects={headerDecorationObjects}
              meta={headerMeta}
            />
          ) : null}
          <main
            data-shell-primitive="management-shell-content"
            className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
          >
            <div
              data-shell-primitive="management-scroll"
              className="h-full w-full overflow-y-auto overflow-x-hidden"
            >
              {typeof window !== "undefined" && gate.requiresUnlock ? (
                <ManagementUnlockScreen
                  errorMessage={gate.errorMessage}
                  lockedUntil={gate.lockedUntil}
                  onUnlock={gate.unlock}
                />
              ) : children}
            </div>
          </main>
          {!hideChrome ? <AppFooterNav brandView={initialBrandView} decorationObjects={footerDecorationObjects} /> : null}
        </div>
      </div>
    </div>
  );
}

export function ManagementShell({
  initialBrandView,
  initialShellBootstrap
}: {
  initialBrandView?: BrandView;
  initialShellBootstrap?: ShellBootstrap;
}) {
  const brandView = useBrandAssets(initialShellBootstrap?.brandView ?? initialBrandView);
  const { isHydrated, status } = useMqttStatus(initialShellBootstrap?.mqttStatus);
  const headerWeatherMeta = useHeaderWeatherMeta(initialShellBootstrap?.weatherContract);
  const headerConnectionMeta = resolveHeaderConnectionMeta({
    connected: status.connected,
    reason: status.reason,
    isHydrated
  });
  const shellDecorations = useShellDecorations();

  return (
    <ManagementShellFrame
      footerDecorationObjects={shellDecorations.footerObjects}
      headerMeta={{
        status: headerConnectionMeta.status,
        statusLabel: headerConnectionMeta.label,
        weather: headerWeatherMeta
      }}
      headerDecorationObjects={shellDecorations.headerObjects}
      initialBrandView={brandView}
    >
      <Outlet />
    </ManagementShellFrame>
  );
}

export function ManagementShellRoute() {
  const initialShellBootstrap = useLoaderData() as ShellBootstrap;
  return <ManagementShell initialShellBootstrap={initialShellBootstrap} />;
}
