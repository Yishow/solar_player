import React from "react";
import { ManagementShellFrame } from "../../layouts/ManagementShell";
import { ShellDecorationEditor } from "./index";

export function ShellDecorationEditorRoute() {
  return (
    <ManagementShellFrame hideChrome>
      <ShellDecorationEditor />
    </ManagementShellFrame>
  );
}
