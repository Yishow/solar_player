import type { DisplayEditorPageDefinition } from "./index";

export const fallbackPageDefinitions: DisplayEditorPageDefinition[] = [
  {
    id: "overview",
    label: "Overview",
    createSeedConfig: () => ({}),
    templateKey: "overview"
  },
  {
    id: "solar",
    label: "Solar",
    createSeedConfig: () => ({}),
    templateKey: "solar"
  },
  {
    id: "factory-circuit",
    label: "Factory Circuit",
    createSeedConfig: () => ({}),
    templateKey: "factory-circuit"
  },
  {
    id: "images",
    label: "Images",
    createSeedConfig: () => ({}),
    templateKey: "images"
  },
  {
    id: "sustainability",
    label: "Sustainability",
    createSeedConfig: () => ({}),
    templateKey: "sustainability"
  }
];
