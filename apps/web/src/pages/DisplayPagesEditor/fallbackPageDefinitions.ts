import type { DisplayEditorPageDefinition } from "./index";

export const fallbackPageDefinitions: DisplayEditorPageDefinition[] = [
  {
    id: "overview",
    label: "Overview",
    createSeedConfig: () => ({})
  },
  {
    id: "solar",
    label: "Solar",
    createSeedConfig: () => ({})
  },
  {
    id: "factory-circuit",
    label: "Factory Circuit",
    createSeedConfig: () => ({})
  },
  {
    id: "images",
    label: "Images",
    createSeedConfig: () => ({})
  },
  {
    id: "sustainability",
    label: "Sustainability",
    createSeedConfig: () => ({})
  }
];
