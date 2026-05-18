import type { ReactNode } from "react";
import { DisplayEditorInspectorFields, type ResolvedDisplayEditorRegion } from "./inspectorFields";

export function DisplayEditorInspectorCard({
  actions,
  editMode,
  emptyMessage,
  onChange,
  onResetField,
  selectedRegion
}: {
  actions?: ReactNode;
  editMode: boolean;
  emptyMessage: string;
  onChange: Parameters<typeof DisplayEditorInspectorFields>[0]["onChange"];
  onResetField?: Parameters<typeof DisplayEditorInspectorFields>[0]["onResetField"];
  selectedRegion: ResolvedDisplayEditorRegion | null;
}) {
  return (
    <article className="rounded-[28px] border border-[var(--shell-divider)] bg-white/78 p-5 shadow-[0_20px_45px_rgba(80,94,54,0.08)]">
      <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[var(--shell-subtitle-ink)]">
        Inspector
      </p>
      {!editMode ? (
        <p className="mt-3 text-[15px] leading-7 text-[var(--shell-copy-ink)]">
          按 E 啟用編輯模式，然後選取畫布區塊進入後續 phase 的 inspector。
        </p>
      ) : selectedRegion ? (
        <div className="mt-4 space-y-4">
          <div>
            <h4 className="text-[18px] font-semibold text-[var(--shell-title-ink)]">
              {selectedRegion.label}
            </h4>
            {selectedRegion.description ? (
              <p className="mt-1 text-[13px] leading-6 text-[var(--shell-copy-ink)]">
                {selectedRegion.description}
              </p>
            ) : null}
          </div>
          {actions}
          <DisplayEditorInspectorFields
            fields={selectedRegion.fields}
            onChange={onChange}
            onResetField={onResetField}
          />
        </div>
      ) : (
        <p className="mt-3 text-[15px] leading-7 text-[var(--shell-copy-ink)]">{emptyMessage}</p>
      )}
    </article>
  );
}
