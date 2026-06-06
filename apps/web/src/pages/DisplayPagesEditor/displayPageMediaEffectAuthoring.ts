import {
  resolveDisplayPageMediaEffects,
  type DisplayPageMediaBinding,
  type DisplayPageMediaEffectKind,
  type DisplayPageMediaEffectLayer,
  type DisplayPageMediaEffectSupport,
  type DisplayPageLocalizedMediaEffectZone
} from "@solar-display/shared";
import type { DisplayEditorPath } from "../../../../../packages/shared/src/displayEditorSchema";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";
import { getValueAtPath, setValueAtPath } from "../../hooks/displayPageConfigPaths";

export type DisplayPageMediaEffectPresetKey =
  | "all-edge-fade"
  | "full-frame-soft-focus"
  | "side-softening"
  | "top-mist";

export type DisplayPageMediaEffectSummaryItem = {
  label: string;
  value: string;
};

function sameGeometryBinding(a: ResolvedDisplayEditorRegion | null, b: ResolvedDisplayEditorRegion) {
  const aGeometry = a?.schema.geometry;
  const bGeometry = b.schema.geometry;
  if (!aGeometry || !bGeometry) {
    return false;
  }

  return JSON.stringify(aGeometry.leftPath) === JSON.stringify(bGeometry.leftPath)
    && JSON.stringify(aGeometry.topPath) === JSON.stringify(bGeometry.topPath)
    && JSON.stringify(aGeometry.widthPath) === JSON.stringify(bGeometry.widthPath)
    && JSON.stringify(aGeometry.heightPath ?? null) === JSON.stringify(bGeometry.heightPath ?? null);
}

export function resolveDisplayPageMediaEffectRegion(
  selectedRegion: ResolvedDisplayEditorRegion | null,
  availableRegions: ResolvedDisplayEditorRegion[] = []
) {
  if (!selectedRegion) {
    return null;
  }

  if (selectedRegion.schema.mediaEffectSurface) {
    return selectedRegion;
  }

  return availableRegions.find((region) =>
    region.id !== selectedRegion.id
    && Boolean(region.schema.mediaEffectSurface)
    && sameGeometryBinding(selectedRegion, region)
  ) ?? selectedRegion;
}

export function resolveDisplayPageMediaEffectBinding(
  config: Record<string, unknown>,
  region: ResolvedDisplayEditorRegion | null
) {
  const bindingPath = region?.schema.mediaEffectSurface?.bindingPath;
  if (!bindingPath) {
    return null;
  }

  return {
    binding: getValueAtPath(config, bindingPath) as DisplayPageMediaBinding | undefined,
    bindingPath
  };
}

export function listSupportedEffectKinds(support: DisplayPageMediaEffectSupport) {
  return Object.entries(support)
    .filter((entry): entry is [DisplayPageMediaEffectKind, NonNullable<DisplayPageMediaEffectSupport[DisplayPageMediaEffectKind]>] =>
      Boolean(entry[1]?.zones?.length)
    )
    .map(([kind]) => kind);
}

function defaultZoneForKind(kind: DisplayPageMediaEffectKind, support: DisplayPageMediaEffectSupport) {
  return support[kind]?.zones[0] ?? (kind === "opacity" || kind === "tone" ? "full-frame" : "top");
}

export function createDefaultDisplayPageMediaEffectLayer(
  kind: DisplayPageMediaEffectKind,
  support: DisplayPageMediaEffectSupport
): DisplayPageMediaEffectLayer {
  const zone = defaultZoneForKind(kind, support);
  switch (kind) {
    case "fade":
      return { coverage: 0.28, feather: 0.58, kind, strength: 1, zone: zone as DisplayPageLocalizedMediaEffectZone };
    case "mist":
      return { blur: 16, coverage: 0.28, feather: 0.58, kind, strength: 0.72, zone: zone as DisplayPageLocalizedMediaEffectZone };
    case "blur":
      return zone === "full-frame"
        ? { kind, strength: 8, zone }
        : { coverage: 0.28, feather: 0.42, kind, strength: 12, zone: zone as DisplayPageLocalizedMediaEffectZone };
    case "opacity":
      return { kind: "opacity", strength: 0.9, zone: "full-frame" };
    case "tone":
      return { contrast: 1, kind: "tone", saturation: 1, zone: "full-frame" };
    default:
      return { kind: "opacity", strength: 0.9, zone: "full-frame" };
  }
}

