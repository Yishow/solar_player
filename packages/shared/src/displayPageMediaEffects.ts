export const displayPageMediaEffectZones = [
  "top",
  "bottom",
  "left",
  "right",
  "top-bottom",
  "left-right",
  "all-edges",
  "full-frame"
] as const;

export const displayPageLocalizedMediaEffectZones = displayPageMediaEffectZones.filter(
  (zone) => zone !== "full-frame"
) as Array<Exclude<DisplayPageMediaEffectZone, "full-frame">>;

export type DisplayPageMediaEffectZone = (typeof displayPageMediaEffectZones)[number];
export type DisplayPageLocalizedMediaEffectZone = Exclude<DisplayPageMediaEffectZone, "full-frame">;

export const displayPageMediaEffectKinds = ["fade", "mist", "blur", "opacity"] as const;

export type DisplayPageMediaEffectKind = (typeof displayPageMediaEffectKinds)[number];

export const displayPageMediaEffectBounds = {
  blurAmount: {
    max: 24,
    min: 0,
    step: 1
  },
  bottomFadeHeight: {
    max: 1,
    min: 0.05,
    step: 0.05
  },
  coverage: {
    max: 1,
    min: 0.05,
    step: 0.05
  },
  edgeFadeWidth: {
    max: 1,
    min: 0.05,
    step: 0.05
  },
  feather: {
    max: 1,
    min: 0,
    step: 0.05
  },
  opacityValue: {
    max: 1,
    min: 0.1,
    step: 0.05
  },
  strength: {
    max: 1,
    min: 0.1,
    step: 0.05
  }
} as const;

export type DisplayPageMediaEffectDirection = Extract<
  DisplayPageLocalizedMediaEffectZone,
  "left" | "right"
>;

export type DisplayPageMediaFadeEffectLayer = {
  coverage?: number;
  enabled?: boolean;
  feather?: number;
  kind: "fade";
  strength?: number;
  zone: DisplayPageLocalizedMediaEffectZone;
};

export type DisplayPageMediaMistEffectLayer = {
  blur?: number;
  coverage?: number;
  enabled?: boolean;
  feather?: number;
  kind: "mist";
  strength?: number;
  zone: DisplayPageLocalizedMediaEffectZone;
};

export type DisplayPageMediaBlurEffectLayer = {
  coverage?: number;
  enabled?: boolean;
  feather?: number;
  kind: "blur";
  strength?: number;
  zone: DisplayPageMediaEffectZone;
};

export type DisplayPageMediaOpacityEffectLayer = {
  enabled?: boolean;
  kind: "opacity";
  strength?: number;
  zone: "full-frame";
};

export type DisplayPageMediaEffectLayer =
  | DisplayPageMediaBlurEffectLayer
  | DisplayPageMediaFadeEffectLayer
  | DisplayPageMediaMistEffectLayer
  | DisplayPageMediaOpacityEffectLayer;

export type DisplayPageResolvedMediaFadeEffectLayer = Omit<
  Required<DisplayPageMediaFadeEffectLayer>,
  "enabled"
> & { enabled: boolean };

export type DisplayPageResolvedMediaMistEffectLayer = Omit<
  Required<DisplayPageMediaMistEffectLayer>,
  "enabled"
> & { enabled: boolean };

export type DisplayPageResolvedMediaBlurEffectLayer = Omit<
  Required<DisplayPageMediaBlurEffectLayer>,
  "enabled"
> & { enabled: boolean };

export type DisplayPageResolvedMediaOpacityEffectLayer = Omit<
  Required<DisplayPageMediaOpacityEffectLayer>,
  "enabled"
> & { enabled: boolean };

export type DisplayPageResolvedMediaEffectLayer =
  | DisplayPageResolvedMediaBlurEffectLayer
  | DisplayPageResolvedMediaFadeEffectLayer
  | DisplayPageResolvedMediaMistEffectLayer
  | DisplayPageResolvedMediaOpacityEffectLayer;

