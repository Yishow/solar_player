import type { MetricPickerOption } from "@solar-display/shared";

export function MetricPicker({
  disabled = false,
  onChange,
  options,
  selected
}: {
  disabled?: boolean;
  onChange: (metricKey: string) => void;
  options: MetricPickerOption[];
  selected: string;
}) {
  return (
    <div className="space-y-2" data-metric-picker>
      {options.map((option) => (
        <label className="flex min-h-[40px] items-start gap-2 text-sm" key={`${option.scope}:${option.metricKey}`}>
          <input
            checked={selected === option.metricKey}
            disabled={disabled || !option.compatible}
            name="metric-picker"
            onChange={() => onChange(option.metricKey)}
            type="radio"
            value={option.metricKey}
          />
          <span>
            <strong>{option.labelZh}</strong>
            <span className="block text-[11px] text-[var(--shell-subtitle-ink)]">
              {option.scope} · {option.measurementKind ?? "未標種類"} · {option.unit ?? "無單位"}
              {option.latestValue ? ` · ${option.latestValue}` : ""}
              {option.coverage ? ` · ${option.coverage}` : ""}
            </span>
            {option.incompatibleReason ? <span className="block text-[#8f452d]">{option.incompatibleReason}</span> : null}
          </span>
        </label>
      ))}
    </div>
  );
}
