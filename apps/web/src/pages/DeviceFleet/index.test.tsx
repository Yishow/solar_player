import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import React, { act } from "react";
import type { Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { JSDOM } from "jsdom";
import test, { type TestContext } from "node:test";
import type {
  Device,
  DeviceGroup,
  PlaybackProfileDraft,
  PlaybackProfileSummary
} from "@solar-display/shared";
import { DeviceFleetContent } from "./DeviceFleetContent";
import { GroupEditDialog } from "./GroupEditDialog";
import {
  loadDeviceFleetRoute,
  resetDeviceFleetRouteModelForTests,
  setDeviceFleetLoadersForTests
} from "./route";
import type { DeviceFleetRow } from "./viewModel";

// The Device Fleet route owner imports its stylesheets; stub them so the real
// owner can mount under the Node test runner.
register("data:text/javascript," + encodeURIComponent([
  "export async function load(url, context, nextLoad) {",
  "  if (url.endsWith('.css')) return { format: 'module', shortCircuit: true, source: '' };",
  "  return nextLoad(url, context);",
  "}"
].join("\n")));
const { DeviceFleet } = await import("./index");

async function createTestRoot(container: Element) {
  const { createRoot } = await import("react-dom/client");
  return createRoot(container);
}

const activeKnGroup = {
  desiredVersion: 3,
  enabled: true,
  id: 42,
  name: "KN Lobby",
  playbackProfile: {
    archivedAt: null,
    id: 9,
    isDefault: false,
    name: "Lobby Profile",
    profileKey: "kn-lobby"
  },
  playbackProfileId: 9,
  siteScope: "kn" as const
};

const disabledKnGroup = {
  ...activeKnGroup,
  enabled: false,
  id: 43,
  name: "KN Disabled"
};

const defaultPlaybackProfile = {
  archivedAt: null,
  id: 1,
  isDefault: true,
  name: "Default Profile",
  profileKey: "default"
};

const archivedPlaybackProfile = {
  archivedAt: "2026-08-01T00:00:00.000Z",
  id: 10,
  isDefault: false,
  name: "Archived Profile",
  profileKey: "archived"
};

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
  groupEnabled: true,
  id: 1,
  isPlaying: true,
  key: 1,
  lastSeenAt: "2026-07-30T08:00:00.000Z",
  operationalState: "online",
  pageKey: "overview",
  paired: true,
  pairingAction: "re-pair",
  playbackProfileId: 1,
  playbackProfileName: "CL Playback Profile",
  route: "/overview",
  rolloutError: null,
  rolloutState: "applied",
  siteScope: "cl"
};

function createProps(overrides: Record<string, unknown> = {}) {
  return {
    accessDenied: false,
    filter: "",
    profiles: [],
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
    onPreparePairing: () => {},
    onFilterChange: () => {},
    onClosePairing: () => {},
    onCreateDevice: async () => true,
    onCreateGroup: async () => {},
    onEditDevice: async () => {},
    onEditGroup: async () => {},
    onIssuePairing: async () => {},
    onToggleDevice: async () => {},
    onToggleGroup: async () => {},
    pairing: {
      issue: null
    },
    pairingPreparation: null,
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

test("DeviceFleetContent includes the resolved Playback Profile in the create Group selector", () => {
  const html = renderToStaticMarkup(
    <DeviceFleetContent
      {...createProps({
        profiles: [
          defaultPlaybackProfile,
          activeKnGroup.playbackProfile,
          archivedPlaybackProfile
        ],
        model: {
          groups: [activeKnGroup],
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
        }
      })}
    />
  );

  assert.match(html, /KN Lobby · KN · Lobby Profile/);
  assert.doesNotMatch(html, /Archived Profile/);
});

test("DeviceFleetContent edits a Device with a typed Group selector and resolved context", async () => {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    { url: "http://127.0.0.1/", pretendToBeVisual: true }
  );
  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: dom.window.HTMLElement });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  let root: Root | null = null;
  let submitted: unknown = null;

  try {
    root = await createTestRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(
        <DeviceFleetContent
          {...createProps({
            model: {
              groups: [activeKnGroup, disabledKnGroup],
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
            onEditDevice: async (...args: unknown[]) => {
              submitted = args;
              return false;
            }
          })}
        />
      );
    });

    await act(async () => {
      dom.window.document.querySelector<HTMLButtonElement>("[data-action=\"edit-device\"]")!.click();
    });

    const dialog = dom.window.document.querySelector<HTMLElement>("[data-testid=\"device-edit-dialog\"]");
    assert.ok(dialog);
    assert.match(dialog.textContent ?? "", /KN Lobby/);
    assert.match(dialog.textContent ?? "", /KN/);
    assert.match(dialog.textContent ?? "", /Lobby Profile/);

    const disabledOption = dialog.querySelector<HTMLOptionElement>("option[value=\"43\"]");
    assert.equal(disabledOption, null);

    const displayNameInput = dialog.querySelector<HTMLInputElement>("[data-field=\"device-display-name\"]")!;
    assert.equal(displayNameInput.value, row.displayName);
    const groupSelect = dialog.querySelector<HTMLSelectElement>("[data-field=\"device-group\"]")!;
    await act(async () => {
      groupSelect.value = "42";
      groupSelect.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    const enabledInput = dialog.querySelector<HTMLInputElement>("[data-field=\"device-enabled\"]")!;
    await act(async () => {
      enabledInput.click();
    });

    await act(async () => {
      dialog.querySelector<HTMLButtonElement>("[data-action=\"save-device-edit\"]")!.click();
      await Promise.resolve();
    });

    assert.deepEqual(submitted, [row, {
      displayName: row.displayName,
      enabled: false,
      groupId: 42
    }]);
    assert.ok(dom.window.document.querySelector("[data-testid=\"device-edit-dialog\"]"));
  } finally {
    await act(async () => {
      root?.unmount();
    });
    dom.window.close();
  }
});