export type DisplayPageMediaEffectSupportEntry<TZone extends DisplayPageMediaEffectZone = DisplayPageMediaEffectZone> = {
  zones: TZone[];
};

export type DisplayPageMediaEffectSupport = Partial<{
  blur: DisplayPageMediaEffectSupportEntry;
  fade: DisplayPageMediaEffectSupportEntry<DisplayPageLocalizedMediaEffectZone>;
  mist: DisplayPageMediaEffectSupportEntry<DisplayPageLocalizedMediaEffectZone>;
  opacity: DisplayPageMediaEffectSupportEntry<"full-frame">;
}>;

export type DisplayPageMediaEdgeFadeEffect = {
  direction?: DisplayPageMediaEffectDirection;
  enabled?: boolean;
  width?: number;
};

export type DisplayPageMediaBottomFadeEffect = {
  enabled?: boolean;
  height?: number;
};

export type DisplayPageMediaBlurEffect = {
  amount?: number;
  enabled?: boolean;
};

export type DisplayPageMediaOpacityEffect = {
  enabled?: boolean;
  value?: number;
};

export type DisplayPageLegacyMediaEffects = {
  blur?: DisplayPageMediaBlurEffect;
  bottomFade?: DisplayPageMediaBottomFadeEffect;
  edgeFade?: DisplayPageMediaEdgeFadeEffect;
  opacity?: DisplayPageMediaOpacityEffect;
};

export type DisplayPageMediaEffects = DisplayPageLegacyMediaEffects & {
  layers?: DisplayPageMediaEffectLayer[];
};

export type DisplayPageResolvedMediaEffects = {
  layers: DisplayPageResolvedMediaEffectLayer[];
  support: DisplayPageMediaEffectSupport;
  usesCanonicalLayers: boolean;
  usesLegacyFields: boolean;
};

export type DisplayPageMediaEffectResolverOptions = {
  defaults?: DisplayPageMediaEffects | DisplayPageMediaEffectLayer[];
  support?: DisplayPageMediaEffectSupport;
};

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}

