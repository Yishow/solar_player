import type { DisplayEditorPath } from "../../../../../packages/shared/src/displayEditorSchema";
import {
  displayEditorPathKey
} from "../../../../../packages/shared/src/displayEditorSchema";
import type { DisplayPageFreeformObject } from "@solar-display/shared";
import { WorkspaceActionBar, WorkspaceBoard } from "../../components/workspaceSurface";
import type { ResolvedDisplayEditorField, ResolvedDisplayEditorRegion } from "./inspectorFields";
import {
  resolveDisplayPageMediaEffectBinding,
  resolveDisplayPageMediaEffectSummary
} from "./displayPageMediaEffectAuthoring";
import { localizeDisplayEditorLabel } from "./localization";

export type SourceConnectionRow = {
  label: string;
  value: string;
};

export type SourcePresentationSummary = {
  label: string;
  value: string;
};

type SourceReplacementSupport =
  | { enabled: true }
  | { enabled: false; reason: string };

function pathTail(path: DisplayEditorPath) {
  return String(path[path.length - 1] ?? "");
}

function formatValue(value: unknown) {
  if (typeof value === "number" || typeof value === "string") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "啟用" : "停用";
  }

  if (value === null || value === undefined || value === "") {
    return "未設定";
  }

  return JSON.stringify(value);
}

function isSourceField(field: ResolvedDisplayEditorField) {
  const tail = pathTail(field.path);
  return [
    "assetId",
    "fallbackSrc",
    "glyphName",
    "iconKey",
    "mode",
    "ornamentKey",
    "registry",
    "sourceMode",
    "src"
  ].includes(tail);
}

function isPresentationField(field: ResolvedDisplayEditorField) {
  const key = displayEditorPathKey(field.path);
  return /effects|fitMode|focusX|focusY|alignX|alignY|opacity|rotation/.test(key);
}

function rowLabel(field: ResolvedDisplayEditorField) {
  const tail = pathTail(field.path);
  if (tail === "sourceMode" || tail === "mode") return "來源模式";
  if (tail === "assetId") return "已管理素材";
  if (tail === "src") return "直接來源";
  if (tail === "fallbackSrc") return "備援來源";
  if (tail === "registry") return "圖示庫";
  if (tail === "iconKey") return "圖示鍵值";
  if (tail === "glyphName") return "參考符號";
  if (tail === "ornamentKey") return "裝飾";
  return localizeDisplayEditorLabel(field.schema.label);
}

function resolveSeedDefaultDescription(selectedRegion: ResolvedDisplayEditorRegion | null) {
  if (!selectedRegion) {
    return null;
  }

  return `${localizeDisplayEditorLabel(selectedRegion.label)}預設素材`;
}

function resolveFreeformObjectLabel(freeformObject: DisplayPageFreeformObject) {
  switch (freeformObject.type) {
    case "asset-image":
      return "自由圖片物件";
    case "icon-asset":
      return "自由圖示物件";
    case "line":
    default:
      return "自由線條物件";
  }
}

function fieldSchemaTail(path: DisplayEditorPath) {
  return String(path[path.length - 1] ?? "");
}

function schemaSupportsManagedReplacement(selectedRegion: ResolvedDisplayEditorRegion | null) {
  const schemaFields = selectedRegion?.schema.fields ?? [];

  if (schemaFields.some((field) => fieldSchemaTail(field.path) === "sourceMode")) {
    return true;
  }

  const modeField = schemaFields.find((field) => fieldSchemaTail(field.path) === "mode");
  if (modeField?.fieldType === "select" && "options" in modeField) {
    const optionValues = modeField.options.map((option) => String(option.value));
    if (optionValues.includes("managed-asset") || optionValues.includes("asset-image")) {
      return true;
    }
  }

  return schemaFields.some((field) => fieldSchemaTail(field.path) === "assetId");
}

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

export function resolveSourceConnectionRegion(
  selectedRegion: ResolvedDisplayEditorRegion | null,
  availableRegions: ResolvedDisplayEditorRegion[] = []
) {
  if (!selectedRegion) {
    return null;
  }

  if (schemaSupportsManagedReplacement(selectedRegion) || selectedRegion.fields.some((field) => isSourceField(field))) {
    return selectedRegion;
  }

  return availableRegions.find((region) =>
    region.id !== selectedRegion.id
    && sameGeometryBinding(selectedRegion, region)
    && schemaSupportsManagedReplacement(region)
  ) ?? selectedRegion;
}

