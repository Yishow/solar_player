import React, { useEffect, useMemo, useState, type ReactElement } from "react";
import { Navigate, type LoaderFunctionArgs, useLocation } from "react-router-dom";
import type { DisplayPageTemplateKey } from "@solar-display/shared";
import { loadDisplayPageConfigEnvelope } from "../../hooks/useDisplayPageConfig";
import {
  loadDisplayPageRegistrySnapshot,
  useDisplayPageRegistry
} from "../../hooks/useDisplayPageRegistry";
import { resolveDisplayPageRouteInstance } from "./displayPageRouteResolver";
import { warmDisplayPageRoutePeerConfigs } from "./displayPageRouteWarmup";
import { loadDisplayPageTemplate } from "./displayPageTemplateLoaders";
import "./displayPageRouteHost.css";

type LoadedDisplayPageTemplate = {
  pageKey: string;
  renderPage: (pageId: string) => ReactElement;
  templateKey: DisplayPageTemplateKey;
};

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

export function DisplayPageRouteHost() {
  const location = useLocation();
  const registry = useDisplayPageRegistry();
  const page = useMemo(
    () => resolveDisplayPageRouteInstance(registry.pages, location.pathname),
    [location.pathname, registry.pages]
  );
  const [loadedTemplate, setLoadedTemplate] = useState<LoadedDisplayPageTemplate | null>(null);
  const [isTemplatePending, setIsTemplatePending] = useState(false);
  const [templateLoadError, setTemplateLoadError] = useState<Error | null>(null);

  useEffect(() => {
    if (!page?.templateKey) {
      setIsTemplatePending(false);
      setTemplateLoadError(null);
      return;
    }

    const pageKey = page.pageKey;
    const templateKey = page.templateKey;
    let cancelled = false;

    setIsTemplatePending(true);
    setTemplateLoadError(null);

    void loadDisplayPageTemplate(templateKey)
      .then((runtime) => {
        if (cancelled) {
          return;
        }

        setLoadedTemplate({
          pageKey,
          renderPage: runtime.renderPage,
          templateKey: runtime.templateKey
        });
        setIsTemplatePending(false);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setTemplateLoadError(error instanceof Error ? error : new Error(String(error)));
        setIsTemplatePending(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page?.pageKey, page?.templateKey]);

  if (templateLoadError) {
    throw templateLoadError;
  }

  if (loadedTemplate) {
    return (
      <div className="display-page-route-frame" key={loadedTemplate.pageKey}>
        {loadedTemplate.renderPage(loadedTemplate.pageKey)}
      </div>
    );
  }

  if (registry.isLoading || isTemplatePending) {
    return null;
  }

  return <Navigate to="/overview" replace />;
}
