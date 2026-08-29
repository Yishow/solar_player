import {
  METRIC_DATA_BINDING_SCOPES,
  resolvePlaybackBindingItemConstraints,
  resolvePlaybackMetricCatalog,
  type DisplayDataPreviewItem,
  type DisplayEditorDataBindingCapability,
  type DisplayPreviewContextSelection,
  type MetricBoundItem,
  type MetricDataBindingScope,
  type MetricUnitDisplay,
  type ResolvedDisplayPreviewContext,
  type WidgetDataBindingPageKey
} from "@solar-display/shared";
import { useEffect, useMemo, useState } from "react";
import { getValueAtPath } from "../../hooks/displayPageConfigPaths";
import { useLiveMetrics } from "../../hooks/useLiveMetrics";
import {
  getDeviceGroups,
  getDisplayDataPreview,
  getFleetDevices
} from "../../services/api";
import type { LiveMetricReading } from "../../services/socket";

const precisionOptions = [0, 1, 2, 3] as const;

const scopeLabels: Record<MetricDataBindingScope, string> = {
  "inherit-device": "跟隨預覽裝置",
  cl: "中壢（CL）",
  global: "全域",
  kn: "觀音（KN）"
};

const freshnessLabels = {
  delayed: "延遲",
  historical: "歷史資料",
  live: "即時",
  stale: "過期",
  unavailable: "無資料"
} as const;

type DataBindingItemPatch = {
  metricKey?: string;
  precision?: number | null;
  scope?: MetricDataBindingScope;
  unitDisplay?: MetricUnitDisplay | null;
};

type PreviewContextOption = {
  label: string;
  selection: DisplayPreviewContextSelection;
  value: string;
};

const defaultPreviewContextOptions: PreviewContextOption[] = [
  { label: "中壢（CL）", selection: { kind: "site", siteScope: "cl" }, value: "site:cl" },
  { label: "觀音（KN）", selection: { kind: "site", siteScope: "kn" }, value: "site:kn" }
];

function toPreviewReading(item: DisplayDataPreviewItem | null | undefined): LiveMetricReading | null {
  if (!item || item.value === null || item.timestamp === null) return null;
  return {
    ...(item.freshness ? { freshness: item.freshness } : {}),
    quality: item.quality,
    timestamp: item.timestamp,
    unit: item.unit,
    value: item.value
  };
}

function formatScope(scope: "cl" | "global" | "kn") {
  return scope === "global" ? "全域" : scope.toUpperCase();
}

export function resolvePreviewScopeSummary(args: {
  bindingScope: MetricDataBindingScope;
  context: ResolvedDisplayPreviewContext | null;
  effectiveScope: "cl" | "global" | "kn" | null;
}) {
  const effectiveScope = args.effectiveScope
    ?? (args.bindingScope === "inherit-device" ? args.context?.siteScope ?? null : args.bindingScope);
  if (args.bindingScope === "inherit-device") {
    return {
      effectiveScope,
      label: args.context
        ? `此元件跟隨暫時預覽情境（${args.context.label}）`
        : "此元件跟隨暫時預覽情境"
    };
  }
  return {
    effectiveScope,
    label: args.context
      ? `此元件固定 ${formatScope(args.bindingScope)}，不跟隨 ${args.context.label} 預覽情境`
      : `此元件固定 ${formatScope(args.bindingScope)}`
  };
}

function isMetricBoundItem(value: unknown, itemId: string): value is MetricBoundItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Partial<MetricBoundItem>;
  const binding = item.dataBinding;
  return (
    item.itemId === itemId
    && Boolean(binding)
    && binding?.sourceType === "metric"
    && typeof binding.metricKey === "string"
    && METRIC_DATA_BINDING_SCOPES.includes(binding.scope as MetricDataBindingScope)
  );
}

export function createDataBindingItemUpdate(
  current: MetricBoundItem,
  patch: DataBindingItemPatch
): MetricBoundItem {
  if (
    patch.precision !== undefined
    && patch.precision !== null
    && (!Number.isInteger(patch.precision) || !precisionOptions.includes(patch.precision as 0 | 1 | 2 | 3))
  ) {
    throw new Error("Data inspector precision must be an integer from 0 to 3.");
  }

  const format = {
    ...(current.dataBinding.format ?? {})
  };
  if (patch.precision !== undefined) {
    if (patch.precision === null) delete format.precision;
    else format.precision = patch.precision;
  }
  if (patch.unitDisplay !== undefined) {
    if (patch.unitDisplay === null) delete format.unitDisplay;
    else format.unitDisplay = patch.unitDisplay;
  }

  return {
    dataBinding: {
      ...(Object.keys(format).length > 0 ? { format } : {}),
      metricKey: patch.metricKey ?? current.dataBinding.metricKey,
      scope: patch.scope ?? current.dataBinding.scope,
      sourceType: "metric"
    },
    itemId: current.itemId
  };
}