test("DeviceFleetContent requires an enabled Group before an enabled Device can be submitted", async () => {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    { url: "http://127.0.0.1/", pretendToBeVisual: true }
  );
  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: dom.window.HTMLElement });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  let root: Root | null = null;
  let submitted = false;
  const disabledGroupRow = { ...row, groupId: disabledKnGroup.id };

  try {
    root = await createTestRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(
        <DeviceFleetContent
          {...createProps({
            model: {
              groups: [activeKnGroup, disabledKnGroup],
              rolloutSummary: {
                applied: 1,
                failed: 0,
                offline: 0,
                total: 1,
                waiting: 0
              },
              rows: [disabledGroupRow],
              state: "ready" as const,
              unavailable: []
            },
            onEditDevice: async () => {
              submitted = true;
            }
          })}
        />
      );
    });

    await act(async () => {
      dom.window.document.querySelector<HTMLButtonElement>("[data-action=\"edit-device\"]")!.click();
    });

    const dialog = dom.window.document.querySelector<HTMLElement>("[data-testid=\"device-edit-dialog\"]")!;
    const disabledOption = dialog.querySelector<HTMLOptionElement>(`option[value="${disabledKnGroup.id}"]`);
    assert.equal(disabledOption, null);
    assert.equal(
      dialog.querySelector<HTMLButtonElement>("[data-action=\"save-device-edit\"]")!.disabled,
      true
    );

    const groupSelect = dialog.querySelector<HTMLSelectElement>("[data-field=\"device-group\"]")!;
    await act(async () => {
      groupSelect.value = String(activeKnGroup.id);
      groupSelect.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    await act(async () => {
      dialog.querySelector<HTMLButtonElement>("[data-action=\"save-device-edit\"]")!.click();
      await Promise.resolve();
    });
    assert.equal(submitted, true);
  } finally {
    await act(async () => {
      root?.unmount();
    });
    dom.window.close();
  }
});

