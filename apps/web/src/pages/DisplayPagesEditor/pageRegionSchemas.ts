import type { DisplayPageKey } from "@solar-display/shared";
import { factoryCircuitDisplayPageEditorRegions } from "../FactoryCircuit/displayPageConfig";
import { imagesDisplayPageEditorRegions } from "../Images/displayPageConfig";
import { overviewDisplayPageEditorRegions } from "../Overview/displayPageConfig";
import { solarDisplayPageEditorRegions } from "../Solar/displayPageConfig";
import { sustainabilityDisplayPageEditorRegions } from "../Sustainability/displayPageConfig";

export function resolvePageRegionSchemas(pageId: DisplayPageKey) {
  const regionSchemas = {
    "factory-circuit": factoryCircuitDisplayPageEditorRegions,
    images: imagesDisplayPageEditorRegions,
    overview: overviewDisplayPageEditorRegions,
    solar: solarDisplayPageEditorRegions,
    sustainability: sustainabilityDisplayPageEditorRegions
  };

  return regionSchemas[pageId] ?? [];
}
