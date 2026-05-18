import React from "react";
import { runtimePageDefinitions } from "./runtimePageDefinitions";
import { DisplayPagesEditor } from "./index";

export function DisplayPagesEditorRoute() {
  return <DisplayPagesEditor pageDefinitions={runtimePageDefinitions} />;
}
