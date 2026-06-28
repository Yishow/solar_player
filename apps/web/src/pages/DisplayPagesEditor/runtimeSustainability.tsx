import { Sustainability } from "../Sustainability";
import { sustainabilityAssetMap } from "../Sustainability/assets";
import {
  createSustainabilityDisplayPageSeedConfig,
  type SustainabilityDisplayPageConfig
} from "../Sustainability/displayPageConfig";
import type { DisplayEditorPageDefinition } from "./index";

export const sustainabilityRuntimePageDefinition: DisplayEditorPageDefinition = {
  id: "sustainability",
  label: "Sustainability",
  renderPage: (pageId) => <Sustainability pageId={pageId} />,
  templateKey: "sustainability",
  createSeedConfig: () =>
    createSustainabilityDisplayPageSeedConfig(sustainabilityAssetMap.hero.src) as Record<string, unknown>,
  renderPreview: (config) => <Sustainability config={config as SustainabilityDisplayPageConfig} />
};
