import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DevicePairingView } from "./index";

test("renders manual pairing input surface when idle", () => {
  const html = renderToStaticMarkup(
    React.createElement(DevicePairingView, {
      errorCode: null,
      errorMessage: null,
      onExchange: async () => {},
      onRetry: () => {},
      status: "idle"
    })
  );

  assert.match(html, /Solar Player/u);
  assert.match(html, /裝置配對/u);
  assert.match(html, /Pairing Token/u);
  assert.match(html, /type="submit"/u);
});

test("renders paired device summary when device is already paired", () => {
  const html = renderToStaticMarkup(
    React.createElement(DevicePairingView, {
      clientId: "kiosk-display-01",
      deviceId: 101,
      errorCode: null,
      errorMessage: null,
      onExchange: async () => {},
      onRetry: () => {},
      status: "already_paired"
    })
  );

  assert.match(html, /裝置已完成配對/u);
  assert.match(html, /kiosk-display-01/u);
  assert.match(html, /前往播放總覽/u);
  assert.match(html, /更換配對/u);
});

test("renders loading state when exchanging token", () => {
  const html = renderToStaticMarkup(
    React.createElement(DevicePairingView, {
      errorCode: null,
      errorMessage: null,
      onExchange: async () => {},
      onRetry: () => {},
      status: "exchanging"
    })
  );

  assert.match(html, /正在驗證裝置憑證/u);
});

test("renders success state and redirect countdown", () => {
  const html = renderToStaticMarkup(
    React.createElement(DevicePairingView, {
      errorCode: null,
      errorMessage: null,
      onExchange: async () => {},
      onRetry: () => {},
      status: "success"
    })
  );

  assert.match(html, /配對成功/u);
  assert.match(html, /導向播放總覽/u);
});

test("renders error message and retry form when exchange fails", () => {
  const html = renderToStaticMarkup(
    React.createElement(DevicePairingView, {
      errorCode: "pairing_token_expired",
      errorMessage: "配對 Token 已過期（有效期限 15 分鐘），請在管理端重新發行。",
      onExchange: async () => {},
      onRetry: () => {},
      status: "error"
    })
  );

  assert.match(html, /配對 Token 已過期/u);
  assert.match(html, /重新配對/u);
});
