import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SharedInfrastructureBanner } from "./SharedInfrastructureBanner";

test("U1-R3-S01 shared broker under KN names system-wide impact", () => {
  const html = renderToStaticMarkup(<SharedInfrastructureBanner kind="broker" managementScope="kn" />);
  assert.match(html, /data-shared-infrastructure="broker"/);
  assert.match(html, /全系統共用/);
  assert.match(html, /KN/);
  assert.match(html, /不只 KN/);
  assert.doesNotMatch(html, /只影響 KN|僅套用到 KN/);
});

test("U1-R3-S02 weather stays shared and does not invent a site copy", () => {
  const html = renderToStaticMarkup(<SharedInfrastructureBanner kind="weather" managementScope="kn" />);
  assert.match(html, /data-shared-infrastructure="weather"/);
  assert.match(html, /全系統共用/);
  assert.match(html, /不會依廠區複製/);
  assert.match(html, /不只 KN/);
});

test("U1-M1-S03 broker copy identifies shared infrastructure even without a site filter", () => {
  const html = renderToStaticMarkup(<SharedInfrastructureBanner kind="broker" managementScope="all" />);
  assert.match(html, /全系統共用基礎設施/);
  assert.match(html, /不是單一廠區專屬/);
});