test("Device Fleet removes the Device edit prompts while keeping Group editing separate", () => {
  const source = readFileSync(new URL("./index.tsx", import.meta.url), "utf8");
  const contentSource = readFileSync(
    new URL("./DeviceFleetContent.tsx", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(source, /window\.prompt\("顯示名稱"/u);
  assert.doesNotMatch(source, /window\.prompt\(\s*\n?\s*"群組 ID"/u);
  assert.doesNotMatch(source, /window\.prompt\("群組名稱"/u);
  assert.doesNotMatch(source, /window\.prompt\(\s*\n?\s*"Site Scope/u);
  assert.doesNotMatch(contentSource, /window\.prompt|window\.confirm/u);
});

test("DeviceFleetContent retains create fields after a failed save and clears them after success", async () => {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    { url: "http://127.0.0.1/", pretendToBeVisual: true }
  );
  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: dom.window.HTMLElement });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  let root: Root | null = null;
  let allowSave = false;

  try {
    root = await createTestRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(
        <DeviceFleetContent
          {...createProps({
            model: {
              groups: [activeKnGroup],
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
            onCreateDevice: async () => allowSave,
            profiles: [defaultPlaybackProfile]
          })}
        />
      );
    });

    const labels = [...dom.window.document.querySelectorAll("label")];
    const clientIdInput = labels.find((label) => label.textContent?.includes("Client ID"))!
      .querySelector<HTMLInputElement>("input")!;
    const displayNameInput = labels.find((label) => label.textContent?.includes("顯示名稱"))!
      .querySelector<HTMLInputElement>("input")!;
    const groupSelect = [...dom.window.document.querySelectorAll("select")].find((select) =>
      [...select.options].some((option) => option.value === String(activeKnGroup.id))
    )!;
    const createButton = [...dom.window.document.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("建立裝置")
    )!;
    const setInputValue = async (input: HTMLInputElement, value: string) => {
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")?.set;
        setter?.call(input, value);
        input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
      });
    };

    await setInputValue(clientIdInput, "kn-lobby-02");
    await setInputValue(displayNameInput, "KN Lobby 02");
    await act(async () => {
      groupSelect.value = String(activeKnGroup.id);
      groupSelect.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    await act(async () => {
      createButton.click();
    });

    assert.equal(clientIdInput.value, "kn-lobby-02");
    assert.equal(displayNameInput.value, "KN Lobby 02");

    allowSave = true;
    await act(async () => {
      createButton.click();
    });

    assert.equal(clientIdInput.value, "");
    assert.equal(displayNameInput.value, "");
  } finally {
    await act(async () => {
      root?.unmount();
    });
    dom.window.close();
  }
});

test("DeviceFleetContent edits Groups with canonical scope and active profile controls", async () => {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    { url: "http://127.0.0.1/", pretendToBeVisual: true }
  );
  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: dom.window.HTMLElement });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  let root: Root | null = null;
  let submitted: unknown = null;

  try {
    root = await createTestRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(
        <DeviceFleetContent
          {...createProps({
            model: {
              groups: [activeKnGroup],
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
            onEditGroup: async (...args: unknown[]) => {
              submitted = args;
              return false;
            },
            profiles: [
              defaultPlaybackProfile,
              activeKnGroup.playbackProfile,
              archivedPlaybackProfile
            ]
          })}
        />
      );
    });

    await act(async () => {
      dom.window.document.querySelector<HTMLButtonElement>("[data-action=\"edit-group\"]")!.click();
    });

    const dialog = dom.window.document.querySelector<HTMLElement>("[data-testid=\"group-edit-dialog\"]");
    assert.ok(dialog);
    const scopeSelect = dialog.querySelector<HTMLSelectElement>("[data-field=\"group-site-scope\"]")!;
    assert.ok(scopeSelect.querySelector("option[value=\"cl\"]"));
    assert.ok(scopeSelect.querySelector("option[value=\"kn\"]"));
    const profileSelect = dialog.querySelector<HTMLSelectElement>("[data-field=\"group-playback-profile\"]")!;
    assert.equal(profileSelect.value, String(activeKnGroup.playbackProfileId));
    assert.equal(
      profileSelect.querySelector(`option[value="${archivedPlaybackProfile.id}"]`),
      null
    );

    await act(async () => {
      dialog.querySelector<HTMLButtonElement>("[data-action=\"save-group-edit\"]")!.click();
      await Promise.resolve();
    });

    assert.deepEqual(submitted, [
      activeKnGroup,
      {
        enabled: true,
        name: activeKnGroup.name,
        playbackProfileId: activeKnGroup.playbackProfileId,
        siteScope: activeKnGroup.siteScope
      }
    ]);
    assert.ok(dom.window.document.querySelector("[data-testid=\"group-edit-dialog\"]"));
  } finally {
    await act(async () => {
      root?.unmount();
    });
    dom.window.close();
  }
});

test("GroupEditDialog requires an active profile for an archived Group assignment", () => {
  const html = renderToStaticMarkup(
    <GroupEditDialog
      group={{
        ...activeKnGroup,
        playbackProfile: archivedPlaybackProfile,
        playbackProfileId: archivedPlaybackProfile.id
      }}
      mutationPending={false}
      onClose={() => {}}
      onSubmit={async () => false}
      profiles={[defaultPlaybackProfile, archivedPlaybackProfile]}
    />
  );

  assert.match(html, /目前 Playback Profile 已封存，請選擇 active profile/u);
  assert.doesNotMatch(html, /Archived Profile/u);
  assert.match(html, /選擇 active Playback Profile/u);
  assert.match(html, /disabled=""/u);
});

