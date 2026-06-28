import { FactoryCircuit } from "../FactoryCircuit";
import {
  createFactoryCircuitDisplayPageSeedConfig,
  type FactoryCircuitDisplayPageConfig
} from "../FactoryCircuit/displayPageConfig";
import type { DisplayEditorPageDefinition } from "./index";

export const factoryCircuitRuntimePageDefinition: DisplayEditorPageDefinition = {
  id: "factory-circuit",
  label: "Factory Circuit",
  renderPage: (pageId) => <FactoryCircuit pageId={pageId} />,
  templateKey: "factory-circuit",
  createSeedConfig: () => createFactoryCircuitDisplayPageSeedConfig() as Record<string, unknown>,
  renderPreview: (config) => <FactoryCircuit config={config as FactoryCircuitDisplayPageConfig} />
};
