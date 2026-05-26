import type {
  DisplayEditorFieldSchema,
  DisplayEditorOptionValue,
  DisplayEditorPath
} from "../../../../../packages/shared/src/displayEditorSchema";
import {
  referenceGlyphNames,
  type ReferenceGlyphName
} from "../../components/ReferenceGlyph";
import {
  factoryCircuitIconKeys,
  type FactoryCircuitRegistryIconKey
} from "../FactoryCircuit/iconRegistry";
import {
  sustainabilityIconKeys,
  type SustainabilityRegistryIconKey
} from "../Sustainability/iconRegistry";

export const displayPageIconSourceModes = [
  "asset-image",
  "managed-asset",
  "reference-glyph",
  "page-icon-key"
] as const;

export type DisplayPageIconSourceMode = (typeof displayPageIconSourceModes)[number];

export const displayPageIconRegistryNames = [
  "factory-circuit",
  "sustainability"
] as const;

export type DisplayPageIconRegistryName = (typeof displayPageIconRegistryNames)[number];

export type DisplayPageIconSource =
  | {
      alt?: string;
      mode: "asset-image";
      src?: string;
    }
  | {
      alt?: string;
      assetId?: number | string | null;
      fallbackSrc?: string;
      mode: "managed-asset";
      src?: string;
    }
  | {
      glyphName?: string;
      mode: "reference-glyph";
    }
  | {
      iconKey?: string;
      mode: "page-icon-key";
      registry?: string;
    };

function option<T extends DisplayEditorOptionValue>(label: string, value: T) {
  return { label, value };
}

export const displayPageIconSourceModeOptions = [
  option("Asset Image", "asset-image"),
  option("Managed Asset", "managed-asset"),
  option("Reference Glyph", "reference-glyph"),
  option("Page Icon Key", "page-icon-key")
];

export const displayPageIconRegistryOptions = [
  option("Factory Circuit", "factory-circuit"),
  option("Sustainability", "sustainability")
];

const referenceGlyphOptions = referenceGlyphNames.map((name) => option(name, name));

const pageRegistryIconOptions: Record<
  DisplayPageIconRegistryName,
  Array<{ label: string; value: DisplayEditorOptionValue }>
> = {
  "factory-circuit": factoryCircuitIconKeys.map((key) => option(key, key)),
  sustainability: sustainabilityIconKeys.map((key) => option(key, key))
};

function visibleWhen(path: DisplayEditorPath, equals: DisplayEditorOptionValue) {
  return { equals, path };
}

export function createAssetImageIconSource(src: string, alt?: string): DisplayPageIconSource {
  return {
    alt,
    mode: "asset-image",
    src
  };
}

export function createManagedAssetIconSource(
  assetId: number | string,
  fallbackSrc?: string,
  alt?: string
): DisplayPageIconSource {
  return {
    alt,
    assetId,
    fallbackSrc,
    mode: "managed-asset"
  };
}

export function createReferenceGlyphIconSource(
  glyphName: ReferenceGlyphName
): DisplayPageIconSource {
  return {
    glyphName,
    mode: "reference-glyph"
  };
}

export function createPageIconKeySource(
  registry: DisplayPageIconRegistryName,
  iconKey: FactoryCircuitRegistryIconKey | SustainabilityRegistryIconKey
): DisplayPageIconSource {
  return {
    iconKey,
    mode: "page-icon-key",
    registry
  };
}

export function isReferenceGlyphName(value: string | undefined): value is ReferenceGlyphName {
  return typeof value === "string" && referenceGlyphNames.includes(value as ReferenceGlyphName);
}

export function isFactoryCircuitRegistryIconKey(
  value: string | undefined
): value is FactoryCircuitRegistryIconKey {
  return typeof value === "string" && factoryCircuitIconKeys.includes(value as FactoryCircuitRegistryIconKey);
}

export function isSustainabilityRegistryIconKey(
  value: string | undefined
): value is SustainabilityRegistryIconKey {
  return typeof value === "string" && sustainabilityIconKeys.includes(value as SustainabilityRegistryIconKey);
}

function isValidManagedAssetReference(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidDisplayPageIconSource(source: DisplayPageIconSource) {
  if (source.mode === "asset-image") {
    return typeof source.src === "string" && source.src.trim().length > 0;
  }

  if (source.mode === "managed-asset") {
    return isValidManagedAssetReference(source.assetId);
  }

  if (source.mode === "reference-glyph") {
    return isReferenceGlyphName(source.glyphName);
  }

  if (source.mode === "page-icon-key") {
    if (source.registry === "factory-circuit") {
      return isFactoryCircuitRegistryIconKey(source.iconKey);
    }

    if (source.registry === "sustainability") {
      return isSustainabilityRegistryIconKey(source.iconKey);
    }
  }

  return false;
}

export function buildDisplayPageIconSourceFields({
  idPrefix,
  path
}: {
  idPrefix: string;
  path: DisplayEditorPath;
}): DisplayEditorFieldSchema[] {
  const modePath = [...path, "mode"];
  const registryPath = [...path, "registry"];

  return [
    {
      fieldType: "select",
      id: `${idPrefix}-icon-source-mode`,
      label: "Icon Source Mode",
      options: displayPageIconSourceModeOptions,
      path: modePath
    },
    {
      constraints: { required: true },
      fieldType: "text",
      id: `${idPrefix}-icon-src`,
      label: "Image Source",
      path: [...path, "src"],
      visibleWhen: visibleWhen(modePath, "asset-image")
    },
    {
      fieldType: "text",
      id: `${idPrefix}-icon-alt`,
      label: "Image Alt",
      path: [...path, "alt"],
      visibleWhen: visibleWhen(modePath, "asset-image")
    },
    {
      constraints: { required: true },
      fieldType: "asset",
      id: `${idPrefix}-icon-managed-asset`,
      label: "Managed Icon Asset",
      path: [...path, "assetId"],
      placeholder: "image_assets.id",
      visibleWhen: visibleWhen(modePath, "managed-asset")
    },
    {
      fieldType: "text",
      id: `${idPrefix}-icon-managed-fallback-src`,
      label: "Managed Icon Fallback Src",
      path: [...path, "fallbackSrc"],
      visibleWhen: visibleWhen(modePath, "managed-asset")
    },
    {
      fieldType: "text",
      id: `${idPrefix}-icon-managed-alt`,
      label: "Managed Icon Alt",
      path: [...path, "alt"],
      visibleWhen: visibleWhen(modePath, "managed-asset")
    },
    {
      fieldType: "select",
      id: `${idPrefix}-icon-glyph-name`,
      label: "Reference Glyph",
      options: referenceGlyphOptions,
      path: [...path, "glyphName"],
      visibleWhen: visibleWhen(modePath, "reference-glyph")
    },
    {
      fieldType: "select",
      id: `${idPrefix}-icon-registry`,
      label: "Icon Registry",
      options: displayPageIconRegistryOptions,
      path: registryPath,
      visibleWhen: visibleWhen(modePath, "page-icon-key")
    },
    {
      fieldType: "select",
      id: `${idPrefix}-icon-key-factory-circuit`,
      label: "Factory Circuit Icon",
      options: pageRegistryIconOptions["factory-circuit"],
      path: [...path, "iconKey"],
      visibleWhen: visibleWhen(registryPath, "factory-circuit")
    },
    {
      fieldType: "select",
      id: `${idPrefix}-icon-key-sustainability`,
      label: "Sustainability Icon",
      options: pageRegistryIconOptions.sustainability,
      path: [...path, "iconKey"],
      visibleWhen: visibleWhen(registryPath, "sustainability")
    }
  ];
}