function resolveSourceReplacementSupport(args: {
  freeformObject?: DisplayPageFreeformObject | null;
  selectedRegion: ResolvedDisplayEditorRegion | null;
}): SourceReplacementSupport {
  if (args.freeformObject && args.freeformObject.type !== "line") {
    return { enabled: true };
  }

  if (schemaSupportsManagedReplacement(args.selectedRegion)) {
    return { enabled: true };
  }

  return { enabled: false, reason: "此來源型別尚未支援管理素材替換。" };
}

export function resolveSourceConnectionRows(args: {
  freeformObject?: DisplayPageFreeformObject | null;
  selectedRegion: ResolvedDisplayEditorRegion | null;
}) {
  const rows: SourceConnectionRow[] = [];

  if (args.freeformObject && args.freeformObject.type !== "line") {
    rows.push({ label: "來源模式", value: args.freeformObject.source.kind });
    rows.push({ label: "已管理素材", value: formatValue(args.freeformObject.source.assetId) });
    rows.push({ label: "備援來源", value: formatValue(args.freeformObject.source.fallbackSrc) });
    return rows;
  }

  for (const field of args.selectedRegion?.fields ?? []) {
    if (isSourceField(field)) {
      rows.push({
        label: rowLabel(field),
        value: formatValue(field.value)
      });

      if (pathTail(field.path) === "sourceMode" && field.value === "seed-default") {
        const seedDefaultDescription = resolveSeedDefaultDescription(args.selectedRegion);
        if (seedDefaultDescription) {
          rows.push({
            label: "預設來源",
            value: seedDefaultDescription
          });
        }
      }
    }
  }

  return rows;
}

export function resolveSourcePresentationSummary(selectedRegion: ResolvedDisplayEditorRegion | null) {
  const summaries: SourcePresentationSummary[] = [];

  for (const field of selectedRegion?.fields ?? []) {
    if (!isPresentationField(field)) {
      continue;
    }

    summaries.push({
      label: localizeDisplayEditorLabel(field.schema.label),
      value: formatValue(field.value)
    });
  }

  return summaries;
}

function findSeedDefaultPath(selectedRegion: ResolvedDisplayEditorRegion | null) {
  return selectedRegion?.fields.find((field) => pathTail(field.path) === "sourceMode")?.path ?? null;
}

