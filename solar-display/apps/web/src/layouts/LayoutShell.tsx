import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { routeMetaMap } from "../app/routeMeta";
import { AppFooterNav } from "../components/AppFooterNav";
import { AppHeader } from "../components/AppHeader";
import { useMqttStatus } from "../hooks/useMqttStatus";

export function LayoutShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isHydrated, status } = useMqttStatus();

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (location.pathname === "/offline") {
      return;
    }

    const routeMeta = routeMetaMap.get(location.pathname);
    if (routeMeta?.group !== "playback") {
      return;
    }

    if (status.connected || status.reason === "mock") {
      return;
    }

    navigate("/offline", {
      replace: true,
      state: {
        returnTo: location.pathname
      }
    });
  }, [isHydrated, location.pathname, navigate, status.connected, status.reason]);

  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_rgba(245,248,241,0.98)_38%,_rgba(234,241,229,1)_100%)] text-neutral-900">
      <div className="mx-auto flex h-full max-w-[var(--screen-width)] flex-col">
        <AppHeader />
        <main className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </main>
        <AppFooterNav />
      </div>
    </div>
  );
}
