import { useState } from "react";
import type { MetricScope } from "@solar-display/shared";
import type { GenericMappingPatch, SourceRow } from "./SourcesModel";

export type SourceInspectorMappingFormProps = {
  onChange: (id: number, patch: GenericMappingPatch) => void;
  onDelete?: (id: number) => void;
  onPublishTest?: (metricScope: MetricScope, metricKey: string, value: number) => Promise<void>;
  row: SourceRow & { kind: "generic" };
  siteChoicePending?: boolean;
};

export function SourceInspectorMappingForm({
  onChange,
  onDelete,
  onPublishTest,
  row,
  siteChoicePending = false
}: SourceInspectorMappingFormProps) {
  const [testValue, setTestValue] = useState("10.5");
  const [isPublishing, setIsPublishing] = useState(false);
  const mapping = row.mapping;

  const handleTestPublish = async () => {
    if (!onPublishTest || !mapping.metricScope || !mapping.metricKey) return;
    const num = parseFloat(testValue);
    if (isNaN(num)) return;
    setIsPublishing(true);
    try {
      await onPublishTest(mapping.metricScope, mapping.metricKey, num);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="mgmt-card space-y-4 p-4" data-inspector-mapping-form data-source-kind="generic">
      <div className="flex items-center justify-between border-b border-[#edf2ee] pb-3">
        <h3 className="text-[14px] font-semibold text-[#1e2821]">MQTT 主題與指標對應</h3>
        <label className="flex items-center gap-2 text-xs font-medium text-[#4d554f]">
          <input
            checked={mapping.enabled}
            disabled={!row.editable}
            name="enabled"
            onChange={(e) => onChange(mapping.id, { enabled: e.target.checked })}
            type="checkbox"
          />
          啟用此資料來源
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-[#4d554f]">
          中文名稱
          <input
            className="mgmt-input min-h-[40px] text-sm"
            disabled={!row.editable}
            name="nameZh"
            onChange={(e) => onChange(mapping.id, { nameZh: e.target.value })}
            onInput={(e) => onChange(mapping.id, { nameZh: (e.target as HTMLInputElement).value })}
            placeholder="例如：觀音沖床"
            value={mapping.nameZh ?? ""}
          />
        </label>

        <label className="grid gap-1 text-xs text-[#4d554f]">
          英文名稱
          <input
            className="mgmt-input min-h-[40px] text-sm"
            disabled={!row.editable}
            name="nameEn"
            onChange={(e) => onChange(mapping.id, { nameEn: e.target.value })}
            onInput={(e) => onChange(mapping.id, { nameEn: (e.target as HTMLInputElement).value })}
            placeholder="例如：KN Stamping"
            value={mapping.nameEn ?? ""}
          />
        </label>

        <label className="grid gap-1 text-xs text-[#4d554f]">
          廠區 (Scope)
          <select
            className="mgmt-input min-h-[40px] text-sm"
            disabled={!row.editable}
            name="metricScope"
            onChange={(e) => onChange(mapping.id, { metricScope: e.target.value as MetricScope })}
            value={siteChoicePending ? "" : (mapping.metricScope ?? "")}
          >
            {siteChoicePending ? <option value="">請選擇 CL 或 KN 廠區</option> : null}
            <option value="cl">中壢 (CL)</option>
            <option value="kn">觀音 (KN)</option>
            <option value="global">全廠 (Global)</option>
          </select>
        </label>

        <label className="grid gap-1 text-xs text-[#4d554f]">
          指標代碼 (Metric Key)
          <input
            className="mgmt-input min-h-[40px] text-sm"
            disabled={!row.editable}
            name="metricKey"
            onChange={(e) => onChange(mapping.id, { metricKey: e.target.value })}
            onInput={(e) => onChange(mapping.id, { metricKey: (e.target as HTMLInputElement).value })}
            placeholder="例如：factoryCircuit.stampingPower"
            value={mapping.metricKey}
          />
        </label>

        <label className="col-span-full grid gap-1 text-xs text-[#4d554f]">
          MQTT 主題 (Topic)
          <input
            className="mgmt-input min-h-[40px] font-mono text-sm"
            disabled={!row.editable}
            name="topic"
            onChange={(e) => onChange(mapping.id, { topic: e.target.value })}
            onInput={(e) => onChange(mapping.id, { topic: (e.target as HTMLInputElement).value })}
            placeholder="例如：factory/kn/stamping"
            value={mapping.topic}
          />
        </label>

        <label className="grid gap-1 text-xs text-[#4d554f]">
          數值路徑 (JSON Path)
          <input
            className="mgmt-input min-h-[40px] font-mono text-sm"
            disabled={!row.editable}
            name="valuePath"
            onChange={(e) => onChange(mapping.id, { valuePath: e.target.value })}
            onInput={(e) => onChange(mapping.id, { valuePath: (e.target as HTMLInputElement).value })}
            placeholder="留空代表根數值，或輸入 $.value"
            value={mapping.valuePath ?? ""}
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-xs text-[#4d554f]">
            倍率 (Multiplier)
            <input
              className="mgmt-input min-h-[40px] text-sm"
              disabled={!row.editable}
              name="multiplier"
              onChange={(e) => onChange(mapping.id, { multiplier: parseFloat(e.target.value) || 1 })}
              onInput={(e) => onChange(mapping.id, { multiplier: parseFloat((e.target as HTMLInputElement).value) || 1 })}
              type="number"
              value={mapping.multiplier ?? 1}
            />
          </label>

          <label className="grid gap-1 text-xs text-[#4d554f]">
            單位 (Unit)
            <input
              className="mgmt-input min-h-[40px] text-sm"
              disabled={!row.editable}
              name="unit"
              onChange={(e) => onChange(mapping.id, { unit: e.target.value })}
              onInput={(e) => onChange(mapping.id, { unit: (e.target as HTMLInputElement).value })}
              placeholder="kW, kWh..."
              value={mapping.unit}
            />
          </label>
        </div>
      </div>

      {onPublishTest && mapping.metricScope && mapping.metricKey ? (
        <div className="flex flex-wrap items-end gap-2 border-t border-[#edf2ee] pt-3">
          <label className="grid gap-1 text-xs text-[#687169]">
            <span>測試發佈 (Test Publish)</span>
            <input
              className="mgmt-input min-h-[40px] w-28 text-sm"
              onChange={(e) => setTestValue(e.target.value)}
              type="text"
              value={testValue}
            />
          </label>
          <button
            className="mgmt-action min-h-[40px]"
            disabled={isPublishing}
            onClick={() => void handleTestPublish()}
            type="button"
          >
            {isPublishing ? "發佈中..." : "發佈"}
          </button>
        </div>
      ) : null}

      {onDelete && row.editable ? (
        <div className="border-t border-[#edf2ee] pt-3 text-right">
          <button
            className="text-xs text-[#c5221f] hover:underline"
            onClick={() => onDelete(mapping.id)}
            type="button"
          >
            刪除此來源設定
          </button>
        </div>
      ) : null}
    </div>
  );
}
