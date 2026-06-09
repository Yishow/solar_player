import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readDotEnvFile, resolveDevPorts } from "../../scripts/dev-lib.mjs";
import {
  REACT_GRAB_BOOTSTRAP_ALIAS,
  resolveReactGrabBootstrapTarget
} from "./src/devtools/reactGrabBootstrapTarget";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig(({ mode }) => {
  const dotEnvPath = resolve(repoRoot, ".env");
  const dotEnv = existsSync(dotEnvPath) ? readDotEnvFile(dotEnvPath) : {};
  const { serverPort, webPort } = resolveDevPorts(dotEnv, process.env);
  const proxyTarget = `http://127.0.0.1:${serverPort}`;

  return {
    envDir: repoRoot,
    plugins: [react()],
    resolve: {
      alias: {
        [REACT_GRAB_BOOTSTRAP_ALIAS]: resolveReactGrabBootstrapTarget(mode)
      }
    },
    server: {
      host: "0.0.0.0",
      port: webPort,
      proxy: {
        "/api": {
          target: proxyTarget
        },
        "/socket.io": {
          target: proxyTarget,
          ws: true
        },
        "/uploads": {
          target: proxyTarget
        }
      }
    }
  };
});
