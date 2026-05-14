import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const trendCss = fs.readFileSync(path.join(import.meta.dirname, "trend.css"), "utf8");

test("energy trend hero separators use custom lines instead of boxed hero chrome", () => {
  assert.match(trendCss, /\.et-page \.et-hero-separator \{/);
  assert.match(trendCss, /\.et-page \.et-tabs \{[\s\S]*?border:\s*0;/);
  assert.match(trendCss, /\.et-page \.et-refresh \{[\s\S]*?border:\s*0;/);
});