export function appendDisplayPageMediaEffectLayer(
  layers: DisplayPageMediaEffectLayer[],
  support: DisplayPageMediaEffectSupport,
  kind?: DisplayPageMediaEffectKind
) {
  const supportedKinds = listSupportedEffectKinds(support);
  const nextKind = kind ?? supportedKinds[0] ?? "mist";
  return [...layers, createDefaultDisplayPageMediaEffectLayer(nextKind, support)];
}

export function moveDisplayPageMediaEffectLayer(
  layers: DisplayPageMediaEffectLayer[],
  fromIndex: number,
  toIndex: number
) {
  if (
    fromIndex < 0
    || toIndex < 0
    || fromIndex >= layers.length
    || toIndex >= layers.length
    || fromIndex === toIndex
  ) {
    return layers;
  }

  const nextLayers = layers.slice();
  const [movedLayer] = nextLayers.splice(fromIndex, 1);
  if (!movedLayer) {
    return layers;
  }
  nextLayers.splice(toIndex, 0, movedLayer);
  return nextLayers;
}

export function removeDisplayPageMediaEffectLayer(
  layers: DisplayPageMediaEffectLayer[],
  index: number
) {
  return layers.filter((_, layerIndex) => layerIndex !== index);
}

export function updateDisplayPageMediaEffectLayerKind(
  layers: DisplayPageMediaEffectLayer[],
  index: number,
  kind: DisplayPageMediaEffectKind,
  support: DisplayPageMediaEffectSupport
): DisplayPageMediaEffectLayer[] {
  return layers.map((layer, layerIndex) => {
    if (layerIndex !== index) {
      return layer;
    }

    const nextLayer = createDefaultDisplayPageMediaEffectLayer(kind, support);

    return {
      ...nextLayer,
      enabled: layer.enabled ?? nextLayer.enabled
    };
  });
}

export function updateDisplayPageMediaEffectLayerZone(
  layers: DisplayPageMediaEffectLayer[],
  index: number,
  zone: DisplayPageMediaEffectLayer["zone"],
  support: DisplayPageMediaEffectSupport
): DisplayPageMediaEffectLayer[] {
  return layers.map((layer, layerIndex) => {
    if (layerIndex !== index) {
      return layer;
    }

    switch (layer.kind) {
      case "fade":
        return zone === "full-frame"
          ? createDefaultDisplayPageMediaEffectLayer("fade", support)
          : { ...layer, zone };
      case "mist":
        return zone === "full-frame"
          ? createDefaultDisplayPageMediaEffectLayer("mist", support)
          : { ...layer, zone };
      case "blur":
        return { ...layer, zone };
      case "opacity":
        return { ...layer, zone: "full-frame" as const };
      case "tone":
      default:
        return { ...layer, zone: "full-frame" as const };
    }
  });
}

export function createDisplayPageMediaEffectPresetLayers(
  presetKey: DisplayPageMediaEffectPresetKey
): DisplayPageMediaEffectLayer[] {
  switch (presetKey) {
    case "all-edge-fade":
      return [{ coverage: 0.22, feather: 0.58, kind: "fade", strength: 1, zone: "all-edges" }];
    case "full-frame-soft-focus":
      return [
        { kind: "blur", strength: 8, zone: "full-frame" },
        { kind: "opacity", strength: 0.92, zone: "full-frame" }
      ];
    case "side-softening":
      return [{ blur: 16, coverage: 0.26, feather: 0.52, kind: "mist", strength: 0.68, zone: "left-right" }];
    case "top-mist":
    default:
      return [{ blur: 16, coverage: 0.3, feather: 0.58, kind: "mist", strength: 0.72, zone: "top" }];
  }
}

export function applyDisplayPageMediaEffectPreset(
  layers: DisplayPageMediaEffectLayer[],
  presetKey: DisplayPageMediaEffectPresetKey
) {
  return [...layers, ...createDisplayPageMediaEffectPresetLayers(presetKey)];
}

