#!/usr/bin/env node

import { spawn } from "node:child_process";
import process from "node:process";

const child = spawn("pnpm", ["browser:smoke"], {
  env: {
    ...process.env,
    BROWSER_SMOKE_ENGINE: "firefox",
    BROWSER_SMOKE_GREP: "warm cache survives network loss and Browser restart"
  },
  stdio: "inherit"
});

child.once("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.once("exit", (code, signal) => {
  if (signal) {
    console.error(`offline playback browser test exited via ${signal}`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
