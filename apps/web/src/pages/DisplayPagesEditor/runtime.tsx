import React from "react";
import { useDisplayPageRegistry } from "../../hooks/useDisplayPageRegistry";
import { fallbackPageDefinitions } from "./fallbackPageDefinitions";
import { buildRuntimePageDefinitions } from "./runtimePageDefinitions";
import { runtimePageDefinitions } from "./runtimePageDefinitions";
import { DisplayPagesEditor } from "./index";

export function DisplayPagesEditorRoute() {
  const registry = useDisplayPageRegistry();
  const pageDefinitions =
    registry.pages.length > 0 ? buildRuntimePageDefinitions(registry.pages) : runtimePageDefinitions;

  return (
    <DisplayPagesEditor
      pageDefinitions={pageDefinitions.length > 0 ? pageDefinitions : fallbackPageDefinitions}
    />
  );
}
