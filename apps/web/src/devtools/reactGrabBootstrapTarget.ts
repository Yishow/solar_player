import { fileURLToPath } from "node:url";

export const REACT_GRAB_BOOTSTRAP_ALIAS = "@devtools/react-grab-bootstrap";

export function resolveReactGrabBootstrapTarget(mode: string) {
  return fileURLToPath(
    new URL(mode === "development" ? "./reactGrabBootstrap.ts" : "./reactGrabNoop.ts", import.meta.url)
  );
}
