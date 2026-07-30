import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { installReactGrabDevtools } from "@devtools/react-grab-bootstrap";
import { router } from "./app/router";
import { useSafeAppUpdate } from "./hooks/useSafeAppUpdate";
import { installCrashRecovery } from "./recovery/installCrashRecovery";
import "./styles/global.css";
import "./styles/management.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Failed to find root element");
}

if (import.meta.env.DEV) {
  void installReactGrabDevtools();
}

installCrashRecovery();

function AppUpdateManager() {
  useSafeAppUpdate();
  return null;
}

if ("serviceWorker" in navigator && !import.meta.env.DEV) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js", { type: "module" });
  }, { once: true });
}

createRoot(rootElement).render(
  <StrictMode>
    <AppUpdateManager />
    <RouterProvider router={router} />
  </StrictMode>
);
