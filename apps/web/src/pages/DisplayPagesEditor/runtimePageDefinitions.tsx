import type { DisplayEditorPageDefinition } from "./index";
import { factoryCircuitRuntimePageDefinition } from "./runtimeFactoryCircuit";
import { imagesRuntimePageDefinition } from "./runtimeImages";
import { overviewRuntimePageDefinition } from "./runtimeOverview";
import { solarRuntimePageDefinition } from "./runtimeSolar";
import { sustainabilityRuntimePageDefinition } from "./runtimeSustainability";

export const runtimePageDefinitions: DisplayEditorPageDefinition[] = [
  overviewRuntimePageDefinition,
  solarRuntimePageDefinition,
  factoryCircuitRuntimePageDefinition,
  imagesRuntimePageDefinition,
  sustainabilityRuntimePageDefinition
];