function formatPreviewValue(
  reading: LiveMetricReading | null | undefined,
  binding: MetricBoundItem["dataBinding"],
  catalogUnit: string | null
) {
  if (!reading) return "尚無資料";
  const value = binding.format?.precision === undefined
    ? String(reading.value)
    : reading.value.toFixed(binding.format.precision);
  const unit = binding.format?.unitDisplay === "hide" ? null : reading.unit ?? catalogUnit;
  return unit ? `${value} ${unit}` : value;
}

export function resolveDataInspectorModel(args: {
  capability: DisplayEditorDataBindingCapability;
  config: Record<string, unknown>;
  pageKey: WidgetDataBindingPageKey;
  previewContext?: ResolvedDisplayPreviewContext | null;
  previewItem?: DisplayDataPreviewItem | null;
  previewReading?: LiveMetricReading | null;
}) {
  const item = getValueAtPath(args.config, args.capability.bindingPath);
  if (!isMetricBoundItem(item, args.capability.itemId)) return null;

  const itemConstraint = resolvePlaybackBindingItemConstraints(args.pageKey)[args.capability.itemId];
  if (!itemConstraint) return null;

  const catalog = resolvePlaybackMetricCatalog(args.pageKey);
  const metricOptions = catalog.filter((entry) => (
    entry.valueType === itemConstraint.valueType
    && (!itemConstraint.widgetRole || !entry.compatibleWidgetRoles || entry.compatibleWidgetRoles.includes(itemConstraint.widgetRole))
    && (!entry.allowedScopes || entry.allowedScopes.includes(item.dataBinding.scope))
  ));
  const selectedMetric = metricOptions.find((entry) => entry.metricKey === item.dataBinding.metricKey);
  if (!selectedMetric) return null;

  const scopeOptions = METRIC_DATA_BINDING_SCOPES.filter((scope) =>
    !selectedMetric.allowedScopes || selectedMetric.allowedScopes.includes(scope)
  ).map((scope) => ({ label: scopeLabels[scope], value: scope }));
  const freshness = args.previewReading?.freshness?.state ?? "unavailable";
  const scopeSummary = resolvePreviewScopeSummary({
    bindingScope: item.dataBinding.scope,
    context: args.previewContext ?? null,
    effectiveScope: args.previewItem?.effectiveScope ?? null
  });

  return {
    binding: item.dataBinding,
    item,
    metricOptions: metricOptions.map((entry) => ({
      label: entry.unit ? `${entry.label}（${entry.unit}）` : entry.label,
      value: entry.metricKey
    })),
    preview: {
      freshness: freshnessLabels[freshness],
      timestamp: args.previewReading?.timestamp ?? null,
      value: formatPreviewValue(args.previewReading, item.dataBinding, selectedMetric.unit)
    },
    provenance: {
      configuredScope: scopeLabels[item.dataBinding.scope],
      effectiveScope: scopeSummary.effectiveScope
        ? formatScope(scopeSummary.effectiveScope)
        : "尚未解析",
      metricKey: selectedMetric.metricKey,
      sourceClass: args.previewItem?.sourceClass ?? selectedMetric.sourceClass,
      topic: args.previewItem?.provenance?.topic ?? null
    },
    scopeSummary,
    scopeOptions
  };
}

