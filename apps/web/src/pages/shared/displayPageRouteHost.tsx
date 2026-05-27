import React, { useMemo } from "react";
import { Navigate, type LoaderFunctionArgs, useLocation } from "react-router-dom";
import { primeDisplayPageConfigCache } from "../../hooks/useDisplayPageConfig";
import { useDisplayPageRegistry } from "../../hooks/useDisplayPageRegistry";
import { getDisplayPageConfig, getDisplayPageRegistry } from "../../services/api";
import { runtimePageDefinitions } from "../DisplayPagesEditor/runtimePageDefinitions";
import { resolveDisplayPageRouteInstance } from "./displayPageRouteResolver";
import "./displayPageRouteHost.css";

const runtimePageDefinitionMap = new Map(
  runtimePageDefinitions.map((definition) => [definition.templateKey, definition])
);

export async function loadDisplayPageRoute({ params }: LoaderFunctionArgs) {
  const routeSlug = params.displayPageSlug;

  if (!routeSlug) {
    return null;
  }

  try {
    const pages = await getDisplayPageRegistry();
    const page = resolveDisplayPageRouteInstance(pages, `/${routeSlug}`);

    if (!page) {
      return null;
    }

    const envelope = await getDisplayPageConfig(page.pageKey, "live");
    primeDisplayPageConfigCache(page.pageKey, "live", envelope);
  } catch {
    return null;
  }

  return null;
}

export function DisplayPageRouteHost() {
  const location = useLocation();
  const registry = useDisplayPageRegistry();
  const page = useMemo(
    () => resolveDisplayPageRouteInstance(registry.pages, location.pathname),
    [location.pathname, registry.pages]
  );
  const definition = useMemo(
    () => (page?.templateKey ? runtimePageDefinitionMap.get(page.templateKey) : null),
    [page?.templateKey]
  );

  if (definition?.renderPage && page) {
    return (
      <div className="display-page-route-frame" key={page.pageKey}>
        {definition.renderPage(page.pageKey)}
      </div>
    );
  }

  if (registry.isLoading) {
    return null;
  }

  return <Navigate to="/overview" replace />;
}