export function resolveDisplayPageMediaEffectGuardrails(
  layers: DisplayPageMediaEffectLayer[],
  support: DisplayPageMediaEffectSupport
) {
  const resolved = resolveDisplayPageMediaEffects({ layers }, { support });
  const messages = new Set<string>();

  resolved.layers.forEach((layer) => {
    if (layer.zone !== "full-frame" && layer.coverage > 0.85) {
      messages.add("覆蓋範圍過大，局部效果可能會吞掉主體。");
    }

    if ("feather" in layer && layer.feather > 0.8) {
      messages.add("羽化過強，邊界會變得過於鬆散。");
    }

    if (layer.kind === "blur" && layer.strength > 20) {
      messages.add("模糊強度過高，畫面可讀性可能快速下降。");
    }

    if (layer.kind === "tone" && (layer.saturation > 1.6 || layer.contrast > 1.6)) {
      messages.add("色調強度偏高，請確認主體細節與文字對比仍然可讀。");
    }
  });

  const localizedZoneKeyCounts = new Map<string, number>();
  resolved.layers.forEach((layer) => {
    if (layer.zone === "full-frame") {
      return;
    }

    localizedZoneKeyCounts.set(layer.zone, (localizedZoneKeyCounts.get(layer.zone) ?? 0) + 1);
  });

  for (const [zone, count] of localizedZoneKeyCounts) {
    if (count >= 2) {
      messages.add(`${zone} 區域已有多層效果，請確認沒有互相抵銷或過度柔化。`);
    }
  }

  return [...messages];
}

function localizeKind(kind: DisplayPageMediaEffectKind) {
  switch (kind) {
    case "blur":
      return "模糊";
    case "fade":
      return "淡出";
    case "mist":
      return "霧化";
    case "opacity":
      return "透明度";
    case "tone":
      return "色調";
    default:
      return "透明度";
  }
}

function localizeZone(zone: DisplayPageMediaEffectLayer["zone"]) {
  switch (zone) {
    case "all-edges":
      return "四邊";
    case "bottom":
      return "下緣";
    case "full-frame":
      return "全畫面";
    case "left":
      return "左側";
    case "left-right":
      return "左右兩側";
    case "right":
      return "右側";
    case "top":
      return "上緣";
    case "top-bottom":
    default:
      return "上下兩側";
  }
}

export function resolveDisplayPageMediaEffectSummary(
  effects: DisplayPageMediaBinding["effects"] | DisplayPageMediaEffectLayer[],
  support: DisplayPageMediaEffectSupport
): DisplayPageMediaEffectSummaryItem[] {
  const resolved = resolveDisplayPageMediaEffects(
    Array.isArray(effects) ? { layers: effects } : effects,
    { support }
  );
  return resolved.layers.map((layer) => {
    const values = [`${localizeKind(layer.kind)} / ${localizeZone(layer.zone)}`];

    if ("coverage" in layer && layer.zone !== "full-frame") {
      values.push(`覆蓋 ${Math.round(layer.coverage * 100)}%`);
    }

    if ("feather" in layer && layer.zone !== "full-frame") {
      values.push(`羽化 ${Math.round(layer.feather * 100)}%`);
    }

    if (layer.kind === "tone") {
      values.push(`飽和 ${Math.round((layer.saturation ?? 1) * 100)}%`);
      values.push(`對比 ${Math.round((layer.contrast ?? 1) * 100)}%`);
    } else if (layer.kind === "mist") {
      values.push(`模糊 ${Math.round(layer.blur)}px`);
    } else if (layer.kind === "blur") {
      values.push(`強度 ${Math.round(layer.strength)}`);
    } else {
      values.push(`強度 ${Math.round(layer.strength * 100)}%`);
    }

    return {
      label: `效果層 ${resolved.layers.indexOf(layer) + 1}`,
      value: values.join(" · ")
    };
  });
}

export function writeDisplayPageMediaEffectLayers(
  config: Record<string, unknown>,
  bindingPath: DisplayEditorPath,
  layers: DisplayPageMediaEffectLayer[]
) {
  return setValueAtPath(config, [...bindingPath, "effects"], { layers });
}