test("DeviceFleetContent opens structured pairing preparation with resolved context", async () => {
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
  let prepared: DeviceFleetRow | null = null;
  dom.window.confirm = () => {
    throw new Error("window.confirm must not be used for pairing");
  };

  try {
    root = await createTestRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(
        <DeviceFleetContent
          {...createProps({
            onPreparePairing: (nextRow: DeviceFleetRow) => {
              prepared = nextRow;
            },
            onIssuePairing: async () => {
              issued += 1;
            },
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
    assert.equal(prepared, row);
    assert.equal(issued, 0);

    await act(async () => {
      root!.render(
        <DeviceFleetContent
          {...createProps({
            onIssuePairing: async () => {
              issued += 1;
            },
            pairingPreparation: row
          })}
        />
      );
    });

    const dialog = dom.window.document.querySelector<HTMLElement>(
      "[data-testid=\"pairing-dialog\"]"
    );
    assert.ok(dialog);
    assert.match(dialog.textContent ?? "", /中壢大廳/u);
    assert.match(dialog.textContent ?? "", /CL Lobby/u);
    assert.match(dialog.textContent ?? "", /CL/u);
    assert.match(dialog.textContent ?? "", /CL Playback Profile/u);
    assert.match(dialog.textContent ?? "", /撤銷舊 Credential/u);

    await act(async () => {
      dialog.querySelector<HTMLButtonElement>(
        "[data-action=\"confirm-pairing\"]"
      )!.click();
      await Promise.resolve();
    });
    assert.equal(issued, 1);
    assert.ok(
      dom.window.document.querySelector("[data-testid=\"pairing-dialog\"]")
    );

    const knRow: DeviceFleetRow = {
      ...row,
      clientId: "display-kn-01",
      displayName: "觀音大廳",
      groupId: activeKnGroup.id,
      groupName: activeKnGroup.name,
      playbackProfileId: activeKnGroup.playbackProfileId,
      playbackProfileName: activeKnGroup.playbackProfile.name,
      siteScope: activeKnGroup.siteScope
    };
    await act(async () => {
      root!.render(
        <DeviceFleetContent
          {...createProps({
            model: {
              groups: [activeKnGroup],
              rolloutSummary: {
                applied: 1,
                failed: 0,
                offline: 0,
                total: 1,
                waiting: 0
              },
              rows: [knRow],
              state: "ready" as const,
              unavailable: []
            },
            pairingPreparation: knRow
          })}
        />
      );
    });
    const knDialog = dom.window.document.querySelector<HTMLElement>(
      "[data-testid=\"pairing-dialog\"]"
    );
    assert.ok(knDialog);
    assert.match(knDialog.textContent ?? "", /觀音大廳/u);
    assert.match(knDialog.textContent ?? "", /KN Lobby/u);
    assert.match(knDialog.textContent ?? "", /KN/u);
    assert.match(knDialog.textContent ?? "", /Lobby Profile/u);
  } finally {
    await act(async () => {
      root?.unmount();
    });
    dom.window.close();
  }
});

test("DeviceFleetContent clears one-time plaintext when the pairing dialog closes", async () => {
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
  let closed = 0;

  try {
    root = await createTestRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(
        <DeviceFleetContent
          {...createProps({
            onClosePairing: () => {
              closed += 1;
            },
            pairing: {
              issue: {
                expiresAt: "2026-07-30T08:10:00.000Z",
                pairingPath: "/device-pairing?token=plain-token",
                token: "plain-token"
              }
            },
            pairingPreparation: row
          })}
        />
      );
    });

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

    const openLink = dom.window.document.querySelector<HTMLAnchorElement>(
      "[data-action=\"open-pairing\"]"
    )!;
    assert.ok(openLink);
    assert.equal(openLink.getAttribute("href"), "/device-pairing?token=plain-token");
    assert.equal(openLink.target, "_blank");

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

test("DeviceFleetContent fails closed with guidance when pairing context is unavailable", () => {
  const unassignedRow: DeviceFleetRow = {
    ...row,
    enabled: false,
    groupEnabled: null,
    groupId: null,
    groupName: null,
    playbackProfileId: null,
    playbackProfileName: null,
    siteScope: null
  };
  const html = renderToStaticMarkup(
    <DeviceFleetContent
      {...createProps({
        model: {
          groups: [],
          rolloutSummary: {
            applied: 0,
            failed: 0,
            offline: 0,
            total: 1,
            waiting: 0
          },
          rows: [unassignedRow],
          state: "ready" as const,
          unavailable: []
        },
        pairingPreparation: unassignedRow
      })}
    />
  );

  assert.match(html, /尚未指派可用的 Group/u);
  assert.match(html, /請先分組後再配對/u);
  assert.match(html, /data-action="confirm-pairing" disabled=""/u);
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

test("DeviceFleetContent switches distinctly between hardware and playback profile governance tabs", async () => {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    { url: "http://127.0.0.1/", pretendToBeVisual: true }
  );
  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: dom.window.HTMLElement });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  let root: Root | null = null;
  try {
    root = await createTestRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(<DeviceFleetContent {...createProps({ profiles: [defaultPlaybackProfile] })} />);
    });

    const tabs = [...dom.window.document.querySelectorAll<HTMLButtonElement>(".device-mgmt-tab")];
    assert.equal(tabs.length, 2);
    assert.match(tabs[0]!.textContent ?? "", /實體看板與群組/);
    assert.match(tabs[1]!.textContent ?? "", /播放策略版本/);

    // Initial state shows devices
    assert.ok(dom.window.document.querySelector(".fleet-table"));

    // Click profiles tab
    await act(async () => {
      tabs[1]!.click();
    });

    assert.ok(dom.window.document.querySelector(".device-mgmt-profiles-panel"));
    assert.equal(dom.window.document.querySelector(".fleet-table"), null);

    // Click back to devices tab
    await act(async () => {
      tabs[0]!.click();
    });

    assert.ok(dom.window.document.querySelector(".fleet-table"));
    assert.equal(dom.window.document.querySelector(".device-mgmt-profiles-panel"), null);
  } finally {
    await act(async () => {
      root?.unmount();
    });
    dom.window.close();
  }
});

test("DeviceFleetContent interacts with KPI filter cards to filter rows and clear filters", async () => {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    { url: "http://127.0.0.1/", pretendToBeVisual: true }
  );
  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: dom.window.HTMLElement });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  let root: Root | null = null;

  try {
    const rowOnline = { ...row, id: 1, key: 1, operationalState: "online" as const, paired: true };
    const rowUnpaired = { ...row, id: 2, key: 2, operationalState: "unpaired" as const, paired: false, enabled: true };
    root = await createTestRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(
        <DeviceFleetContent
          {...createProps({
            model: {
              groups: [activeKnGroup],
              rolloutSummary: { applied: 1, failed: 0, offline: 0, total: 2, waiting: 1 },
              rows: [rowOnline, rowUnpaired],
              state: "ready" as const,
              unavailable: []
            }
          })}
        />
      );
    });

    const kpiCards = [...dom.window.document.querySelectorAll<HTMLElement>(".fleet-kpi-card")];
    assert.equal(kpiCards.length, 4);

    // Initial table has 2 rows
    assert.equal(dom.window.document.querySelectorAll(".fleet-table tbody tr").length, 2);

    // Click "在線正常" card (index 1)
    await act(async () => {
      kpiCards[1]!.click();
    });

    // Should filter to 1 online row and show active filter banner
    assert.equal(dom.window.document.querySelectorAll(".fleet-table tbody tr").length, 1);
    assert.ok(dom.window.document.querySelector(".fleet-active-filter-banner"));

    // Click clear button
    const clearBtn = dom.window.document.querySelector<HTMLButtonElement>(".fleet-active-filter-clear");
    assert.ok(clearBtn);
    await act(async () => {
      clearBtn!.click();
    });

    // Restores to 2 rows
    assert.equal(dom.window.document.querySelectorAll(".fleet-table tbody tr").length, 2);
    assert.equal(dom.window.document.querySelector(".fleet-active-filter-banner"), null);
  } finally {
    await act(async () => {
      root?.unmount();
    });
    dom.window.close();
  }
});

