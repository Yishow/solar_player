import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React, { act } from "react";
import type { Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import test from "node:test";
import { DeviceFleetContent } from "./DeviceFleetContent";
import { GroupEditDialog } from "./GroupEditDialog";
import type { DeviceFleetRow } from "./viewModel";

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


