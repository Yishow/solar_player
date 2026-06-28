import { overviewAssetRuntimeMap } from "../Overview/assets";
import {
  createOverviewDisplayPageSeedConfig,
  type OverviewDisplayPageConfig
} from "../Overview/displayPageConfig";
import { Overview } from "../Overview";
import type { DisplayEditorPageDefinition } from "./index";

export const overviewRuntimePageDefinition: DisplayEditorPageDefinition = {
  id: "overview",
  label: "Overview",
  renderPage: (pageId) => <Overview pageId={pageId} />,
  templateKey: "overview",
  createSeedConfig: () =>
    createOverviewDisplayPageSeedConfig(overviewAssetRuntimeMap.hero) as Record<string, unknown>,
  renderPreview: (config) => <Overview config={config as OverviewDisplayPageConfig} />
};