test("DeviceFleetContent supports external activeTab and notifies onTabChange", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    url: "http://localhost/"
  });
  let root: Root | null = null;
  const tabChanges: string[] = [];

  try {
    root = await createTestRoot(dom.window.document.getElementById("root")!);
    await act(async () => {
      root!.render(
        <DeviceFleetContent
          {...createProps({
            activeTab: "profiles",
            onTabChange: (tab: "devices" | "profiles") => tabChanges.push(tab),
            profiles: [defaultPlaybackProfile]
          })}
        />
      );
    });

    // Profile panel should be rendered
    assert.ok(dom.window.document.querySelector(".playback-profiles-page"));
    const tabs = [...dom.window.document.querySelectorAll<HTMLButtonElement>(".device-mgmt-tab")];
    assert.equal(tabs.length, 2);
    assert.equal(tabs[1]!.getAttribute("aria-selected"), "true");

    // Click devices tab
    await act(async () => {
      tabs[0]!.click();
    });

    assert.deepEqual(tabChanges, ["devices"]);
  } finally {
    await act(async () => {
      root?.unmount();
    });
    dom.window.close();
  }
});

// ---------------------------------------------------------------------------
// Mounted Device Fleet owner: the real route component with its route model,
// a memory router for the tab query, and a fetch-backed Profile API whose
// catalog changes with create, rename, and archive.

