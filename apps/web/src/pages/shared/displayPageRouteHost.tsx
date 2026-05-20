import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useDisplayPageRegistry } from "../../hooks/useDisplayPageRegistry";
import { runtimePageDefinitions } from "../DisplayPagesEditor/runtimePageDefinitions";
import { resolveDisplayPageRouteInstance } from "./displayPageRouteResolver";

const runtimePageDefinitionMap = new Map(
  runtimePageDefinitions.map((definition) => [definition.templateKey, definition])
);

export function DisplayPageRouteHost() {
  const location = useLocation();
  const registry = useDisplayPageRegistry();
  const page = resolveDisplayPageRouteInstance(registry.pages, location.pathname);
  const definition = page?.templateKey ? runtimePageDefinitionMap.get(page.templateKey) : null;

  if (definition?.renderPage && page) {
    return definition.renderPage(page.pageKey);
  }

  if (registry.isLoading) {
    return null;
  }

  return <Navigate to="/overview" replace />;
}
