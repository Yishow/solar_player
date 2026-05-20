import React from "react";
import { Outlet } from "react-router-dom";
import { AppFooterNav } from "../components/AppFooterNav";
import { AppHeader } from "../components/AppHeader";

export function ManagementShell() {
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
        <AppHeader />
        <main
          data-shell-primitive="management-shell-content"
          className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
        >
          <div
            data-shell-primitive="management-scroll"
            className="h-full w-full overflow-y-auto overflow-x-hidden"
          >
            <Outlet />
          </div>
        </main>
        <AppFooterNav />
      </div>
    </div>
  );
}
