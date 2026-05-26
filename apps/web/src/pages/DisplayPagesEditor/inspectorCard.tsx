import type { ReactNode } from "react";
import { WorkspacePanel } from "../../components/workspaceSurface";
import { DisplayEditorInspectorFields, type ResolvedDisplayEditorRegion } from "./inspectorFields";
import { localizeDisplayEditorLabel } from "./localization";

function InspectorContent({
  actions,
  editMode,
  emptyMessage,
  extraContent,
  onChange,
  onOpenAssetLibrary,
  onResetField,
  selectedRegion
}: {
  actions?: ReactNode;
  editMode: boolean;
  emptyMessage: string;
  extraContent?: ReactNode;
  onChange: Parameters<typeof DisplayEditorInspectorFields>[0]["onChange"];
  onOpenAssetLibrary?: Parameters<typeof DisplayEditorInspectorFields>[0]["onOpenAssetLibrary"];
  onResetField?: Parameters<typeof DisplayEditorInspectorFields>[0]["onResetField"];
  selectedRegion: ResolvedDisplayEditorRegion | null;
}) {
  if (!editMode) {
    return (
      <p className="text-[14px] leading-7 text-[var(--shell-copy-ink)]">
        按 E 啟用編輯模式，然後選取畫布區塊進入後續 phase 的 inspector。
      </p>
    );
  }
  if (!selectedRegion) {
    return <p className="text-[14px] leading-7 text-[var(--shell-copy-ink)]">{emptyMessage}</p>;
  }
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-[16px] font-semibold text-[var(--shell-title-ink)]">
          {localizeDisplayEditorLabel(selectedRegion.label)}
        </h4>
        {selectedRegion.description ? (
          <p className="mt-1 text-[12px] leading-5 text-[var(--shell-copy-ink)]">
            {selectedRegion.description}
          </p>
        ) : null}
      </div>
      {actions}
      {extraContent}
      <DisplayEditorInspectorFields
        fields={selectedRegion.fields}
        onChange={onChange}
        onOpenAssetLibrary={onOpenAssetLibrary}
        onResetField={onResetField}
      />
    </div>
  );
}

export function DisplayEditorInspectorCard({
  actions,
  editMode,
  emptyMessage,
  extraContent,
  flat = false,
  onChange,
  onOpenAssetLibrary,
  onResetField,
  selectedRegion
}: {
  actions?: ReactNode;
  editMode: boolean;
  emptyMessage: string;
  extraContent?: ReactNode;
  flat?: boolean;
  onChange: Parameters<typeof DisplayEditorInspectorFields>[0]["onChange"];
  onOpenAssetLibrary?: Parameters<typeof DisplayEditorInspectorFields>[0]["onOpenAssetLibrary"];
  onResetField?: Parameters<typeof DisplayEditorInspectorFields>[0]["onResetField"];
  selectedRegion: ResolvedDisplayEditorRegion | null;
}) {
  const content = (
    <InspectorContent
      actions={actions}
      editMode={editMode}
      emptyMessage={emptyMessage}
      extraContent={extraContent}
      onChange={onChange}
      onOpenAssetLibrary={onOpenAssetLibrary}
      onResetField={onResetField}
      selectedRegion={selectedRegion}
    />
  );

  if (flat) return content;

  return (
    <WorkspacePanel className="p-5" surface="properties-panel">
      <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[var(--shell-subtitle-ink)]">
        {localizeDisplayEditorLabel("Inspector")}
      </p>
      <div className="mt-3">{content}</div>
    </WorkspacePanel>
  );
}
