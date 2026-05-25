import {
  displayPageCardRailTemplateKeys,
  type DisplayPageCardRailTemplateKey
} from "@solar-display/shared";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";
import { localizeDisplayEditorLabel } from "./localization";
import { resolveCardRailTemplateLabel } from "./cardRailTemplateFields";

export function CardRailInspectorActions({
  onAddCard,
  onDeleteCard,
  onDuplicateCard,
  onMoveEarlier,
  onMoveLater,
  onSelectTemplate,
  onToggleVisibility,
  selectedRegion,
  selectedRegionLocked
}: {
  onAddCard: () => void;
  onDeleteCard: () => void;
  onDuplicateCard: () => void;
  onMoveEarlier: () => void;
  onMoveLater: () => void;
  onSelectTemplate: (template: DisplayPageCardRailTemplateKey) => void;
  onToggleVisibility: () => void;
  selectedRegion: ResolvedDisplayEditorRegion;
  selectedRegionLocked: boolean;
}) {
  return (
    <div className="grid gap-3 rounded-[18px] border border-[var(--shell-divider)] bg-[rgba(82,91,66,0.03)] p-3">
      <label className="grid gap-2 text-[12px] font-semibold text-[var(--shell-copy-ink)]">
        <span>{localizeDisplayEditorLabel("Card Template")}</span>
        <select
          className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2 text-[14px] text-[var(--shell-title-ink)] outline-none"
          value={selectedRegion.templateKey}
          onChange={(event) =>
            onSelectTemplate(event.target.value as DisplayPageCardRailTemplateKey)
          }
        >
          {displayPageCardRailTemplateKeys.map((template) => (
            <option key={template} value={template}>
              {localizeDisplayEditorLabel(resolveCardRailTemplateLabel(template))}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 text-[12px] font-semibold"
          disabled={selectedRegionLocked}
          onClick={onAddCard}
        >
          {localizeDisplayEditorLabel("Add Card")}
        </button>
        <button
          type="button"
          className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 text-[12px] font-semibold"
          disabled={selectedRegionLocked}
          onClick={onDuplicateCard}
        >
          {localizeDisplayEditorLabel("Duplicate Card")}
        </button>
        <button
          type="button"
          className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 text-[12px] font-semibold"
          disabled={selectedRegionLocked}
          onClick={onMoveEarlier}
        >
          {localizeDisplayEditorLabel("Move Earlier")}
        </button>
        <button
          type="button"
          className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 text-[12px] font-semibold"
          disabled={selectedRegionLocked}
          onClick={onMoveLater}
        >
          {localizeDisplayEditorLabel("Move Later")}
        </button>
        <button
          type="button"
          className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 text-[12px] font-semibold"
          disabled={selectedRegionLocked}
          onClick={onToggleVisibility}
        >
          {localizeDisplayEditorLabel("Toggle Visible")}
        </button>
        <button
          type="button"
          className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 text-[12px] font-semibold"
          disabled={selectedRegionLocked}
          onClick={onDeleteCard}
        >
          {localizeDisplayEditorLabel("Delete Card")}
        </button>
      </div>
    </div>
  );
}
