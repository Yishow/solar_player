import { fileURLToPath } from "node:url";

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolveDevPorts } from "../../scripts/dev-lib.mjs";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, "");
  const { serverPort, webPort } = resolveDevPorts(env, process.env);
  const proxyTarget = `http://127.0.0.1:${serverPort}`;

  return {
    envDir: repoRoot,
    plugins: [react()],
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
