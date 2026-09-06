import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { DataHub } from "./index";

test("U1-R2 invalid management scope shows an explicit correction and does not switch to CL", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/settings/data-hub?scope=factory-a"]}>
      <DataHub />
    </MemoryRouter>
  );

  assert.match(html, /data-workspace-scope-correction/);
  assert.match(html, /factory-a/);
  assert.match(html, /全部/);
  assert.match(html, /不會自動改成 CL/);
  assert.match(html, /<option value="all" selected="">全部<\/option>/);
  assert.match(html, /工作首頁/);
  assert.match(html, /連線設定/);
  assert.match(html, /接收與轉換/);
  assert.match(html, /可用數據/);
  assert.match(html, /天氣／外部資料/);
});

test("U1-M1-S01 Data Hub shell keeps specialist routes next to the task home", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/settings/data-hub"]}>
      <DataHub />
    </MemoryRouter>
  );

  assert.match(html, /工作首頁/);
  assert.match(html, /aria-label="Data Hub sections"/);
  assert.match(html, /連線設定/);
  assert.match(html, /接收與轉換/);
  assert.match(html, /可用數據/);
  assert.match(html, /天氣／外部資料/);
});
