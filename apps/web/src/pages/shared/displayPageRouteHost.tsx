import React, { useMemo } from "react";
import { type LoaderFunctionArgs, useLocation } from "react-router-dom";
import { loadDisplayPageConfigEnvelope } from "../../hooks/useDisplayPageConfig";
import {
  loadDisplayPageRegistrySnapshot,
  useDisplayPageRegistry
} from "../../hooks/useDisplayPageRegistry";
import { resolveDisplayPageRouteInstance } from "./displayPageRouteResolver";
import { warmDisplayPageRoutePeerConfigs } from "./displayPageRouteWarmup";
import { DisplayPageRouteHostFrame } from "./displayPageRouteHostFrame";
import "./displayPageRouteHost.css";

export async function loadDisplayPageRoute({ params }: LoaderFunctionArgs) {
  const routeSlug = params.displayPageSlug;

  if (!routeSlug) {
    return null;
  }

  try {
    const pages = await loadDisplayPageRegistrySnapshot();
    const page = resolveDisplayPageRouteInstance(pages, `/${routeSlug}`);

    if (!page) {
      return null;
    }

    await loadDisplayPageConfigEnvelope(page.pageKey, "live");
    warmDisplayPageRoutePeerConfigs(page.pageKey, pages);
  } catch {
    return null;
  }

  return null;
}

export { DisplayPageRouteHostFrame } from "./displayPageRouteHostFrame";

export function DisplayPageRouteHost() {
  const location = useLocation();
  const registry = useDisplayPageRegistry();
  const page = useMemo(
    () => resolveDisplayPageRouteInstance(registry.pages, location.pathname),
    [location.pathname, registry.pages]
  );

  return <DisplayPageRouteHostFrame page={page} isRegistryLoading={registry.isLoading} />;
}