const fleetDefaultGroup: DeviceGroup = {
  desiredVersion: 1,
  enabled: true,
  id: 7,
  name: "CL Lobby",
  playbackProfile: {
    archivedAt: null,
    id: 1,
    isDefault: true,
    name: "Default Profile",
    profileKey: "default"
  },
  playbackProfileId: 1,
  siteScope: "cl"
};

const fleetDevice: Device = {
  appliedVersion: 1,
  clientId: "cl-lobby-01",
  displayName: "中壢大廳",
  enabled: true,
  group: fleetDefaultGroup,
  groupId: 7,
  id: 1,
  paired: true,
  profileUpdateError: null,
  profileUpdateState: "applied"
};

const fleetDraft: PlaybackProfileDraft = {
  pages: [{
    displayOrder: 1,
    durationSeconds: 15,
    enabled: true,
    id: 1,
    labelEn: "Overview",
    labelZh: "總覽",
    pageKey: "overview",
    route: "/overview",
    templateKey: "overview"
  }],
  profileId: 1,
  revision: 1,
  settings: {
    autoplay: true,
    brightness: 100,
    enforceFreshRuntimeData: true,
    idleMode: "disabled",
    idleTimeout: 300,
    loop: true,
    orientation: "landscape",
    repeatDays: [1, 2, 3, 4, 5],
    scheduleEnabled: false,
    scheduleEnd: "18:00",
    scheduleStart: "08:00",
    startPage: 1,
    transitionSpeed: 250,
    transitionType: "fade",
    updatedAt: "2026-09-11T00:00:00.000Z"
  },
  updatedAt: "2026-09-11T00:00:00.000Z"
};

