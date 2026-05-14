import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const stylesDir = path.resolve(import.meta.dirname);
const tokensCss = fs.readFileSync(path.join(stylesDir, "tokens.css"), "utf8");
const globalCss = fs.readFileSync(path.join(stylesDir, "global.css"), "utf8");

test("shell bars keep the measured reference heights while using crisper separators", () => {
  assert.match(tokensCss, /--header-height:\s*110px;/);
  assert.match(tokensCss, /--footer-height:\s*72px;/);
  assert.match(tokensCss, /--content-height:\s*898px;/);
  assert.match(tokensCss, /--shell-bar-border:\s*rgba\(171,\s*166,\s*154,\s*0\.48\);/);
  assert.match(tokensCss, /--shell-bar-shadow:\s*none;/);
  assert.match(tokensCss, /--shell-divider:\s*rgba\(198,\s*192,\s*179,\s*0\.56\);/);
  assert.match(tokensCss, /--shell-divider-strong:\s*rgba\(186,\s*180,\s*168,\s*0\.7\);/);
  assert.match(tokensCss, /--shell-divider-brand:\s*rgba\(186,\s*180,\s*168,\s*0\.7\);/);
});

test("header and footer bars do not rely on blur to fake the divider line", () => {
  const headerSection = globalCss.match(/\.shell-header-bar\s*\{[^}]+\}/)?.[0] ?? "";
  const footerSection = globalCss.match(/\.shell-footer-bar\s*\{[^}]+\}/)?.[0] ?? "";

  assert.equal(headerSection.includes("backdrop-filter"), false);
  assert.equal(footerSection.includes("backdrop-filter"), false);
});
