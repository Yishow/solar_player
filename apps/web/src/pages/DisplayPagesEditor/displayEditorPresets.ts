import { deepClone, setValueAtPath } from "../../hooks/displayPageConfigPaths";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";

export type DisplayEditorRegionPreset = {
  fieldSignature: string[];
  fieldValues: unknown[];
  label: string;
  presetKey?: string;
};

function serializeFieldShape(region: ResolvedDisplayEditorRegion) {
  return region.fields.map((field) => {
    if (field.schema.fieldType === "select" && "options" in field.schema) {
      return `${field.schema.fieldType}:${field.schema.options.map((option) => option.value).join("|")}`;
    }
    if (field.schema.fieldType === "array" && "itemFields" in field.schema) {
      return `${field.schema.fieldType}:${field.schema.itemFields.map((item) => item.fieldType).join("|")}`;
    }

    return field.schema.fieldType;
  });
}

export function createRegionPreset(region: ResolvedDisplayEditorRegion): DisplayEditorRegionPreset {
  return {
    fieldSignature: serializeFieldShape(region),
    fieldValues: region.fields.map((field) => deepClone(field.value)),
    label: region.label,
    presetKey: region.presetKey
  };
}

export function resolveRegionPresetCompatibility(
  region: ResolvedDisplayEditorRegion,
  preset: DisplayEditorRegionPreset | null
) {
  if (!preset || !region.presetKey || preset.presetKey !== region.presetKey) {
    return {
      compatible: false,
      reason: "這個 preset 與目前 region 類型不相容。"
    } as const;
  }

  const compatible = JSON.stringify(serializeFieldShape(region)) === JSON.stringify(preset.fieldSignature);

  return compatible
    ? ({ compatible: true, reason: null } as const)
    : ({
        compatible: false,
        reason: "這個 preset 與目前 region 類型不相容。"
      } as const);
}

export function applyRegionPreset(
  config: Record<string, unknown>,
  region: ResolvedDisplayEditorRegion,
  preset: DisplayEditorRegionPreset | null
) {
  const compatibility = resolveRegionPresetCompatibility(region, preset);
  if (!compatibility.compatible || !preset) {
    return config;
  }

  return region.fields.reduce(
    (nextConfig, field, index) => setValueAtPath(nextConfig, field.path, deepClone(preset.fieldValues[index])),
    config
  );
}
