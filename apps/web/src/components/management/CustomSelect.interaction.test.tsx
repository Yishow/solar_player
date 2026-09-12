import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { CustomSelect, type CustomSelectProps } from "./CustomSelect";

async function mountSelect(t: TestContext, overrides: Partial<CustomSelectProps> = {}) {
  const dom = new JSDOM("<!doctype html><body><div id='root'></div><button id='next'>Next</button></body>");
  const globals = { window: dom.window, document: dom.window.document, Node: dom.window.Node, IS_REACT_ACT_ENVIRONMENT: true };
  const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, value });
  const root = createRoot(dom.window.document.querySelector("#root")!);
  t.after(async () => {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  const changes: string[] = [];
  let props: CustomSelectProps = {
    value: "a", onChange: (value) => changes.push(value), "aria-label": "頁面",
    options: [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta", disabled: true }, { value: "c", label: "Charlie" }, { value: "d", label: "Delta" }],
    ...overrides
  };
  const render = async (next: Partial<CustomSelectProps> = {}) => {
    props = { ...props, ...next };
    await act(async () => root.render(<CustomSelect {...props} />));
  };
  await render();
  const trigger = dom.window.document.querySelector<HTMLButtonElement>(".mgmt-select-trigger")!;
  trigger.focus();
  const key = async (key: string) => act(async () => { trigger.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })); });
  const active = () => dom.window.document.getElementById(trigger.getAttribute("aria-activedescendant") ?? "")?.textContent;
  return { dom, trigger, key, active, changes, render };
}

test("select-keyboard-selection: labelled trigger navigates enabled options and commits once", async (t) => {
  const h = await mountSelect(t);
  assert.equal(h.trigger.getAttribute("role"), "combobox");
  assert.equal(h.trigger.getAttribute("aria-label"), "頁面");
  await h.key("ArrowDown");
  assert.equal(h.trigger.getAttribute("aria-expanded"), "true");
  assert.match(h.active() ?? "", /Alpha/);
  await h.key("ArrowDown");
  assert.equal(h.active(), "Charlie");
  await h.key("End");
  assert.equal(h.active(), "Delta");
  await h.key("Home");
  assert.match(h.active() ?? "", /Alpha/);
  await h.key("c");
  assert.equal(h.active(), "Charlie");
  await h.key("Enter");
  assert.deepEqual(h.changes, ["c"]);
  assert.equal(h.trigger.getAttribute("aria-expanded"), "false");
  assert.equal(h.dom.window.document.activeElement, h.trigger);
});

test("select dismissal preserves the selected value and Tab traversal", async (t) => {
  const h = await mountSelect(t);
  await h.key(" ");
  assert.equal(h.trigger.getAttribute("aria-expanded"), "true");
  await h.key("ArrowDown");
  await h.key("Escape");
  assert.deepEqual(h.changes, []);
  assert.equal(h.trigger.getAttribute("aria-expanded"), "false");
  await h.key("ArrowUp");
  assert.equal(h.trigger.getAttribute("aria-expanded"), "true");
  await h.key("Tab");
  assert.equal(h.trigger.getAttribute("aria-expanded"), "false");
  assert.deepEqual(h.changes, []);
  await h.key("Enter");
  await act(async () => h.dom.window.document.querySelector<HTMLButtonElement>("#next")!.focus());
  assert.equal(h.trigger.getAttribute("aria-expanded"), "false");
});

test("select-disabled-while-open: stale option and native events cannot change the value", async (t) => {
  const h = await mountSelect(t);
  await act(async () => h.trigger.click());
  const staleOption = h.dom.window.document.querySelectorAll<HTMLButtonElement>("[role=option]")[2]!;
  await h.render({ disabled: true });
  assert.equal(h.trigger.getAttribute("aria-expanded"), "false");
  assert.equal(h.dom.window.document.querySelector("[role=listbox]"), null);
  await act(async () => {
    staleOption.click();
    const native = h.dom.window.document.querySelector("select")!;
    native.value = "c";
    native.dispatchEvent(new h.dom.window.Event("change", { bubbles: true }));
  });
  await h.key("Enter");
  assert.deepEqual(h.changes, []);
});

test("select placeholder and disabled-only options never manufacture a selection", async (t) => {
  const h = await mountSelect(t, { value: "unknown", placeholder: "請選擇", options: [{ value: "b", label: "Beta", disabled: true }] });
  assert.match(h.trigger.textContent ?? "", /請選擇/);
  await h.key("ArrowDown");
  await h.key("Enter");
  assert.deepEqual(h.changes, []);
  await h.render({ options: [] });
  await h.key("Home");
  await h.key(" ");
  assert.deepEqual(h.changes, []);
});
