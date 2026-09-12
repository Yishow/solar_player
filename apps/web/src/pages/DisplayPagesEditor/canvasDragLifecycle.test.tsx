import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { register } from "node:module";
import React, { act, useEffect, useState } from "react";
import { JSDOM } from "jsdom";
import type { CanvasRect } from "./canvasInteractions";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";
import { createPerformanceRegions } from "./uiPerformanceFixtures";
import { useDisplayEditorCanvasWorkflow } from "./useDisplayEditorCanvasWorkflow";

register(
  "data:text/javascript," +
    encodeURIComponent(
      "export async function load(url, context, next) { if (/\\.(css|png|svg|jpg|jpeg|gif|webp)$/.test(url)) return {format:'module', shortCircuit:true, source:'export default \"\";'}; return next(url, context); }"
    )
);

class FakeRafController {
  private callbacks = new Map<number, FrameRequestCallback>();
  private nextId = 1;

  requestAnimationFrame = (callback: FrameRequestCallback): number => {
    const id = this.nextId++;
    this.callbacks.set(id, callback);
    return id;
  };
  cancelAnimationFrame = (id: number): void => { this.callbacks.delete(id); };

  step(count = 1): number {
    let executed = 0;
    for (let i = 0; i < count; i++) {
      if (this.callbacks.size === 0) break;
      const entries = Array.from(this.callbacks.entries());
      this.callbacks.clear();
      for (const [, cb] of entries) {
        cb(performance.now());
        executed++;
      }
    }
    return executed;
  }
  get pendingCount(): number { return this.callbacks.size; }
}

type CommitRecord = {
  historyBase?: Record<string, unknown>;
  nextConfig: Record<string, unknown>;
};

function TestWorkflowHarness({
  editMode = true,
  lockedRegionIds = [],
  onCommit,
  onFeedbackUpdate,
  regions
}: {
  editMode?: boolean;
  lockedRegionIds?: string[];
  onCommit?: (record: CommitRecord) => void;
  onFeedbackUpdate?: (rect: CanvasRect | null) => void;
  regions: ResolvedDisplayEditorRegion[];
}) {
  const [config, setConfig] = useState<Record<string, unknown>>(() => ({
    regions: Object.fromEntries(
      regions.map((r) => [r.id, {
        left: r.geometry?.left ?? 0, top: r.geometry?.top ?? 0,
        width: r.geometry?.width ?? 0, height: r.geometry?.height ?? 0
      }])
    )
  }));
  const selectedRegion = regions[0]!;

  const workflow = useDisplayEditorCanvasWorkflow({
    applyConfigUpdate: (updater, options) => {
      const next = typeof updater === "function" ? updater(config) : updater;
      setConfig(next);
      onCommit?.({ historyBase: options?.historyBase, nextConfig: next });
    },
    canRedo: false, canUndo: false, config, distanceLockTargetRegion: null,
    editMode, lockedRegionIds, redo: () => {}, regions, selectedRegion,
    selectedRegionIds: [selectedRegion.id], selectionFeedbackLabel: null, undo: () => {}
  });

  const activeRect = workflow.overlayState.activeInteraction.rect;
  useEffect(() => {
    onFeedbackUpdate?.(activeRect);
  }, [activeRect, onFeedbackUpdate]);

  return (
    <button
      data-testid="drag-trigger"
      type="button"
      onPointerDown={(event) => workflow.onStartInteraction(event, selectedRegion, "drag")}
    >
      Start Drag
    </button>
  );
}

async function setupDragLifecycleTest(t: TestContext) {
  const dom = new JSDOM("<!doctype html><body><div id='root'></div></body>", {
    pretendToBeVisual: true, url: "http://127.0.0.1/display-pages/editor"
  });

  const fakeRaf = new FakeRafController();
  const globals = {
    window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
    PointerEvent: dom.window.PointerEvent, requestAnimationFrame: fakeRaf.requestAnimationFrame,
    cancelAnimationFrame: fakeRaf.cancelAnimationFrame, IS_REACT_ACT_ENVIRONMENT: true
  };

  const descriptors = new Map(
    Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)])
  );
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }

  const { createRoot } = await import("react-dom/client");
  const root = createRoot(dom.window.document.querySelector("#root")!);

  t.after(async () => {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });

  return { dom, fakeRaf, root };
}

