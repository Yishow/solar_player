import type { DisplayEditorPageDefinition } from "./index";
import { hasPageRegionSchemaCoverage } from "./pageRegionSchemas";
import { buildRegistryPageDefinitions } from "./registryPageDefinitions";
import { factoryCircuitRuntimePageDefinition } from "./runtimeFactoryCircuit";
import { imagesRuntimePageDefinition } from "./runtimeImages";
import { overviewRuntimePageDefinition } from "./runtimeOverview";
import { solarRuntimePageDefinition } from "./runtimeSolar";
import { sustainabilityRuntimePageDefinition } from "./runtimeSustainability";
import type { DisplayPageInstance, DisplayPageTemplateKey } from "@solar-display/shared";

const authoredRuntimePageDefinitions: DisplayEditorPageDefinition[] = [
  overviewRuntimePageDefinition,
  solarRuntimePageDefinition,
  factoryCircuitRuntimePageDefinition,
  imagesRuntimePageDefinition,
  sustainabilityRuntimePageDefinition
];

export const runtimePageDefinitions: DisplayEditorPageDefinition[] = authoredRuntimePageDefinitions.filter(
  (definition) => hasPageRegionSchemaCoverage(definition.templateKey)
);

const runtimePageDefinitionTemplates = new Map<
  DisplayPageTemplateKey,
  Omit<DisplayEditorPageDefinition, "id" | "label">
    & Pick<DisplayEditorPageDefinition, "label" | "templateKey">
>(
  runtimePageDefinitions.map((definition) => [definition.templateKey, definition])
);

export function buildRuntimePageDefinitions(pages: DisplayPageInstance[]): DisplayEditorPageDefinition[] {
  return buildRegistryPageDefinitions(pages, runtimePageDefinitionTemplates);
}
