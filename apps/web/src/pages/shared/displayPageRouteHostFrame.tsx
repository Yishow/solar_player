import React, { useEffect, useState, type ReactElement } from "react";
import { Navigate } from "react-router-dom";
import type { DisplayPageInstance, DisplayPageTemplateKey } from "@solar-display/shared";
import { loadDisplayPageTemplate } from "./displayPageTemplateLoaders";

type LoadedDisplayPageTemplate = {
  pageKey: string;
  renderPage: (pageId: string) => ReactElement;
  templateKey: DisplayPageTemplateKey;
};

/**
 * Template session + render for a resolved registry page.
 * Kept CSS-free so node:test can mount the real state machine without a CSS loader.
 */
export function DisplayPageRouteHostFrame({
  page,
  isRegistryLoading
}: {
  page: DisplayPageInstance | null;
  isRegistryLoading: boolean;
}) {
  const [loadedTemplate, setLoadedTemplate] = useState<LoadedDisplayPageTemplate | null>(null);
  const [isTemplatePending, setIsTemplatePending] = useState(false);
  const [templateLoadError, setTemplateLoadError] = useState<Error | null>(null);

  useEffect(() => {
    if (!page?.templateKey) {
      // Missing/archived/disabled routes must not keep a prior successful template mounted.
      setLoadedTemplate(null);
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

  // Unresolved route: never retain the previous template; redirect like pre-split host.
  if (!page) {
    if (isRegistryLoading) {
      return null;
    }
    return <Navigate to="/overview" replace />;
  }

  // Resolved page: keep last successful template mounted while the next chunk is pending.
  if (loadedTemplate) {
    return (
      <div className="display-page-route-frame" key={loadedTemplate.pageKey}>
        {loadedTemplate.renderPage(loadedTemplate.pageKey)}
      </div>
    );
  }

  if (isRegistryLoading || isTemplatePending) {
    return null;
  }

  return <Navigate to="/overview" replace />;
}
