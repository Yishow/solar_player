import type { ResolvedDisplayEditorRegion } from "./inspectorFields";
import { createRegionPreset, resolveRegionPresetCompatibility } from "./displayEditorPresets";

export type DisplayEditorPresetOption = {
  compatible: boolean;
  preset: ReturnType<typeof createRegionPreset>;
  reason: string | null;
  sourceRegionId: string;
  sourceRegionLabel: string;
};

export function isRegionLocked(lockedRegionIds: string[], regionId: string | null | undefined) {
  return regionId ? lockedRegionIds.includes(regionId) : false;
}

export function toggleRegionLock(lockedRegionIds: string[], regionId: string) {
  return lockedRegionIds.includes(regionId)
    ? lockedRegionIds.filter((id) => id !== regionId)
    : [...lockedRegionIds, regionId];
}

export function resolveRegionPresetOptions(
  selectedRegion: ResolvedDisplayEditorRegion | null,
  regions: ResolvedDisplayEditorRegion[]
): DisplayEditorPresetOption[] {
  if (!selectedRegion) {
    return [];
  }

  return regions
    .filter((region) => region.id !== selectedRegion.id && Boolean(region.presetKey))
    .map((region) => {
      const preset = createRegionPreset(region);
      const compatibility = resolveRegionPresetCompatibility(selectedRegion, preset);

      return {
        compatible: compatibility.compatible,
        preset,
        reason: compatibility.reason,
        sourceRegionId: region.id,
        sourceRegionLabel: region.label
      };
    });
}
