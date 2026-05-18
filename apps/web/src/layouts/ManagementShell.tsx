import React from "react";
import { Outlet } from "react-router-dom";
import { AppFooterNav } from "../components/AppFooterNav";
import { AppHeader } from "../components/AppHeader";
import { DisplayCanvas } from "../components/DisplayCanvas";

export function ManagementShell() {
  return (
    <DisplayCanvas header={<AppHeader />} footer={<AppFooterNav />}>
      <div
        data-shell-primitive="management-scroll"
        className="h-full w-full overflow-y-auto overflow-x-hidden"
      >
        <Outlet />
      </div>
    </DisplayCanvas>
  );
}
