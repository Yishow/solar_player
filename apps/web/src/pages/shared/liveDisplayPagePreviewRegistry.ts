import type { DisplayPageKey } from "@solar-display/shared";
import { runtimePageDefinitions } from "../DisplayPagesEditor/runtimePageDefinitions";

export type LiveDisplayPagePreviewRegistryEntry = {
  createSeedConfig: () => Record<string, unknown>;
  id: DisplayPageKey;
  label: string;
  renderPreview?: (config: Record<string, unknown>) => ReturnType<NonNullable<(typeof runtimePageDefinitions)[number]["renderPreview"]>>;
};

export const liveDisplayPagePreviewRegistry: LiveDisplayPagePreviewRegistryEntry[] =
  runtimePageDefinitions.map((definition) => ({
    createSeedConfig: definition.createSeedConfig,
    id: definition.id,
    label: definition.label,
    renderPreview: definition.renderPreview
  }));
