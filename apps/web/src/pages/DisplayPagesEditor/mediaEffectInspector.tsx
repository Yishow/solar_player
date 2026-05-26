import {
  resolveDisplayPageMediaEffects,
  type DisplayPageMediaEffectKind,
  type DisplayPageMediaEffectLayer
} from "@solar-display/shared";
import React from "react";
import {
  appendDisplayPageMediaEffectLayer,
  applyDisplayPageMediaEffectPreset,
  listSupportedEffectKinds,
  moveDisplayPageMediaEffectLayer,
  removeDisplayPageMediaEffectLayer,
  resolveDisplayPageMediaEffectBinding,
  resolveDisplayPageMediaEffectGuardrails,
  resolveDisplayPageMediaEffectRegion,
  resolveDisplayPageMediaEffectSummary,
  updateDisplayPageMediaEffectLayerKind,
  updateDisplayPageMediaEffectLayerZone,
  writeDisplayPageMediaEffectLayers,
  type DisplayPageMediaEffectPresetKey
} from "./displayPageMediaEffectAuthoring";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";

const presetOptions: Array<{ key: DisplayPageMediaEffectPresetKey; label: string }> = [
  { key: "top-mist", label: "上緣霧化" },
  { key: "side-softening", label: "側邊柔化" },
  { key: "all-edge-fade", label: "四邊淡出" },
  { key: "full-frame-soft-focus", label: "柔焦全畫面" }
];

function kindOptions(kinds: DisplayPageMediaEffectKind[]) {
  return kinds.map((kind) => (
    <option key={kind} value={kind}>
      {kind}
    </option>
  ));
}

function fieldLabel(layer: DisplayPageMediaEffectLayer) {
  switch (layer.kind) {
    case "blur":
      return "模糊強度";
    case "fade":
      return "淡出強度";
    case "mist":
      return "霧化強度";
    case "opacity":
    default:
      return "透明度";
  }
}