export function DataInspectorPanel({
  capability,
  config,
  editMode,
  onChange,
  onReset,
  pageId,
  pageKey,
  previewContext,
  previewItem,
  previewReading
}: {
  capability: DisplayEditorDataBindingCapability;
  config: Record<string, unknown>;
  editMode: boolean;
  onChange: (path: Array<number | string>, value: MetricBoundItem) => void;
  onReset: (path: Array<number | string>) => void;
  pageId?: string;
  pageKey: WidgetDataBindingPageKey;
  previewContext?: ResolvedDisplayPreviewContext | null;
  previewItem?: DisplayDataPreviewItem | null;
  previewReading?: LiveMetricReading | null;
}) {
  const [previewContextOptions, setPreviewContextOptions] = useState(defaultPreviewContextOptions);
  const [previewContextSelection, setPreviewContextSelection] = useState<DisplayPreviewContextSelection>(
    { kind: "site", siteScope: "cl" }
  );
  const [loadedPreviewContext, setLoadedPreviewContext] = useState<ResolvedDisplayPreviewContext | null>(null);
  const [loadedPreviewItem, setLoadedPreviewItem] = useState<DisplayDataPreviewItem | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const shouldLoadManagedPreview = Boolean(pageId) && previewItem === undefined;
  const liveMetrics = useLiveMetrics({
    enabled: previewReading === undefined && !shouldLoadManagedPreview
  });

  useEffect(() => {
    if (!shouldLoadManagedPreview) return;
    let active = true;
    void Promise.all([getFleetDevices(), getDeviceGroups()])
      .then(([devices, groups]) => {
        if (!active) return;
        const groupOptions: PreviewContextOption[] = groups
          .filter((group) => group.enabled)
          .map((group) => ({
            label: `群組：${group.name}（${group.siteScope.toUpperCase()}）`,
            selection: { groupId: group.id, kind: "group" },
            value: `group:${group.id}`
          }));
        const deviceOptions: PreviewContextOption[] = devices
          .filter((device) => device.enabled && device.group?.enabled)
          .map((device) => ({
            label: `裝置：${device.displayName}（${device.group!.siteScope.toUpperCase()}）`,
            selection: { deviceId: device.id, kind: "device" },
            value: `device:${device.id}`
          }));
        setPreviewContextOptions([
          ...defaultPreviewContextOptions,
          ...groupOptions,
          ...deviceOptions
        ]);
      })
      .catch(() => {
        if (active) setPreviewError("無法載入可用的裝置與群組，仍可使用 CL／KN 預覽。");
      });
    return () => {
      active = false;
    };
  }, [shouldLoadManagedPreview]);

  useEffect(() => {
    if (!pageId || !shouldLoadManagedPreview) return;
    let active = true;
    setPreviewLoading(true);
    void getDisplayDataPreview(pageId, previewContextSelection, "draft")
      .then((preview) => {
        if (!active) return;
        setLoadedPreviewContext(preview.context);
        setLoadedPreviewItem(
          preview.items.find((item) => item.itemId === capability.itemId) ?? null
        );
        setPreviewError(null);
      })
      .catch((error) => {
        if (!active) return;
        setLoadedPreviewContext(null);
        setLoadedPreviewItem(null);
        setPreviewError(error instanceof Error ? error.message : "資料預覽失敗。");
      })
      .finally(() => {
        if (active) setPreviewLoading(false);
      });
    return () => {
      active = false;
    };
  }, [capability.itemId, pageId, previewContextSelection, shouldLoadManagedPreview]);

  const currentItem = getValueAtPath(config, capability.bindingPath);
  const metricKey = isMetricBoundItem(currentItem, capability.itemId)
    ? currentItem.dataBinding.metricKey
    : null;
  const effectivePreviewContext = previewContext ?? loadedPreviewContext;
  const effectivePreviewItem = previewItem === undefined ? loadedPreviewItem : previewItem;
  const previewMatchesCurrentBinding = Boolean(
    effectivePreviewItem
    && isMetricBoundItem(currentItem, capability.itemId)
    && effectivePreviewItem.metricKey === currentItem.dataBinding.metricKey
    && effectivePreviewItem.configuredScope === currentItem.dataBinding.scope
  );
  const resolvedPreviewReading = previewReading === undefined
    ? shouldLoadManagedPreview
      ? previewMatchesCurrentBinding
        ? toPreviewReading(effectivePreviewItem)
        : null
      : metricKey
        ? liveMetrics.snapshot.metrics[metricKey]
        : null
    : previewReading;
  const model = resolveDataInspectorModel({
    capability,
    config,
    pageKey,
    previewContext: effectivePreviewContext,
    previewItem: previewMatchesCurrentBinding ? effectivePreviewItem : null,
    previewReading: resolvedPreviewReading
  });
  const selectedPreviewContextValue = useMemo(() => {
    if (previewContext) return previewContext.contextKey;
    if (previewContextSelection.kind === "site") return `site:${previewContextSelection.siteScope}`;
    if (previewContextSelection.kind === "group") return `group:${previewContextSelection.groupId}`;
    return `device:${previewContextSelection.deviceId}`;
  }, [previewContext, previewContextSelection]);

  if (!model) {
    return <p className="text-[12px] text-[#8f452d]">這個項目的資料綁定無法由目前頁面契約解析。</p>;
  }

  const update = (patch: DataBindingItemPatch) => {
    onChange(capability.bindingPath, createDataBindingItemUpdate(model.item, patch));
  };

  return (
    <div className="space-y-4 text-[12px] text-[var(--shell-copy-ink)]">
      <div>
        <p className="text-[13px] font-semibold text-[var(--shell-title-ink)]">Data Inspector</p>
        <p className="mt-1">選擇頁面契約允許的語意資料，設定只會寫入這個穩定 item id。</p>
        <p className="mt-1 font-mono text-[11px] text-[var(--shell-subtitle-ink)]">穩定項目：{capability.itemId}</p>
      </div>

      {pageId ? (
        <div className="space-y-2 rounded-[16px] border border-[var(--shell-accent)] bg-[rgba(95,140,80,0.08)] p-3">
          <label className="block space-y-1">
            <span className="font-semibold text-[var(--shell-title-ink)]">暫時預覽情境</span>
            <select
              aria-label="暫時預覽情境"
              className="w-full rounded-[12px] border border-[var(--shell-divider)] bg-white px-3 py-2"
              disabled={previewContext !== undefined}
              onChange={(event) => {
                const option = previewContextOptions.find(({ value }) => value === event.target.value);
                if (option) setPreviewContextSelection(option.selection);
              }}
              value={selectedPreviewContextValue}
            >
              {previewContextOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <p>{model.scopeSummary.label}</p>
          <p className="text-[11px] text-[var(--shell-subtitle-ink)]">
            Preview Context 只影響此處預覽，不會寫入頁面設定或模擬播放裝置。
          </p>
          {previewLoading ? <p>正在解析預覽資料…</p> : null}
          {previewError ? <p className="text-[#8f452d]">{previewError}</p> : null}
          {!previewLoading && shouldLoadManagedPreview && !previewMatchesCurrentBinding ? (
            <p className="text-[#8f452d]">資料綁定有未儲存變更；儲存草稿後更新預覽。</p>
          ) : null}
        </div>
      ) : null}

      <label className="block space-y-1">
        <span className="font-semibold text-[var(--shell-title-ink)]">語意指標</span>
        <select
          className="w-full rounded-[12px] border border-[var(--shell-divider)] bg-white px-3 py-2 disabled:opacity-55"
          disabled={!editMode}
          onChange={(event) => update({ metricKey: event.target.value })}
          value={model.binding.metricKey}
        >
          {model.metricOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="font-semibold text-[var(--shell-title-ink)]">資料範圍</span>
        <select
          className="w-full rounded-[12px] border border-[var(--shell-divider)] bg-white px-3 py-2 disabled:opacity-55"
          disabled={!editMode}
          onChange={(event) => update({ scope: event.target.value as MetricDataBindingScope })}
          value={model.binding.scope}
        >
          {model.scopeOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1">
          <span className="font-semibold text-[var(--shell-title-ink)]">小數位數</span>
          <select
            className="w-full rounded-[12px] border border-[var(--shell-divider)] bg-white px-3 py-2 disabled:opacity-55"
            disabled={!editMode}
            onChange={(event) => update({ precision: event.target.value === "" ? null : Number(event.target.value) })}
            value={model.binding.format?.precision ?? ""}
          >
            <option value="">自動</option>
            {precisionOptions.map((precision) => <option key={precision} value={precision}>{precision}</option>)}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="font-semibold text-[var(--shell-title-ink)]">單位顯示</span>
          <select
            className="w-full rounded-[12px] border border-[var(--shell-divider)] bg-white px-3 py-2 disabled:opacity-55"
            disabled={!editMode}
            onChange={(event) => update({ unitDisplay: event.target.value as MetricUnitDisplay })}
            value={model.binding.format?.unitDisplay ?? "auto"}
          >
            <option value="auto">顯示</option>
            <option value="hide">隱藏</option>
          </select>
        </label>
      </div>

      <div className="space-y-2 rounded-[16px] border border-[var(--shell-divider)] bg-[rgba(82,91,66,0.04)] p-3">
        <p className="font-semibold text-[var(--shell-title-ink)]">目前預覽值</p>
        <p className="text-[22px] font-semibold text-[var(--shell-title-ink)]">{model.preview.value}</p>
        <p>新鮮度：{model.preview.freshness}</p>
        <p>資料時間：{model.preview.timestamp ?? "尚無資料"}</p>
      </div>

      <div className="space-y-1 rounded-[16px] border border-[var(--shell-divider)] p-3">
        <p className="font-semibold text-[var(--shell-title-ink)]">唯讀來源資訊</p>
        <p>語意鍵值：{model.provenance.metricKey}</p>
        <p>儲存範圍：{model.provenance.configuredScope}</p>
        <p>有效範圍：{model.provenance.effectiveScope}</p>
        <p>來源分類：{model.provenance.sourceClass}</p>
        {model.provenance.topic ? <p>來源 Topic：{model.provenance.topic}</p> : null}
      </div>

      <button
        type="button"
        className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 font-semibold disabled:opacity-45"
        disabled={!editMode}
        onClick={() => onReset(capability.bindingPath)}
      >
        還原預設資料綁定
      </button>
    </div>
  );
}
