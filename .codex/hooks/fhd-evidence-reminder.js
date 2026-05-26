#!/usr/bin/env node

import process from "node:process";

const relevantPatterns = [
  "apps/web/src/pages/Overview/",
  "apps/web/src/pages/Solar/",
  "apps/web/src/pages/FactoryCircuit/",
  "apps/web/src/pages/Images/",
  "apps/web/src/pages/Sustainability/",
  "apps/web/src/pages/DisplayPagesEditor/",
  "apps/web/src/pages/shared/displaySurfaceChrome.css",
  "docs/reference-match/",
  "openspec/specs/display-surface-visual-guardrails/spec.md",
  "openspec/specs/ai-frontend-fhd-evidence-workflow/spec.md"
];

async function main() {
  const input = await new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
  });

  if (!input.trim()) {
    process.exit(0);
  }

  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const command = payload?.tool_input?.command;
  if (typeof command !== "string") {
    process.exit(0);
  }

  if (!relevantPatterns.some((pattern) => command.includes(pattern))) {
    process.exit(0);
  }

  console.error(
    "[fhd-evidence] Relevant FHD path detected. Define witness batch, surface family, evidence bundle, exception ledger, and verification pack before treating the change as review-ready. See docs/reference-match/fhd-surface-split-guide.md and docs/reference-match/fhd-evidence-bundle-template.md."
  );
}

main().catch(() => {
  process.exit(0);
});
