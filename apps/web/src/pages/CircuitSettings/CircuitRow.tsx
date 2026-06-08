import { displayCircuitSlotKeys, type CircuitConfig } from "@solar-display/shared";
import { memo } from "react";
import { Switch, CustomSelect } from "../../components/management";
import type { buildCircuitSettingsViewModel } from "./viewModel";

export type CircuitRowModel = ReturnType<typeof buildCircuitSettingsViewModel>["rows"][number];

export type CircuitRowProps = {
  row: CircuitRowModel;
  handleFieldChange: <Key extends keyof CircuitConfig>(
    id: number,
    key: Key,
    value: CircuitConfig[Key]
  ) => void;
  handleDelete: (id: number) => Promise<void>;
  parseNumberInput: (value: string, fallback?: number) => number;
};

const slotLabelMap: Record<string, string> = {
  ev: "EV",
  hvac: "HVAC",
  infrastructure: "Infrastructure",
  lighting: "Lighting",
  office: "Office",
  production: "Production"
};

const iconGlyphMap: Record<string, string> = {
  bolt: "⚡",
  car: "🚗",
  fan: "❄",
  light: "☀"
};

const slotSelectOptions = [
  { label: "未綁定 slot", value: "" },
  ...displayCircuitSlotKeys.map((slot) => ({
    label: slotLabelMap[slot] ?? slot,
    value: slot,
  })),
];

function chipClass(tone: string) {
  if (tone === "success") return "mgmt-chip is-success";
  if (tone === "warning") return "mgmt-chip is-warning";
  if (tone === "danger") return "mgmt-chip is-danger";
  if (tone === "accent") return "mgmt-chip is-accent";
  return "mgmt-chip";
}

function iconGlyph(icon: string | null | undefined) {
  if (!icon) return "·";
  return iconGlyphMap[icon] ?? "·";
}

export const CircuitRow = memo(function CircuitRow({
  row,
  handleFieldChange,
  handleDelete,
  parseNumberInput
}: CircuitRowProps) {
  return (
    <tr
      className={`${row.isDirty ? "is-dirty" : ""} ${row.enabled ? "" : "is-disabled"}`}
    >
      <td className="col-order">
        <input
          className="cs-input cs-input--order"
          type="number"
          min={1}
          value={row.displayOrder ?? 0}
          onChange={(event) =>
            handleFieldChange(row.id, "displayOrder", parseNumberInput(event.target.value, 1))
          }
        />
      </td>
      <td className="col-name">
        <div className="cs-name-stack">
          <input
            className="cs-input cs-input--zh"
            placeholder="中文名稱"
            value={row.nameZh ?? ""}
            onChange={(event) => handleFieldChange(row.id, "nameZh", event.target.value)}
          />
          <input
            className="cs-input"
            placeholder="English"
            value={row.nameEn ?? ""}
            onChange={(event) => handleFieldChange(row.id, "nameEn", event.target.value)}
          />
          <p className="cs-cell-caption">
            額定 {row.ratedCapacity ?? 0} {row.unitLabel}
          </p>
        </div>
      </td>
      <td className="col-icon">
        <div className="cs-icon-stack">
          <div className="cs-icon-row">
            <span className="cs-icon-glyph">{iconGlyph(row.icon)}</span>
            <CustomSelect
              value={row.icon ?? ""}
              onChange={(value) => handleFieldChange(row.id, "icon", value)}
              options={row.iconOptions}
            />
          </div>
          <CustomSelect
            value={row.unit ?? ""}
            onChange={(value) => handleFieldChange(row.id, "unit", value)}
            options={row.unitOptions}
          />
        </div>
      </td>
      <td className="col-topic">
        <input
          className="cs-input"
          placeholder="factory/power/..."
          value={row.mqttTopic ?? ""}
          onChange={(event) => handleFieldChange(row.id, "mqttTopic", event.target.value)}
        />
        <p className="cs-cell-caption">{row.topicLabel}</p>
      </td>
      <td className="col-thr">
        <div className="cs-thr">
          <input
            className="cs-input is-narrow"
            type="number"
            value={row.normalMin ?? 0}
            onChange={(event) => handleFieldChange(row.id, "normalMin", parseNumberInput(event.target.value))}
          />
          <small>—</small>
          <input
            className="cs-input is-narrow"
            type="number"
            value={row.normalMax ?? 0}
            onChange={(event) => handleFieldChange(row.id, "normalMax", parseNumberInput(event.target.value))}
          />
        </div>
        <p className="cs-thr-pill cs-thr-pill--normal">{row.normalRangeLabel}</p>
      </td>
      <td className="col-thr">
        <div className="cs-thr">
          <input
            className="cs-input is-narrow"
            type="number"
            value={row.attentionMin ?? 0}
            onChange={(event) => handleFieldChange(row.id, "attentionMin", parseNumberInput(event.target.value))}
          />
          <small>—</small>
          <input
            className="cs-input is-narrow"
            type="number"
            value={row.attentionMax ?? 0}
            onChange={(event) => handleFieldChange(row.id, "attentionMax", parseNumberInput(event.target.value))}
          />
        </div>
        <p className="cs-thr-pill cs-thr-pill--attention">{row.attentionRangeLabel}</p>
      </td>
      <td className="col-thr">
        <div className="cs-thr">
          <input
            className="cs-input is-narrow"
            type="number"
            value={row.warningMin ?? 0}
            onChange={(event) => handleFieldChange(row.id, "warningMin", parseNumberInput(event.target.value))}
          />
          <small>—</small>
          <input
            className="cs-input is-narrow"
            type="number"
            value={row.warningMax ?? 0}
            onChange={(event) => handleFieldChange(row.id, "warningMax", parseNumberInput(event.target.value))}
          />
        </div>
        <p className="cs-thr-pill cs-thr-pill--warning">{row.warningRangeLabel}</p>
      </td>
      <td className="col-display">
        <div className="cs-display-stack">
          <p className="cs-cell-caption">{row.slotImpactLabel}</p>
          <CustomSelect
            value={row.displaySlot ?? ""}
            onChange={(value) =>
              handleFieldChange(
                row.id,
                "displaySlot",
                value === "" ? null : value
              )
            }
            options={slotSelectOptions}
          />
          <div className="cs-toggle">
            <Switch
              ariaLabel={`${row.nameZh ?? "迴路"} 顯示`}
              on={row.enabled}
              onChange={(next) => handleFieldChange(row.id, "enabled", next)}
            />
            <span className="cs-toggle-label">{row.visibilityLabel}</span>
          </div>
          <span className={chipClass(row.validationTone)}>{row.validationLabel}</span>
          <p className="cs-cell-caption">{row.thresholdSummaryLabel}</p>
          <p className="cs-cell-caption">
            Slot: {row.displaySlot ? (slotLabelMap[row.displaySlot] ?? row.displaySlot) : "未綁定"} · {row.validationDetail}
          </p>
        </div>
      </td>
      <td className="col-ops">
        <div className="cs-ops">
          <span className={chipClass(row.dirtyTone)}>{row.dirtyLabel}</span>
          <button
            type="button"
            className="cs-delete"
            disabled={row.deleting}
            onClick={() => void handleDelete(row.id)}
          >
            {row.deleting ? "刪除中..." : "刪除"}
          </button>
        </div>
      </td>
    </tr>
  );
});