export function DisplayPageMediaEffectInspector({
  availableRegions,
  config,
  onConfigChange,
  selectedRegion
}: {
  availableRegions: ResolvedDisplayEditorRegion[];
  config: Record<string, unknown>;
  onConfigChange: (updater: (current: Record<string, unknown>) => Record<string, unknown>) => void;
  selectedRegion: ResolvedDisplayEditorRegion | null;
}) {
  const effectRegion = resolveDisplayPageMediaEffectRegion(selectedRegion, availableRegions);
  const surface = effectRegion?.schema.mediaEffectSurface;
  if (!surface) {
    return null;
  }

  if (surface.status === "unsupported") {
    return (
      <section className="space-y-2 rounded-[16px] border border-[var(--shell-divider)] bg-[rgba(82,91,66,0.03)] p-3">
        <h5 className="text-[13px] font-semibold text-[var(--shell-title-ink)]">媒體效果</h5>
        <p className="text-[12px] leading-6 text-[var(--shell-subtitle-ink)]">{surface.reason}</p>
      </section>
    );
  }

  const bindingState = resolveDisplayPageMediaEffectBinding(config, effectRegion);
  if (!bindingState) {
    return null;
  }

  const supportedKinds = listSupportedEffectKinds(surface.support ?? {});
  const layers = resolveDisplayPageMediaEffects(bindingState.binding?.effects, {
    support: surface.support ?? {}
  }).layers.map((layer) => ({ ...layer })) as DisplayPageMediaEffectLayer[];
  const guardrails = resolveDisplayPageMediaEffectGuardrails(layers, surface.support ?? {});
  const summary = resolveDisplayPageMediaEffectSummary(bindingState.binding?.effects ?? layers, surface.support ?? {});

  return (
    <section className="space-y-3 rounded-[16px] border border-[var(--shell-divider)] bg-[rgba(82,91,66,0.03)] p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h5 className="text-[13px] font-semibold text-[var(--shell-title-ink)]">媒體效果</h5>
          <p className="text-[12px] leading-5 text-[var(--shell-subtitle-ink)]">{effectRegion.label} 目前使用可組合效果層。</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 text-[12px] font-semibold text-[var(--shell-copy-ink)]"
          onClick={() =>
            onConfigChange((current) =>
              writeDisplayPageMediaEffectLayers(
                current,
                bindingState.bindingPath,
                appendDisplayPageMediaEffectLayer(layers, surface.support ?? {}, supportedKinds[0])
              )
            )
          }
        >
          新增效果層
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {presetOptions.map((preset) => (
          <button
            key={preset.key}
            type="button"
            className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 text-[12px] font-semibold text-[var(--shell-copy-ink)]"
            onClick={() =>
              onConfigChange((current) =>
                writeDisplayPageMediaEffectLayers(
                  current,
                  bindingState.bindingPath,
                  applyDisplayPageMediaEffectPreset(layers, preset.key)
                )
              )
            }
          >
            {preset.label}
          </button>
        ))}
      </div>

      {guardrails.length > 0 ? (
        <div className="space-y-1 rounded-[14px] border border-[#d7b364] bg-[rgba(215,179,100,0.12)] p-3">
          <p className="text-[12px] font-semibold text-[#8e6410]">效果提示</p>
          {guardrails.map((message) => (
            <p key={message} className="text-[12px] leading-5 text-[#8e6410]">
              {message}
            </p>
          ))}
        </div>
      ) : null}

      {summary.length > 0 ? (
        <div className="space-y-1 rounded-[14px] bg-white p-3">
          <p className="text-[12px] font-semibold text-[var(--shell-title-ink)]">目前效果堆疊</p>
          {summary.map((item) => (
            <p key={item.label} className="text-[12px] leading-5 text-[var(--shell-copy-ink)]">
              {item.label}: {item.value}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-[12px] leading-5 text-[var(--shell-subtitle-ink)]">目前沒有啟用的效果層。</p>
      )}

      {layers.map((layer, index) => (
        <div key={`effect-layer-${index}`} className="grid gap-2 rounded-[14px] bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="text-[12px] text-[var(--shell-title-ink)]">效果層 {index + 1}</strong>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-[var(--shell-divider)] px-2 py-1 text-[11px] font-semibold text-[var(--shell-copy-ink)]"
                disabled={index === 0}
                onClick={() =>
                  onConfigChange((current) =>
                    writeDisplayPageMediaEffectLayers(
                      current,
                      bindingState.bindingPath,
                      moveDisplayPageMediaEffectLayer(layers, index, index - 1)
                    )
                  )
                }
              >
                上移
              </button>
              <button
                type="button"
                className="rounded-full border border-[var(--shell-divider)] px-2 py-1 text-[11px] font-semibold text-[var(--shell-copy-ink)]"
                disabled={index === layers.length - 1}
                onClick={() =>
                  onConfigChange((current) =>
                    writeDisplayPageMediaEffectLayers(
                      current,
                      bindingState.bindingPath,
                      moveDisplayPageMediaEffectLayer(layers, index, index + 1)
                    )
                  )
                }
              >
                下移
              </button>
              <button
                type="button"
                className="rounded-full border border-[var(--shell-divider)] px-2 py-1 text-[11px] font-semibold text-[var(--shell-copy-ink)]"
                onClick={() =>
                  onConfigChange((current) =>
                    writeDisplayPageMediaEffectLayers(
                      current,
                      bindingState.bindingPath,
                      removeDisplayPageMediaEffectLayer(layers, index)
                    )
                  )
                }
              >
                刪除
              </button>
            </div>
          </div>

          <label className="grid gap-1 text-[12px] text-[var(--shell-copy-ink)]">
            啟用
            <input
              checked={layer.enabled ?? true}
              className="h-4 w-4"
              type="checkbox"
              onChange={(event) =>
                onConfigChange((current) =>
                  writeDisplayPageMediaEffectLayers(
                    current,
                    bindingState.bindingPath,
                    layers.map((entry, layerIndex) =>
                      layerIndex === index ? { ...entry, enabled: event.target.checked } : entry
                    )
                  )
                )
              }
            />
          </label>

          <label className="grid gap-1 text-[12px] text-[var(--shell-copy-ink)]">
            類型
            <select
              className="rounded-[12px] border border-[var(--shell-divider)] px-3 py-2 text-[13px]"
              value={layer.kind}
              onChange={(event) =>
                onConfigChange((current) =>
                  writeDisplayPageMediaEffectLayers(
                    current,
                    bindingState.bindingPath,
                    updateDisplayPageMediaEffectLayerKind(
                      layers,
                      index,
                      event.target.value as DisplayPageMediaEffectKind,
                      surface.support ?? {}
                    )
                  )
                )
              }
            >
              {kindOptions(supportedKinds)}
            </select>
          </label>

          <label className="grid gap-1 text-[12px] text-[var(--shell-copy-ink)]">
            區域
            <select
              className="rounded-[12px] border border-[var(--shell-divider)] px-3 py-2 text-[13px]"
              value={layer.zone}
              onChange={(event) =>
                onConfigChange((current) =>
                  writeDisplayPageMediaEffectLayers(
                    current,
                    bindingState.bindingPath,
                    updateDisplayPageMediaEffectLayerZone(
                      layers,
                      index,
                      event.target.value as DisplayPageMediaEffectLayer["zone"],
                      surface.support ?? {}
                    )
                  )
                )
              }
            >
              {(surface.support?.[layer.kind]?.zones ?? []).map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </label>

          {"coverage" in layer ? (
            <label className="grid gap-1 text-[12px] text-[var(--shell-copy-ink)]">
              覆蓋範圍
              <input
                className="rounded-[12px] border border-[var(--shell-divider)] px-3 py-2 text-[13px]"
                step="0.05"
                type="number"
                value={layer.coverage ?? ""}
                onChange={(event) =>
                  onConfigChange((current) =>
                    writeDisplayPageMediaEffectLayers(
                      current,
                      bindingState.bindingPath,
                      layers.map((entry, layerIndex) =>
                        layerIndex === index ? { ...entry, coverage: Number(event.target.value) } : entry
                      )
                    )
                  )
                }
              />
            </label>
          ) : null}

          {"feather" in layer ? (
            <label className="grid gap-1 text-[12px] text-[var(--shell-copy-ink)]">
              羽化
              <input
                className="rounded-[12px] border border-[var(--shell-divider)] px-3 py-2 text-[13px]"
                step="0.05"
                type="number"
                value={layer.feather ?? ""}
                onChange={(event) =>
                  onConfigChange((current) =>
                    writeDisplayPageMediaEffectLayers(
                      current,
                      bindingState.bindingPath,
                      layers.map((entry, layerIndex) =>
                        layerIndex === index ? { ...entry, feather: Number(event.target.value) } : entry
                      )
                    )
                  )
                }
              />
            </label>
          ) : null}

          <label className="grid gap-1 text-[12px] text-[var(--shell-copy-ink)]">
            {fieldLabel(layer)}
            <input
              className="rounded-[12px] border border-[var(--shell-divider)] px-3 py-2 text-[13px]"
              step={layer.kind === "blur" ? "1" : "0.05"}
              type="number"
              value={layer.strength ?? ""}
              onChange={(event) =>
                onConfigChange((current) =>
                  writeDisplayPageMediaEffectLayers(
                    current,
                    bindingState.bindingPath,
                    layers.map((entry, layerIndex) =>
                      layerIndex === index ? { ...entry, strength: Number(event.target.value) } : entry
                    )
                  )
                )
              }
            />
          </label>

          {"blur" in layer ? (
            <label className="grid gap-1 text-[12px] text-[var(--shell-copy-ink)]">
              局部模糊
              <input
                className="rounded-[12px] border border-[var(--shell-divider)] px-3 py-2 text-[13px]"
                step="1"
                type="number"
                value={layer.blur ?? ""}
                onChange={(event) =>
                  onConfigChange((current) =>
                    writeDisplayPageMediaEffectLayers(
                      current,
                      bindingState.bindingPath,
                      layers.map((entry, layerIndex) =>
                        layerIndex === index ? { ...entry, blur: Number(event.target.value) } : entry
                      )
                    )
                  )
                }
              />
            </label>
          ) : null}
        </div>
      ))}
    </section>
  );
}
