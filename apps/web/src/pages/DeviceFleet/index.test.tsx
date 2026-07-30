import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import test from "node:test";
import { DeviceFleetContent } from "./DeviceFleetContent";
import type { DeviceFleetRow } from "./viewModel";

const row: DeviceFleetRow = {
  appliedVersion: 1,
  clientId: "cl-lobby-01",
  connectedCount: 2,
  displayName: "中壢大廳",
  duplicateIdentity: true,
  desiredVersion: 1,
  enabled: true,
  groupId: 7,
  groupName: "CL Lobby",
  id: 1,
  isPlaying: true,
  key: 1,
  lastSeenAt: "2026-07-30T08:00:00.000Z",
  operationalState: "online",
  pageKey: "overview",
  paired: true,
  pairingAction: "re-pair",
  route: "/overview",
  rolloutError: null,
  rolloutState: "applied",
  siteScope: "cl"
};

function createProps(overrides: Record<string, unknown> = {}) {
  return {
    accessDenied: false,
    filter: "",
    model: {
      groups: [],
      rolloutSummary: {
        applied: 1,
        failed: 0,
        offline: 0,
        total: 1,
        waiting: 0
      },
      rows: [row],
      state: "ready" as const,
      unavailable: []
    },
    mutationError: "",
    mutationPending: false,
    onFilterChange: () => {},
    onClosePairing: () => {},
    onCreateDevice: async () => {},
    onCreateGroup: async () => {},
    onEditDevice: async () => {},
    onEditGroup: async () => {},
    onIssuePairing: async () => {},
    onToggleDevice: async () => {},
    onToggleGroup: async () => {},
    pairing: {
      issue: null
    },
    profileId: 1,
    ...overrides
  };
}

test("DeviceFleetContent renders explicit fleet diagnostics without raw source data", () => {
  const html = renderToStaticMarkup(
    <DeviceFleetContent {...createProps()} />
  );

  assert.match(html, /cl-lobby-01/);
  assert.match(html, /CL Lobby/);
  assert.match(html, /2 個連線/);
  assert.match(html, /已配對/);
  assert.match(html, /已啟用/);
  assert.match(html, /2026-07-30T08:00:00.000Z/);
  assert.match(html, /重複身分/);
  assert.match(html, /重新配對/);
  assert.match(html, /data-testid="fleet-filter"/);
  assert.doesNotMatch(html, /credential|10\.0\.0\./iu);
});

test("DeviceFleetContent announces mutation pending distinctly", () => {
  const html = renderToStaticMarkup(
    <DeviceFleetContent
      {...createProps({
        mutationPending: true
      })}
    />
  );

  assert.match(html, /正在儲存變更/);
});

test("DeviceFleetContent confirms re-pair and clears plaintext when the dialog closes", async () => {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    { url: "http://127.0.0.1/", pretendToBeVisual: true }
  );
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: dom.window
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: dom.window.document
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: dom.window.navigator
  });
  Object.defineProperty(globalThis, "HTMLElement", {
    configurable: true,
    value: dom.window.HTMLElement
  });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  let root: Root | null = null;
  let issued = 0;
  let closed = 0;
  dom.window.confirm = () => true;

  try {
    root = createRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(
        <DeviceFleetContent
          {...createProps({
            onClosePairing: () => {
              closed += 1;
            },
            onIssuePairing: async () => {
              issued += 1;
            },
            pairing: {
              deviceId: 1,
              issue: {
                expiresAt: "2026-07-30T08:10:00.000Z",
                pairingPath: "/device-pairing?token=plain-token",
                token: "plain-token"
              }
            }
          })}
        />
      );
    });

    const rePair = dom.window.document.querySelector<HTMLButtonElement>(
      "[data-action=\"re-pair\"]"
    )!;
    await act(async () => {
      rePair.click();
      await Promise.resolve();
    });
    assert.equal(issued, 1);

    const close = dom.window.document.querySelector<HTMLButtonElement>(
      "[data-action=\"close-pairing\"]"
    )!;
    let copiedText = "";
    Object.defineProperty(dom.window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          copiedText = value;
        }
      }
    });
    const copy = dom.window.document.querySelector<HTMLButtonElement>(
      "[data-action=\"copy-pairing\"]"
    )!;
    await act(async () => {
      copy.click();
      await Promise.resolve();
    });
    assert.equal(copiedText, "/device-pairing?token=plain-token");

    await act(async () => {
      close.click();
    });
    assert.equal(closed, 1);
  } finally {
    await act(async () => {
      root?.unmount();
    });
    dom.window.close();
  }
});

test("DeviceFleetContent shows access guidance without mutation controls after trust loss", () => {
  const html = renderToStaticMarkup(
    <DeviceFleetContent
      {...createProps({
        accessDenied: true
      })}
    />
  );

  assert.match(html, /管理權限已失效/);
  assert.match(html, /重新驗證/);
  assert.doesNotMatch(html, /新增群組|新增裝置|配對|重新配對|>編輯<|>停用</);
});