async function settleFleet() {
  for (let index = 0; index < 6; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function installFleetProfileApi(t: TestContext, initialCatalog: PlaybackProfileSummary[]) {
  let catalog = initialCatalog.map((profile) => ({ ...profile }));
  let nextId = Math.max(0, ...catalog.map((profile) => profile.id)) + 1;
  let heldCatalogRead: Promise<void> | null = null;
  const respond = (data: unknown) => new Response(JSON.stringify({ data, success: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200
  });
  const readName = (init?: RequestInit) => (JSON.parse(String(init?.body)) as { name: string }).name;

  t.mock.method(globalThis, "fetch", async (input: unknown, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input), "http://127.0.0.1/");
    const method = init?.method ?? "GET";
    if (url.pathname === "/api/playback-profiles") {
      if (method === "POST") {
        const name = readName(init);
        const created = {
          archivedAt: null,
          id: nextId++,
          isDefault: false,
          name,
          profileKey: name.toLowerCase().replace(/\s+/gu, "-")
        };
        catalog = [...catalog, created];
        return respond(created);
      }
      const held = heldCatalogRead;
      heldCatalogRead = null;
      if (held) {
        await held;
      }
      return respond(catalog.map((profile) => ({ ...profile })));
    }

    const match = url.pathname.match(/^\/api\/playback-profiles\/(\d+)(?:\/(archive|draft|versions))?$/u);
    if (match) {
      const id = Number(match[1]);
      switch (match[2]) {
        case "draft":
          return respond({ ...fleetDraft, profileId: id });
        case "versions":
          return respond([]);
        case "archive":
          catalog = catalog.map((profile) => profile.id === id
            ? { ...profile, archivedAt: "2026-09-11T00:00:00.000Z" }
            : profile);
          return respond(catalog.find((profile) => profile.id === id));
        default:
          if (method === "PUT") {
            const name = readName(init);
            catalog = catalog.map((profile) => profile.id === id ? { ...profile, name } : profile);
            return respond(catalog.find((profile) => profile.id === id));
          }
      }
    }
    throw new Error(`Unexpected Device Fleet request: ${method} ${url.pathname}`);
  });

  return {
    holdNextCatalogRead: () => {
      let release!: () => void;
      heldCatalogRead = new Promise<void>((resolve) => {
        release = resolve;
      });
      return { release: () => release() };
    }
  };
}

async function mountDeviceFleet(
  t: TestContext,
  { catalog, groups }: { catalog: PlaybackProfileSummary[]; groups: DeviceGroup[] }
) {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    { url: "http://127.0.0.1/device-fleet", pretendToBeVisual: true }
  );
  for (const [key, value] of Object.entries({
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    navigator: dom.window.navigator,
    window: dom.window
  })) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let promptAnswer = "";
  Object.defineProperty(dom.window, "prompt", { configurable: true, value: () => promptAnswer });
  Object.defineProperty(dom.window, "confirm", { configurable: true, value: () => true });

  const api = installFleetProfileApi(t, catalog);
  resetDeviceFleetRouteModelForTests();
  setDeviceFleetLoadersForTests({
    getDevices: async () => [fleetDevice],
    getGroups: async () => groups,
    getLiveness: async () => ({
      clients: [],
      summary: { offline: 0, online: 0, stale: 0, total: 0 }
    }),
    getProfiles: async () => catalog
  });
  await loadDeviceFleetRoute();

  const document = dom.window.document;
  const root = await createTestRoot(document.getElementById("root")!);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={["/device-fleet?tab=profiles"]}>
        <DeviceFleet />
      </MemoryRouter>
    );
    await settleFleet();
  });

  const click = async (element: HTMLElement) => {
    await act(async () => {
      element.click();
      await settleFleet();
    });
  };
  const optionLabels = (selector: string) =>
    [...document.querySelectorAll<HTMLOptionElement>(`${selector} option`)].map((option) => option.textContent ?? "");

  return {
    api,
    answerPrompt: (answer: string) => {
      promptAnswer = answer;
    },
    button: (label: string) => {
      const found = [...document.querySelectorAll<HTMLButtonElement>("button")]
        .find((candidate) => candidate.textContent?.trim() === label);
      assert.ok(found, `button ${label} is rendered`);
      return found;
    },
    click,
    clickTab: (tab: "devices" | "profiles") =>
      click(document.querySelectorAll<HTMLButtonElement>(".device-mgmt-tab")[tab === "devices" ? 0 : 1]!),
    createGroupOptions: () => optionLabels("select[data-field=\"group-create-playback-profile\"]"),
    document,
    editGroupOptions: () => optionLabels("select[data-field=\"group-playback-profile\"]"),
    selectProfile: async (name: string) => {
      const item = [...document.querySelectorAll<HTMLButtonElement>(".profile-nav-item")]
        .find((candidate) => candidate.querySelector("strong")?.textContent === name);
      assert.ok(item, `${name} is listed on the Profile tab`);
      await click(item);
    },
    setValue: async (element: HTMLInputElement | HTMLSelectElement, value: string) => {
      await act(async () => {
        if (element instanceof dom.window.HTMLSelectElement) {
          element.value = value;
          element.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
        } else {
          Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")?.set?.call(element, value);
          element.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
        }
      });
    },
    sidebarNames: () =>
      [...document.querySelectorAll(".profile-list-sidebar strong")].map((element) => element.textContent ?? ""),
    unmount: async () => {
      await act(async () => root.unmount());
      resetDeviceFleetRouteModelForTests();
      dom.window.close();
    }
  };
}

test("Device Fleet shares a created Profile with group controls across tab navigation", async (t) => {
  const fleet = await mountDeviceFleet(t, { catalog: [defaultPlaybackProfile], groups: [fleetDefaultGroup] });

  try {
    assert.deepEqual(fleet.sidebarNames(), ["Default Profile"]);
    fleet.answerPrompt("New Test Profile");
    await fleet.click(fleet.button("＋ 新增 Profile"));
    assert.deepEqual(fleet.sidebarNames(), ["Default Profile", "New Test Profile"]);

    await fleet.clickTab("devices");
    assert.deepEqual(fleet.createGroupOptions(), ["Default Profile (預設)", "New Test Profile"]);
    await fleet.click(fleet.document.querySelector<HTMLButtonElement>("button[data-action=\"edit-group\"]")!);
    assert.ok(fleet.editGroupOptions().includes("New Test Profile · new-test-profile"));
    await fleet.click(fleet.document.querySelector<HTMLButtonElement>("button[data-action=\"cancel-group-edit\"]")!);

    await fleet.clickTab("profiles");
    assert.deepEqual(
      fleet.sidebarNames(),
      ["Default Profile", "New Test Profile"],
      "the Profile tab remounts from the shared catalog without a page reload"
    );
  } finally {
    await fleet.unmount();
  }
});

