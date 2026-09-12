import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { act, type ReactNode } from "react";
import { JSDOM } from "jsdom";
import { GroupEditDialog } from "./GroupEditDialog";
import { PairingDialog, type PairingDialogProps } from "./PairingDialog";

async function mountDialog(t: TestContext) {
  const dom = new JSDOM("<!doctype html><body><main data-dialog-focus-fallback tabindex='-1'><button id='trigger'>Open</button><div id='root'></div></main><button id='outside'>Outside</button></body>");
  const globals = { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true };
  const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, value });
  const { createRoot } = await import("react-dom/client");
  const errors: unknown[] = [];
  dom.window.addEventListener("error", (event) => errors.push(event.error));
  const root = createRoot(dom.window.document.querySelector("#root")!);
  t.after(async () => {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    assert.deepEqual(errors, [], "focus interactions must not throw browser errors");
  });
  const trigger = dom.window.document.querySelector<HTMLButtonElement>("#trigger")!;
  trigger.focus();
  const render = async (element: ReactNode) => act(async () => root.render(element));
  const key = async (key: string, shiftKey = false) => act(async () => {
    dom.window.document.activeElement!.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true }));
  });
  return { dom, trigger, render, key };
}

const profiles = [{ id: 1, name: "Default", profileKey: "default", isDefault: true, archivedAt: null }];
const group = { id: 7, name: "CL Lobby", enabled: true, siteScope: "cl" as const, playbackProfileId: 1, playbackProfile: profiles[0]!, desiredVersion: 1 };
const device = { groupId: 7, groupName: "CL Lobby", groupEnabled: true, siteScope: "cl", playbackProfileId: 1, playbackProfileName: "Default", enabled: true, displayName: "Lobby", clientId: "lobby", paired: false } as PairingDialogProps["device"];

test("fleet-dialog-focus-cycle: Group initial focus, wrap, Escape, and restore", async (t) => {
  const h = await mountDialog(t);
  let closed = 0;
  await h.render(<GroupEditDialog group={group} profiles={profiles} mutationPending={false} onSubmit={async () => true} onClose={() => { closed += 1; }} />);
  assert.equal(h.dom.window.document.activeElement?.getAttribute("data-field"), "group-name");
  await h.key("Tab", true);
  assert.equal(h.dom.window.document.activeElement?.getAttribute("data-action"), "cancel-group-edit");
  await h.key("Tab");
  assert.equal(h.dom.window.document.activeElement?.getAttribute("data-field"), "group-name");
  await h.key("Escape");
  assert.equal(closed, 1);
  await h.render(null);
  assert.equal(h.dom.window.document.activeElement?.id, "trigger");
});

test("fleet-dialog-pending-escape: no available controls keeps focus on dialog and blocks dismissal", async (t) => {
  const h = await mountDialog(t);
  let closed = 0;
  const render = (pending: boolean) => h.render(<GroupEditDialog group={group} profiles={profiles} mutationPending={pending} onSubmit={async () => true} onClose={() => { closed += 1; }} />);
  await render(false);
  await render(true);
  assert.equal(h.dom.window.document.activeElement?.getAttribute("role"), "dialog");
  await h.key("Escape");
  await h.key("Tab");
  assert.equal(closed, 0);
  assert.equal(h.dom.window.document.activeElement?.getAttribute("role"), "dialog");
  await act(async () => h.dom.window.document.querySelector<HTMLButtonElement>("#outside")!.focus());
  assert.equal(h.dom.window.document.activeElement?.getAttribute("role"), "dialog");
  h.trigger.remove();
  await h.render(null);
  assert.equal(h.dom.window.document.activeElement?.tagName, "MAIN");
});

test("Fleet pairing uses its existing close lifecycle and never dismisses during mutation", async (t) => {
  const h = await mountDialog(t);
  let closed = 0;
  let mutations = 0;
  const render = (pending: boolean) => h.render(<PairingDialog device={device} issue={null} mutationError="" mutationPending={pending} onClose={() => { closed += 1; }} onConfirm={async () => { mutations += 1; }} />);
  await render(false);
  assert.equal(h.dom.window.document.activeElement?.getAttribute("data-action"), "cancel-pairing");
  await render(true);
  await h.key("Escape");
  assert.equal(closed, 0);
  assert.equal(mutations, 0);
  await render(false);
  await h.key("Escape");
  assert.equal(closed, 1);
  await h.render(null);
  assert.equal(h.dom.window.document.activeElement?.id, "trigger");
});
