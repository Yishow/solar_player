import type { DisplayPageTemplateKey } from "@solar-display/shared";
import type { DisplayEditorRegionSchema } from "../../../../../packages/shared/src/displayEditorSchema";
import { factoryCircuitDisplayPageEditorRegions } from "../FactoryCircuit/displayPageConfig";
import { imagesDisplayPageEditorRegions } from "../Images/displayPageConfig";
import { overviewDisplayPageEditorRegions } from "../Overview/displayPageConfig";
import { solarDisplayPageEditorRegions } from "../Solar/displayPageConfig";
import { sustainabilityDisplayPageEditorRegions } from "../Sustainability/displayPageConfig";

export const pageRegionSchemasByTemplate: Record<DisplayPageTemplateKey, DisplayEditorRegionSchema[]> = {
  "factory-circuit": factoryCircuitDisplayPageEditorRegions,
  images: imagesDisplayPageEditorRegions,
  overview: overviewDisplayPageEditorRegions,
  solar: solarDisplayPageEditorRegions,
  sustainability: sustainabilityDisplayPageEditorRegions
};

export function hasPageRegionSchemaCoverage(pageId: DisplayPageTemplateKey) {
  return pageRegionSchemasByTemplate[pageId].length > 0;
}

export function resolvePageRegionSchemas(pageId: DisplayPageTemplateKey) {
  return pageRegionSchemasByTemplate[pageId];
}
