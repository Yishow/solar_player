import type { ReactElement } from "react";
import {
  displayPageTemplateKeys,
  isDisplayPageTemplateKey,
  type DisplayPageTemplateKey
} from "@solar-display/shared";

export type DisplayPageTemplateRuntime = {
  renderPage: (pageId: string) => ReactElement;
  templateKey: DisplayPageTemplateKey;
};

type TemplateImporter = () => Promise<DisplayPageTemplateRuntime>;

const defaultTemplateImporters: Record<DisplayPageTemplateKey, TemplateImporter> = {
  overview: async () => {
    const { overviewRuntimePageDefinition } = await import("../DisplayPagesEditor/runtimeOverview");
    const renderPage = overviewRuntimePageDefinition.renderPage;
    if (!renderPage) {
      throw new Error("Overview template is missing renderPage");
    }
    return {
      renderPage,
      templateKey: overviewRuntimePageDefinition.templateKey
    };
  },
  solar: async () => {
    const { solarRuntimePageDefinition } = await import("../DisplayPagesEditor/runtimeSolar");
    const renderPage = solarRuntimePageDefinition.renderPage;
    if (!renderPage) {
      throw new Error("Solar template is missing renderPage");
    }
    return {
      renderPage,
      templateKey: solarRuntimePageDefinition.templateKey
    };
  },
  "factory-circuit": async () => {
    const { factoryCircuitRuntimePageDefinition } = await import(
      "../DisplayPagesEditor/runtimeFactoryCircuit"
    );
    const renderPage = factoryCircuitRuntimePageDefinition.renderPage;
    if (!renderPage) {
      throw new Error("Factory circuit template is missing renderPage");
    }
    return {
      renderPage,
      templateKey: factoryCircuitRuntimePageDefinition.templateKey
    };
  },
  images: async () => {
    const { imagesRuntimePageDefinition } = await import("../DisplayPagesEditor/runtimeImages");
    const renderPage = imagesRuntimePageDefinition.renderPage;
    if (!renderPage) {
      throw new Error("Images template is missing renderPage");
    }
    return {
      renderPage,
      templateKey: imagesRuntimePageDefinition.templateKey
    };
  },
  sustainability: async () => {
    const { sustainabilityRuntimePageDefinition } = await import(
      "../DisplayPagesEditor/runtimeSustainability"
    );
    const renderPage = sustainabilityRuntimePageDefinition.renderPage;
    if (!renderPage) {
      throw new Error("Sustainability template is missing renderPage");
    }
    return {
      renderPage,
      templateKey: sustainabilityRuntimePageDefinition.templateKey
    };
  }
};

let templateImporters: Record<DisplayPageTemplateKey, TemplateImporter> = {
  ...defaultTemplateImporters
};

const templateLoadCache = new Map<DisplayPageTemplateKey, Promise<DisplayPageTemplateRuntime>>();

export function getDisplayPageTemplateKeys(): readonly DisplayPageTemplateKey[] {
  return displayPageTemplateKeys;
}

export function loadDisplayPageTemplate(
  templateKey: DisplayPageTemplateKey | string
): Promise<DisplayPageTemplateRuntime> {
  if (!isDisplayPageTemplateKey(templateKey)) {
    return Promise.reject(new Error(`Unknown display page template key: ${String(templateKey)}`));
  }

  const cached = templateLoadCache.get(templateKey);
  if (cached) {
    return cached;
  }

  const loadPromise = templateImporters[templateKey]().catch((error) => {
    if (templateLoadCache.get(templateKey) === loadPromise) {
      templateLoadCache.delete(templateKey);
    }
    throw error;
  });

  templateLoadCache.set(templateKey, loadPromise);
  return loadPromise;
}

export function prefetchDisplayPageTemplate(
  templateKey: DisplayPageTemplateKey | string
): Promise<DisplayPageTemplateRuntime | null> {
  return loadDisplayPageTemplate(templateKey).catch((error) => {
    console.error("[playback] template prefetch failed", templateKey, error);
    return null;
  });
}

/** Test-only helper to clear the promise cache between cases. */
export function resetDisplayPageTemplateLoadCacheForTests() {
  if (import.meta.env?.PROD) {
    return;
  }
  templateLoadCache.clear();
}

/** Test-only helper to inject lightweight importers without loading page assets. */
export function setDisplayPageTemplateImportersForTests(
  importers: Partial<Record<DisplayPageTemplateKey, TemplateImporter>> | null
) {
  if (import.meta.env?.PROD) {
    return;
  }
  templateImporters = {
    ...defaultTemplateImporters,
    ...(importers ?? {})
  };
  templateLoadCache.clear();
}
