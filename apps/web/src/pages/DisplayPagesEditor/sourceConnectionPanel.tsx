import type { DisplayEditorPath } from "../../../../../packages/shared/src/displayEditorSchema";
import {
  displayEditorPathKey
} from "../../../../../packages/shared/src/displayEditorSchema";
import type { DisplayPageFreeformObject } from "@solar-display/shared";
import type { ResolvedDisplayEditorField, ResolvedDisplayEditorRegion } from "./inspectorFields";
import { localizeDisplayEditorLabel } from "./localization";

export type SourceConnectionRow = {
  label: string;
  value: string;
};

export type SourcePresentationSummary = {
  label: string;
  value: string;
};

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
  editMode,
  freeformObject,
  onJumpToProperties,
  onOpenAssetLibrary,
  onRestoreSeedDefault,
  selectedRegion
}: {
  editMode: boolean;
  freeformObject?: DisplayPageFreeformObject | null;
  onJumpToProperties: () => void;
  onOpenAssetLibrary: () => void;
  onRestoreSeedDefault: (path: DisplayEditorPath) => void;
  selectedRegion: ResolvedDisplayEditorRegion | null;
}) {
  const rows = resolveSourceConnectionRows({ freeformObject, selectedRegion });
  const summaries = resolveSourcePresentationSummary(selectedRegion);
  const seedDefaultPath = findSeedDefaultPath(selectedRegion);

  if (!editMode) {
    return <p className="text-[14px] leading-7 text-[var(--shell-copy-ink)]">按 E 啟用編輯模式後可檢視來源連接。</p>;
  }

  if (!selectedRegion) {
    return <p className="text-[14px] leading-7 text-[var(--shell-copy-ink)]">請先選取畫布區域或自由物件。</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-[16px] font-semibold text-[var(--shell-title-ink)]">
          {localizeDisplayEditorLabel(selectedRegion.label)}
        </h4>
        <p className="mt-1 text-[12px] leading-5 text-[var(--shell-copy-ink)]">目前選取項目的來源連接摘要。</p>
      </div>
      {rows.length > 0 ? (
        <div className="grid gap-2">
          {rows.map((row) => (
            <div
              key={`${row.label}:${row.value}`}
              className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--shell-subtitle-ink)]">
                {row.label}
              </div>
              <div className="mt-1 break-all text-[13px] text-[var(--shell-title-ink)]">{row.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[14px] border border-dashed border-[var(--shell-divider)] px-3 py-2 text-[13px] text-[var(--shell-copy-ink)]">
          這個選取項目沒有可辨識的來源欄位。
        </div>
      )}
      <div className="grid gap-2">
        <button
          type="button"
          className="rounded-full border border-[var(--shell-divider)] px-3 py-2 text-[12px] font-semibold text-[var(--shell-copy-ink)]"
          onClick={onOpenAssetLibrary}
        >
          從圖庫替換 / 開啟資產庫
        </button>
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
          回復 seed/default source
        </button>
        {!seedDefaultPath ? (
          <p className="text-[12px] text-[var(--shell-subtitle-ink)]">此選取項目尚無可直接回復的 seed source mode。</p>
        ) : null}
        <button
          type="button"
          className="rounded-full bg-[var(--shell-accent)] px-3 py-2 text-[12px] font-semibold text-white"
          onClick={onJumpToProperties}
        >
          回到屬性調整呈現
        </button>
      </div>
      {summaries.length > 0 ? (
        <div className="rounded-[14px] border border-[var(--shell-divider)] bg-[rgba(82,91,66,0.04)] px-3 py-2">
          <div className="text-[12px] font-semibold text-[var(--shell-title-ink)]">呈現設定摘要</div>
          <div className="mt-2 grid gap-1 text-[12px] text-[var(--shell-copy-ink)]">
            {summaries.map((summary) => (
              <div key={`${summary.label}:${summary.value}`}>
                {summary.label}: {summary.value}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