export function SourceConnectionPanel({
  availableRegions = [],
  config,
  editMode,
  freeformObject,
  onJumpToProperties,
  onOpenAssetLibrary,
  onRestoreSeedDefault,
  selectedRegion
}: {
  availableRegions?: ResolvedDisplayEditorRegion[];
  config?: Record<string, unknown>;
  editMode: boolean;
  freeformObject?: DisplayPageFreeformObject | null;
  onJumpToProperties: () => void;
  onOpenAssetLibrary: () => void;
  onRestoreSeedDefault: (path: DisplayEditorPath) => void;
  selectedRegion: ResolvedDisplayEditorRegion | null;
}) {
  const sourceRegion = resolveSourceConnectionRegion(selectedRegion, availableRegions);
  const rows = resolveSourceConnectionRows({ freeformObject, selectedRegion: sourceRegion });
  const summaries = resolveSourcePresentationSummary(sourceRegion);
  const seedDefaultPath = findSeedDefaultPath(sourceRegion);
  const replacementSupport = resolveSourceReplacementSupport({ freeformObject, selectedRegion: sourceRegion });
  const effectBinding = config ? resolveDisplayPageMediaEffectBinding(config, sourceRegion) : null;
  const effectSummary =
    sourceRegion?.schema.mediaEffectSurface?.status === "supported" && effectBinding
      ? resolveDisplayPageMediaEffectSummary(
          effectBinding.binding?.effects ?? [],
          sourceRegion.schema.mediaEffectSurface.support ?? {}
        )
      : [];
  const effectSurfaceReason =
    sourceRegion?.schema.mediaEffectSurface?.status === "unsupported"
      ? sourceRegion.schema.mediaEffectSurface.reason
      : "";
  const panelLabel = sourceRegion
    ? localizeDisplayEditorLabel(sourceRegion.label)
    : freeformObject
      ? resolveFreeformObjectLabel(freeformObject)
      : null;
  const isLinkedFromDifferentSelection =
    Boolean(sourceRegion && selectedRegion && sourceRegion.id !== selectedRegion.id);

  if (!editMode) {
    return <p className="text-[14px] leading-7 text-[var(--shell-copy-ink)]">按 E 啟用編輯模式後可檢視來源連接。</p>;
  }

  if (!selectedRegion && !freeformObject) {
    return <p className="text-[14px] leading-7 text-[var(--shell-copy-ink)]">請先選取畫布區域或自由物件。</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-[16px] font-semibold text-[var(--shell-title-ink)]">{panelLabel}</h4>
        <p className="mt-1 text-[12px] leading-5 text-[var(--shell-copy-ink)]">目前選取項目的來源連接摘要。</p>
        {isLinkedFromDifferentSelection ? (
          <p className="mt-1 text-[12px] leading-5 text-[var(--shell-subtitle-ink)]">
            目前畫布選到的是版位容器，來源替換與霧化設定已連到對應的素材區域。
          </p>
        ) : null}
      </div>
      {rows.length > 0 ? (
        <div className="grid gap-2">
          {rows.map((row) => (
            <WorkspaceBoard
              key={`${row.label}:${row.value}`}
              className="rounded-[14px] px-3 py-2"
              surface="detail-board"
              tone="base"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--shell-subtitle-ink)]">
                {row.label}
              </div>
              <div className="mt-1 break-all text-[13px] text-[var(--shell-title-ink)]">{row.value}</div>
            </WorkspaceBoard>
          ))}
        </div>
      ) : (
        <WorkspaceBoard className="rounded-[14px] px-3 py-2 text-[13px] text-[var(--shell-copy-ink)]" surface="empty-state" tone="empty">
          這個選取項目沒有可辨識的來源欄位。
        </WorkspaceBoard>
      )}
      <WorkspaceActionBar className="static grid gap-2 rounded-[14px] px-3 py-3 shadow-none" surface="sticky-actions">
        <button
          type="button"
          className="rounded-full border border-[var(--shell-divider)] px-3 py-2 text-[12px] font-semibold text-[var(--shell-copy-ink)] disabled:opacity-50"
          disabled={!replacementSupport.enabled}
          onClick={() => {
            if (replacementSupport.enabled) {
              onOpenAssetLibrary();
            }
          }}
        >
          從圖庫替換 / 開啟資產庫
        </button>
        {!replacementSupport.enabled ? (
          <p className="text-[12px] text-[var(--shell-subtitle-ink)]">{replacementSupport.reason}</p>
        ) : null}
        <button
          type="button"
          className="rounded-full border border-[var(--shell-divider)] px-3 py-2 text-[12px] font-semibold text-[var(--shell-copy-ink)] disabled:opacity-50"
          disabled={!seedDefaultPath}
          onClick={() => {
            if (seedDefaultPath) {
              onRestoreSeedDefault(seedDefaultPath);
            }
          }}
        >
          回復預設素材來源
        </button>
        {!seedDefaultPath ? (
          <p className="text-[12px] text-[var(--shell-subtitle-ink)]">此選取項目目前沒有可直接回復的預設來源模式。</p>
        ) : null}
        <button
          type="button"
          className="rounded-full bg-[var(--shell-accent)] px-3 py-2 text-[12px] font-semibold text-white"
          onClick={onJumpToProperties}
        >
          回到屬性調整呈現
        </button>
      </WorkspaceActionBar>
      {summaries.length > 0 ? (
        <WorkspaceBoard className="rounded-[14px] px-3 py-2" surface="summary-board" tone="subtle">
          <div className="text-[12px] font-semibold text-[var(--shell-title-ink)]">呈現設定摘要</div>
          <div className="mt-2 grid gap-1 text-[12px] text-[var(--shell-copy-ink)]">
            {summaries.map((summary) => (
              <div key={`${summary.label}:${summary.value}`}>
                {summary.label}: {summary.value}
              </div>
            ))}
          </div>
        </WorkspaceBoard>
      ) : null}
      {effectSummary.length > 0 ? (
        <WorkspaceBoard className="rounded-[14px] px-3 py-2" surface="effect-summary-board" tone="subtle">
          <div className="text-[12px] font-semibold text-[var(--shell-title-ink)]">效果摘要</div>
          <div className="mt-2 grid gap-1 text-[12px] text-[var(--shell-copy-ink)]">
            {effectSummary.map((item) => (
              <div key={`${item.label}:${item.value}`}>
                {item.label}: {item.value}
              </div>
            ))}
          </div>
        </WorkspaceBoard>
      ) : null}
      {!effectSummary.length && effectSurfaceReason ? (
        <WorkspaceBoard className="rounded-[14px] px-3 py-2 text-[12px] leading-5 text-[var(--shell-subtitle-ink)]" surface="blocked-state" tone="subtle">
          效果摘要: {effectSurfaceReason}
        </WorkspaceBoard>
      ) : null}
    </div>
  );
}
