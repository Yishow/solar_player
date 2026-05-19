import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RemoteSyncBanner } from "./RemoteSyncBanner";

test("remote sync banner exposes keep-editing and reload actions", () => {
  const html = renderToStaticMarkup(
    React.createElement(RemoteSyncBanner, {
      onKeepEditing: () => {},
      onReloadNow: () => {}
    })
  );

  assert.match(html, /遠端已有新資料/);
  assert.match(html, /目前會保留你的本地編輯/);
  assert.match(html, /稍後再說/);
  assert.match(html, /重新同步/);
  assert.match(html, /Keep Editing/);
  assert.match(html, /Reload Latest/);
  assert.match(html, /role="status"/);
});
