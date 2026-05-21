import React, { useMemo, useState } from "react";
import { ManagementShellFrame } from "../../layouts/ManagementShell";
import { useDisplayPageRegistry } from "../../hooks/useDisplayPageRegistry";
import { fallbackPageDefinitions } from "./fallbackPageDefinitions";
import { buildRuntimePageDefinitions } from "./runtimePageDefinitions";
import { runtimePageDefinitions } from "./runtimePageDefinitions";
import { DisplayPagesEditor } from "./index";

export function DisplayPagesEditorRoute({
  initialEditorState,
  renderPreview = true
}: {
  initialEditorState?: {
    editMode?: boolean;
    lockedRegionIds?: string[];
    selectedRegionId?: string | null;
  };
  renderPreview?: boolean;
}) {
  const registry = useDisplayPageRegistry();
  const [editMode, setEditMode] = useState(initialEditorState?.editMode ?? false);
  const pageDefinitions = useMemo(
    () => (registry.pages.length > 0 ? buildRuntimePageDefinitions(registry.pages) : runtimePageDefinitions),
    [registry.pages]
  );

  return (
    <ManagementShellFrame hideChrome={editMode}>
      <DisplayPagesEditor
        editMode={editMode}
        initialEditorState={initialEditorState}
        onEditModeChange={setEditMode}
        pageDefinitions={pageDefinitions.length > 0 ? pageDefinitions : fallbackPageDefinitions}
        renderPreview={renderPreview}
      />
    </ManagementShellFrame>
  );
}