test("a Profile catalog published after returning to Devices keeps the mounted group form and fleet state", async (t) => {
  const fleet = await mountDeviceFleet(t, { catalog: [defaultPlaybackProfile], groups: [fleetDefaultGroup] });

  try {
    const heldCatalog = fleet.api.holdNextCatalogRead();
    fleet.answerPrompt("New Test Profile");
    await fleet.click(fleet.button("＋ 新增 Profile"));
    await fleet.clickTab("devices");
    assert.deepEqual(fleet.createGroupOptions(), ["Default Profile (預設)"], "the catalog request is still pending");

    // Values entered into the group form that mounted after leaving the Profile tab.
    const groupNameInput = [...fleet.document.querySelectorAll("#create-group-section label")]
      .find((label) => label.textContent?.includes("群組名稱"))!
      .querySelector<HTMLInputElement>("input")!;
    const siteScopeSelect = fleet.document.querySelector<HTMLSelectElement>("select[data-field=\"group-create-site-scope\"]")!;
    const filterInput = fleet.document.querySelector<HTMLInputElement>("input[placeholder=\"搜尋 Client ID、顯示名稱或群組…\"]")!;
    await fleet.setValue(groupNameInput, "Pending Form Group");
    await fleet.setValue(siteScopeSelect, "kn");
    await fleet.setValue(filterInput, "cl-lobby");
    const deviceTableBefore = fleet.document.querySelector(".fleet-table tbody")?.textContent;
    const groupListBefore = fleet.document.querySelector("#group-list-section")?.textContent;
    assert.match(deviceTableBefore ?? "", /cl-lobby-01/u);

    await act(async () => {
      heldCatalog.release();
      await settleFleet();
    });

    assert.deepEqual(fleet.createGroupOptions(), ["Default Profile (預設)", "New Test Profile"]);
    assert.equal(groupNameInput.value, "Pending Form Group");
    assert.equal(siteScopeSelect.value, "kn");
    assert.equal(filterInput.value, "cl-lobby");
    assert.equal(fleet.document.querySelector(".fleet-table tbody")?.textContent, deviceTableBefore);
    assert.equal(fleet.document.querySelector("#group-list-section")?.textContent, groupListBefore);
  } finally {
    await fleet.unmount();
  }
});

test("Profile rename and archive refreshes reach group controls while resolved group context stays", async (t) => {
  const lobbyProfile: PlaybackProfileSummary = {
    archivedAt: null,
    id: 9,
    isDefault: false,
    name: "Lobby Profile",
    profileKey: "kn-lobby"
  };
  const fleet = await mountDeviceFleet(t, { catalog: [defaultPlaybackProfile, lobbyProfile], groups: [activeKnGroup] });
  const editGroup = () => fleet.document.querySelector<HTMLButtonElement>("button[data-action=\"edit-group\"]")!;
  const cancelGroupEdit = () => fleet.document.querySelector<HTMLButtonElement>("button[data-action=\"cancel-group-edit\"]")!;

  try {
    await fleet.selectProfile("Lobby Profile");
    fleet.answerPrompt("Lobby Renamed");
    await fleet.click(fleet.button("重新命名"));
    assert.deepEqual(fleet.sidebarNames(), ["Default Profile", "Lobby Renamed"]);

    await fleet.clickTab("devices");
    assert.deepEqual(fleet.createGroupOptions(), ["Default Profile (預設)", "Lobby Renamed"]);
    await fleet.click(editGroup());
    assert.ok(fleet.editGroupOptions().includes("Lobby Renamed · kn-lobby"));
    await fleet.click(cancelGroupEdit());

    await fleet.clickTab("profiles");
    await fleet.selectProfile("Lobby Renamed");
    await fleet.click(fleet.button("封存"));
    assert.match(fleet.document.querySelector(".profile-list-sidebar")?.textContent ?? "", /Lobby Renamed[\s\S]*已封存/u);

    await fleet.clickTab("devices");
    assert.deepEqual(
      fleet.createGroupOptions(),
      ["Default Profile (預設)"],
      "an archived Profile is no longer offered for new assignment"
    );
    assert.match(
      fleet.document.querySelector("#group-list-section")?.textContent ?? "",
      /KN · Lobby Profile/u,
      "the resolved group context keeps its established display"
    );
    await fleet.click(editGroup());
    assert.match(fleet.document.body.textContent ?? "", /目前 Playback Profile 已封存/u);
    assert.equal(fleet.editGroupOptions().some((label) => label.startsWith("Lobby Renamed")), false);
  } finally {
    await fleet.unmount();
  }
});
