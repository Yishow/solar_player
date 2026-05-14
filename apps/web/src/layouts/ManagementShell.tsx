import { Outlet } from "react-router-dom";
import { AppFooterNav } from "../components/AppFooterNav";
import { AppHeader } from "../components/AppHeader";

export function ManagementShell() {
  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_rgba(245,248,241,0.98)_38%,_rgba(234,241,229,1)_100%)] text-neutral-900">
      <div className="flex h-full w-full flex-col">
        <AppHeader />
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>
        <AppFooterNav />
      </div>
    </div>
  );
}