test("drag-100-moves-10-frames: 100 pointermove events coalesced into 10 frames with one config commit", async (t) => {
  const { dom, fakeRaf, root } = await setupDragLifecycleTest(t);
  const regions = createPerformanceRegions();
  const feedbackUpdates: CanvasRect[] = [];
  const commits: CommitRecord[] = [];

  await act(async () => {
    root.render(
      <TestWorkflowHarness
        regions={regions}
        onFeedbackUpdate={(rect) => {
          if (rect) feedbackUpdates.push(rect);
        }}
        onCommit={(record) => commits.push(record)}
      />
    );
  });

  // 1. Trigger pointerdown on region 0
  const trigger = dom.window.document.querySelector<HTMLButtonElement>("[data-testid='drag-trigger']")!;
  await act(async () => {
    trigger.dispatchEvent(
      new dom.window.PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 })
    );
  });

  // Clear initial idle/start feedback measurement
  feedbackUpdates.length = 0;

  // 2. Dispatch 100 pointermove events, stepping rAF every 10 moves (10 frames total)
  for (let i = 1; i <= 100; i++) {
    dom.window.dispatchEvent(
      new dom.window.PointerEvent("pointermove", { bubbles: true, clientX: 100 + i * 2, clientY: 100 + i * 2 })
    );

    if (i % 10 === 0) {
      await act(async () => {
        fakeRaf.step(1);
      });
    }
  }

  // Verification: Exactly 10 feedback updates published during the 100 moves (excluding terminal clearing)
  assert.equal(
    feedbackUpdates.length,
    10,
    `Published ${feedbackUpdates.length} drag feedback updates across 10 rAF frames`
  );

  // 3. Dispatch pointerup to complete interaction
  await act(async () => {
    dom.window.dispatchEvent(
      new dom.window.PointerEvent("pointerup", { bubbles: true, clientX: 300, clientY: 300 })
    );
  });

  // Verification: Exactly 1 config commit was performed
  assert.equal(commits.length, 1, "Exactly one config commit performed on release");
  assert.ok(commits[0]!.historyBase !== undefined, "Commit contains historyBase");

  // Verification: Committed geometry corresponds to move 100 (delta: Math.round(200 / 0.5) = 400)
  const committedRegions = (commits[0]!.nextConfig as any).regions;
  const committedRegionGeometry = committedRegions[regions[0]!.id];
  assert.equal(committedRegionGeometry.left, 20 + 400);
  assert.equal(committedRegionGeometry.top, 20 + 400);
});

test("drag-release-before-frame: pointerup before scheduled frame commits latest move and prevents late feedback", async (t) => {
  const { dom, fakeRaf, root } = await setupDragLifecycleTest(t);
  const regions = createPerformanceRegions();
  const feedbackUpdates: CanvasRect[] = [];
  const commits: CommitRecord[] = [];

  await act(async () => {
    root.render(
      <TestWorkflowHarness
        regions={regions}
        onFeedbackUpdate={(rect) => {
          if (rect) feedbackUpdates.push(rect);
        }}
        onCommit={(record) => commits.push(record)}
      />
    );
  });

  // 1. Start drag
  const trigger = dom.window.document.querySelector<HTMLButtonElement>("[data-testid='drag-trigger']")!;
  await act(async () => {
    trigger.dispatchEvent(
      new dom.window.PointerEvent("pointerdown", { bubbles: true, clientX: 50, clientY: 50 })
    );
  });

  // 2. Dispatch a pointermove (schedules rAF callback without executing it)
  dom.window.dispatchEvent(
    new dom.window.PointerEvent("pointermove", { bubbles: true, clientX: 100, clientY: 100 })
  );
  assert.equal(fakeRaf.pendingCount, 1, "One rAF callback is pending");

  // 3. Immediately dispatch pointerup BEFORE the animation frame executes
  await act(async () => {
    dom.window.dispatchEvent(
      new dom.window.PointerEvent("pointerup", { bubbles: true, clientX: 100, clientY: 100 })
    );
  });

  // Verify commit occurred with latest move geometry (delta: (100 - 50) / 0.5 = 100)
  assert.equal(commits.length, 1, "Commit occurred on pointerup before rAF");
  const committedRegions = (commits[0]!.nextConfig as any).regions;
  assert.equal(committedRegions[regions[0]!.id].left, 20 + 100);
  assert.equal(committedRegions[regions[0]!.id].top, 20 + 100);

  // Verify pending rAF was cancelled on release
  assert.equal(fakeRaf.pendingCount, 0, "Pending rAF was cancelled upon release");

  // Step any leftover frames and verify no late feedback restores after release
  feedbackUpdates.length = 0;
  await act(async () => {
    fakeRaf.step(5);
  });
  assert.equal(feedbackUpdates.length, 0, "No late feedback restored after release");
});

