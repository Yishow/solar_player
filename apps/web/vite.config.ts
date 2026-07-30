import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readDotEnvFile, resolveDevBackendHost, resolveDevPorts } from "../../scripts/dev-lib.mjs";
import {
  REACT_GRAB_BOOTSTRAP_ALIAS,
  resolveReactGrabBootstrapTarget
} from "./src/devtools/reactGrabBootstrapTarget";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const appRelease =
  process.env.SOLAR_APP_RELEASE
  ?? process.env.GIT_COMMIT
  ?? "development";

function offlineManifestPlugin(): Plugin {
  let emittedAssets: Array<{ required: boolean; url: string }> = [];
  return {
    name: "solar-offline-manifest",
    generateBundle(_options, bundle) {
      emittedAssets = Object.values(bundle)
        .filter((entry) =>
          entry.fileName !== "offline-manifest.json"
          && !entry.fileName.startsWith(".")
        )
        .map((entry) => ({
          required: entry.fileName === "index.html" || entry.fileName.endsWith(".js"),
          url: `/${entry.fileName}`
        }));
      this.emitFile({
        fileName: "offline-manifest.json",
        source: JSON.stringify({
          appRelease,
          assets: emittedAssets.map((asset) => ({
            ...asset,
            hash: "0".repeat(64)
          })),
          schemaVersion: 1
        }),
        type: "asset"
      });
    },
    closeBundle() {
      const outDir = resolve(repoRoot, "apps/web/dist");
      const manifestAssets = emittedAssets.some((asset) => asset.url === "/index.html")
        ? emittedAssets
        : [{ required: true, url: "/index.html" }, ...emittedAssets];
      const assets = manifestAssets.map((asset) => ({
        ...asset,
        hash: createHash("sha256")
          .update(readFileSync(resolve(outDir, asset.url.slice(1))))
          .digest("hex")
      }));
      writeFileSync(
        resolve(outDir, "offline-manifest.json"),
        JSON.stringify({
          appRelease,
          assets,
          schemaVersion: 1
        })
      );
    }
  };
}

export default defineConfig(({ mode }) => {
  const dotEnvPath = resolve(repoRoot, ".env");
  const dotEnv = existsSync(dotEnvPath) ? readDotEnvFile(dotEnvPath) : {};
  const { serverPort, webPort } = resolveDevPorts(dotEnv, process.env);
  const proxyTarget = `http://${resolveDevBackendHost()}:${serverPort}`;

  return {
    envDir: repoRoot,
    plugins: [react(), offlineManifestPlugin()],
    resolve: {
      alias: {
        [REACT_GRAB_BOOTSTRAP_ALIAS]: resolveReactGrabBootstrapTarget(mode)
      }
    },
    build: {
      manifest: true,
      rollupOptions: {
        input: {
          app: resolve(repoRoot, "apps/web/index.html"),
          sw: resolve(repoRoot, "apps/web/src/sw.ts")
        },
        output: {
          entryFileNames: (chunkInfo) =>
            chunkInfo.name === "sw"
              ? "sw.js"
              : "assets/[name]-[hash].js"
        }
      }
    },
    define: {
      __SOLAR_APP_RELEASE__: JSON.stringify(appRelease)
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