function resolveEnabled(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function isLocalizedZone(zone: DisplayPageMediaEffectZone): zone is DisplayPageLocalizedMediaEffectZone {
  return zone !== "full-frame";
}

function coerceSupportedZones<TZone extends DisplayPageMediaEffectZone>(
  entry: DisplayPageMediaEffectSupportEntry<TZone> | undefined,
  fallback: readonly TZone[]
) {
  if (!entry?.zones?.length) {
    return [...fallback];
  }

  return entry.zones.filter(Boolean);
}

function normalizeSupport(
  support?: DisplayPageMediaEffectSupport
): DisplayPageMediaEffectSupport {
  return {
    blur: support?.blur
      ? { zones: coerceSupportedZones(support.blur, displayPageMediaEffectZones) }
      : undefined,
    fade: support?.fade
      ? { zones: coerceSupportedZones(support.fade, displayPageLocalizedMediaEffectZones) }
      : undefined,
    mist: support?.mist
      ? { zones: coerceSupportedZones(support.mist, displayPageLocalizedMediaEffectZones) }
      : undefined,
    opacity: support?.opacity
      ? { zones: coerceSupportedZones(support.opacity, ["full-frame"]) }
      : undefined
  };
}

function resolveLayerSupport(
  layer: DisplayPageMediaEffectLayer,
  support: DisplayPageMediaEffectSupport
) {
  const entry = support[layer.kind];
  if (!entry) {
    return null;
  }

  return entry.zones.includes(layer.zone as never) ? entry : null;
}

function resolveFadeLayer(
  layer: DisplayPageMediaFadeEffectLayer,
  support: DisplayPageMediaEffectSupport
): DisplayPageResolvedMediaFadeEffectLayer | null {
  if (!isLocalizedZone(layer.zone) || !resolveLayerSupport(layer, support)) {
    return null;
  }

  return {
    coverage: clampNumber(
      layer.coverage,
      displayPageMediaEffectBounds.coverage.min,
      displayPageMediaEffectBounds.coverage.max,
      0.56
    ),
    enabled: resolveEnabled(layer.enabled, true),
    feather: clampNumber(
      layer.feather,
      displayPageMediaEffectBounds.feather.min,
      displayPageMediaEffectBounds.feather.max,
      0.58
    ),
    kind: "fade",
    strength: clampNumber(
      layer.strength,
      displayPageMediaEffectBounds.strength.min,
      displayPageMediaEffectBounds.strength.max,
      1
    ),
    zone: layer.zone
  };
}

function resolveMistLayer(
  layer: DisplayPageMediaMistEffectLayer,
  support: DisplayPageMediaEffectSupport
): DisplayPageResolvedMediaMistEffectLayer | null {
  if (!isLocalizedZone(layer.zone) || !resolveLayerSupport(layer, support)) {
    return null;
  }

  return {
    blur: clampNumber(
      layer.blur,
      displayPageMediaEffectBounds.blurAmount.min,
      displayPageMediaEffectBounds.blurAmount.max,
      16
    ),
    coverage: clampNumber(
      layer.coverage,
      displayPageMediaEffectBounds.coverage.min,
      displayPageMediaEffectBounds.coverage.max,
      0.56
    ),
    enabled: resolveEnabled(layer.enabled, true),
    feather: clampNumber(
      layer.feather,
      displayPageMediaEffectBounds.feather.min,
      displayPageMediaEffectBounds.feather.max,
      0.58
    ),
    kind: "mist",
    strength: clampNumber(
      layer.strength,
      displayPageMediaEffectBounds.strength.min,
      displayPageMediaEffectBounds.strength.max,
      0.72
    ),
    zone: layer.zone
  };
}

function resolveBlurLayer(
  layer: DisplayPageMediaBlurEffectLayer,
  support: DisplayPageMediaEffectSupport
): DisplayPageResolvedMediaBlurEffectLayer | null {
  if (!resolveLayerSupport(layer, support)) {
    return null;
  }

  return {
    coverage: isLocalizedZone(layer.zone)
      ? clampNumber(
          layer.coverage,
          displayPageMediaEffectBounds.coverage.min,
          displayPageMediaEffectBounds.coverage.max,
          0.32
        )
      : 1,
    enabled: resolveEnabled(layer.enabled, true),
    feather: isLocalizedZone(layer.zone)
      ? clampNumber(
          layer.feather,
          displayPageMediaEffectBounds.feather.min,
          displayPageMediaEffectBounds.feather.max,
          0.42
        )
      : 1,
    kind: "blur",
    strength: clampNumber(
      layer.strength,
      displayPageMediaEffectBounds.blurAmount.min,
      displayPageMediaEffectBounds.blurAmount.max,
      16
    ),
    zone: layer.zone
  };
}

function resolveOpacityLayer(
  layer: DisplayPageMediaOpacityEffectLayer,
  support: DisplayPageMediaEffectSupport
): DisplayPageResolvedMediaOpacityEffectLayer | null {
  if (!resolveLayerSupport(layer, support)) {
    return null;
  }

  return {
    enabled: resolveEnabled(layer.enabled, true),
    kind: "opacity",
    strength: clampNumber(
      layer.strength,
      displayPageMediaEffectBounds.opacityValue.min,
      displayPageMediaEffectBounds.opacityValue.max,
      1
    ),
    zone: "full-frame"
  };
}

function resolveCanonicalLayer(
  layer: DisplayPageMediaEffectLayer,
  support: DisplayPageMediaEffectSupport
): DisplayPageResolvedMediaEffectLayer | null {
  switch (layer.kind) {
    case "fade":
      return resolveFadeLayer(layer, support);
    case "mist":
      return resolveMistLayer(layer, support);
    case "blur":
      return resolveBlurLayer(layer, support);
    case "opacity":
      return resolveOpacityLayer(layer, support);
    default:
      return null;
  }
}

function hasLegacyFields(effects: DisplayPageMediaEffects | null | undefined) {
  return Boolean(effects?.edgeFade || effects?.bottomFade || effects?.blur || effects?.opacity);
}

function resolveLegacyLayers(effects: DisplayPageLegacyMediaEffects) {
  const layers: DisplayPageMediaEffectLayer[] = [];
  const legacyBlurStrength = resolveEnabled(effects.blur?.enabled, false)
    ? clampNumber(
        effects.blur?.amount,
        displayPageMediaEffectBounds.blurAmount.min,
        displayPageMediaEffectBounds.blurAmount.max,
        16
      )
    : 16;

  if (resolveEnabled(effects.edgeFade?.enabled, false)) {
    const zone = effects.edgeFade?.direction === "right" ? "right" : "left";
    const coverage = clampNumber(
      effects.edgeFade?.width,
      displayPageMediaEffectBounds.edgeFadeWidth.min,
      displayPageMediaEffectBounds.edgeFadeWidth.max,
      0.56
    );
    layers.push(
      {
        coverage,
        kind: "fade",
        strength: 1,
        zone
      },
      {
        blur: legacyBlurStrength,
        coverage,
        kind: "mist",
        strength: 0.72,
        zone
      }
    );
  }

  if (resolveEnabled(effects.bottomFade?.enabled, false)) {
    const coverage = clampNumber(
      effects.bottomFade?.height,
      displayPageMediaEffectBounds.bottomFadeHeight.min,
      displayPageMediaEffectBounds.bottomFadeHeight.max,
      0.46
    );
    layers.push(
      {
        coverage,
        kind: "fade",
        strength: 1,
        zone: "bottom"
      },
      {
        blur: legacyBlurStrength,
        coverage,
        kind: "mist",
        strength: 0.72,
        zone: "bottom"
      }
    );
  }

  if (resolveEnabled(effects.blur?.enabled, false)) {
    layers.push({
      kind: "blur",
      strength: legacyBlurStrength,
      zone: "full-frame"
    });
  }

  if (resolveEnabled(effects.opacity?.enabled, false)) {
    layers.push({
      kind: "opacity",
      strength: clampNumber(
        effects.opacity?.value,
        displayPageMediaEffectBounds.opacityValue.min,
        displayPageMediaEffectBounds.opacityValue.max,
        1
      ),
      zone: "full-frame"
    });
  }

  return layers;
}

function resolveDefaultEffects(
  defaults: DisplayPageMediaEffectResolverOptions["defaults"]
): DisplayPageMediaEffects {
  if (Array.isArray(defaults)) {
    return {
      layers: defaults.map((layer) => ({ ...layer }))
    };
  }

  return createDisplayPageMediaEffects(defaults);
}

export function createDisplayPageMediaEffects(
  overrides: Partial<DisplayPageMediaEffects> = {}
): DisplayPageMediaEffects {
  if (Array.isArray(overrides.layers)) {
    return {
      layers: overrides.layers.map((layer) => ({ ...layer }))
    };
  }

  const layers = resolveLegacyLayers(overrides);
  return {
    layers
  };
}

export function resolveDisplayPageMediaEffects(
  effects: DisplayPageMediaEffects | null | undefined,
  options: DisplayPageMediaEffectResolverOptions = {}
): DisplayPageResolvedMediaEffects {
  const support = normalizeSupport(options.support);
  const defaultEffects = resolveDefaultEffects(options.defaults);
  const canonicalSource = Array.isArray(effects?.layers)
    ? effects.layers
    : Array.isArray(defaultEffects.layers)
      ? defaultEffects.layers
      : [];
  const usesCanonicalLayers = Array.isArray(effects?.layers);
  const sourceLayers = usesCanonicalLayers
    ? canonicalSource
    : hasLegacyFields(effects)
      ? resolveLegacyLayers(effects ?? {})
      : canonicalSource;

  return {
    layers: sourceLayers
      .map((layer) => resolveCanonicalLayer(layer, support))
      .filter((layer): layer is DisplayPageResolvedMediaEffectLayer => Boolean(layer))
      .filter((layer) => layer.enabled),
    support,
    usesCanonicalLayers,
    usesLegacyFields: !usesCanonicalLayers && hasLegacyFields(effects)
  };
}