test("drag-release-coordinate-differs-from-move: release coordinates different from last move do not re-sample", async (t) => {
  const { dom, fakeRaf, root } = await setupDragLifecycleTest(t);
  const regions = createPerformanceRegions();
  const commits: CommitRecord[] = [];

  await act(async () => {
    root.render(
      <TestWorkflowHarness
        regions={regions}
        onCommit={(record) => commits.push(record)}
      />
    );
  });

  const trigger = dom.window.document.querySelector<HTMLButtonElement>("[data-testid='drag-trigger']")!;
  await act(async () => {
    trigger.dispatchEvent(
      new dom.window.PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 })
    );
  });

  // Move to clientX 150 (delta 50 / 0.5 = 100)
  dom.window.dispatchEvent(
    new dom.window.PointerEvent("pointermove", { bubbles: true, clientX: 150, clientY: 150 })
  );

  // Release at clientX 250, clientY 250 (different from last move)
  await act(async () => {
    dom.window.dispatchEvent(
      new dom.window.PointerEvent("pointerup", { bubbles: true, clientX: 250, clientY: 250 })
    );
  });

  // Verify committed geometry matches the last pointermove (150, delta 100), not pointerup (250)
  assert.equal(commits.length, 1);
  const committedRegions = (commits[0]!.nextConfig as any).regions;
  assert.equal(committedRegions[regions[0]!.id].left, 20 + 100, "Committed left matches last pointermove");
  assert.equal(committedRegions[regions[0]!.id].top, 20 + 100, "Committed top matches last pointermove");
});

test("drag-session-teardown-no-late-update: teardown via lock or unmount cancels scheduled callbacks and drops late updates", async (t) => {
  const { dom, fakeRaf, root } = await setupDragLifecycleTest(t);
  const regions = createPerformanceRegions();
  const feedbackUpdates: CanvasRect[] = [];

  const renderHarness = async (editMode: boolean, lockedIds: string[]) => {
    await act(async () => {
      root.render(
        <TestWorkflowHarness
          editMode={editMode}
          lockedRegionIds={lockedIds}
          regions={regions}
          onFeedbackUpdate={(rect) => {
            if (rect) feedbackUpdates.push(rect);
          }}
        />
      );
    });
  };

  await renderHarness(true, []);

  // 1. Start drag and dispatch a move
  const trigger = dom.window.document.querySelector<HTMLButtonElement>("[data-testid='drag-trigger']")!;
  await act(async () => {
    trigger.dispatchEvent(
      new dom.window.PointerEvent("pointerdown", { bubbles: true, clientX: 50, clientY: 50 })
    );
  });
  dom.window.dispatchEvent(
    new dom.window.PointerEvent("pointermove", { bubbles: true, clientX: 120, clientY: 120 })
  );
  assert.equal(fakeRaf.pendingCount, 1, "rAF queued for drag feedback");

  // 2. Teardown interaction by locking the dragged region
  await renderHarness(true, [regions[0]!.id]);

  // Verify rAF was cancelled on teardown
  assert.equal(fakeRaf.pendingCount, 0, "rAF was cancelled when region became locked");

  // Step fake rAF and verify no feedback updates leak into ended session
  feedbackUpdates.length = 0;
  await act(async () => {
    fakeRaf.step(3);
  });
  assert.equal(feedbackUpdates.length, 0, "No late feedback updates after teardown");
});

test("drag-session-teardown-on-page-switch: removing region cancels interaction and prevents commit on release", async (t) => {
  const { dom, fakeRaf, root } = await setupDragLifecycleTest(t);
  const regions = createPerformanceRegions();
  const commits: CommitRecord[] = [];

  const renderHarness = async (activeRegions: ResolvedDisplayEditorRegion[]) => {
    await act(async () => {
      root.render(
        <TestWorkflowHarness
          regions={activeRegions}
          onCommit={(record) => commits.push(record)}
        />
      );
    });
  };

  await renderHarness(regions);

  const trigger = dom.window.document.querySelector<HTMLButtonElement>("[data-testid='drag-trigger']")!;
  await act(async () => {
    trigger.dispatchEvent(
      new dom.window.PointerEvent("pointerdown", { bubbles: true, clientX: 50, clientY: 50 })
    );
  });
  dom.window.dispatchEvent(
    new dom.window.PointerEvent("pointermove", { bubbles: true, clientX: 120, clientY: 120 })
  );
  assert.equal(fakeRaf.pendingCount, 1, "rAF queued for drag feedback");

  // Page switch: regions replaced with a list not containing initial region 0
  const switchedRegions = regions.slice(1);
  await renderHarness(switchedRegions);

  assert.equal(fakeRaf.pendingCount, 0, "rAF was cancelled when region was removed");

  // Release pointer after switch
  await act(async () => {
    dom.window.dispatchEvent(
      new dom.window.PointerEvent("pointerup", { bubbles: true, clientX: 120, clientY: 120 })
    );
  });

  assert.equal(commits.length, 0, "No commit occurred on release after region removal");
});
