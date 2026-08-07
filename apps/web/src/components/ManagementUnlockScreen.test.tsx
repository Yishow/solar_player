import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ManagementUnlockScreen } from "./ManagementUnlockScreen";

const onUnlock = async () => true;

test("renders the normal unlock surface", () => {
  const html = renderToStaticMarkup(React.createElement(ManagementUnlockScreen, { onUnlock }));
  assert.match(html, /解鎖管理功能/);
  assert.match(html, /type="submit"/);
});

test("renders password errors without sensitive details", () => {
  const html = renderToStaticMarkup(React.createElement(ManagementUnlockScreen, { errorMessage: "密碼不正確。", onUnlock }));
  assert.match(html, /密碼不正確/);
  assert.doesNotMatch(html, /接近|剩餘|嘗試/);
});

test("renders server lock time and disables submission", () => {
  const html = renderToStaticMarkup(React.createElement(ManagementUnlockScreen, { lockedUntil: "2099-01-01T00:00:00.000Z", onUnlock }));
  assert.match(html, /目前已暫時鎖定/);
  assert.match(html, /disabled=""/);
});
