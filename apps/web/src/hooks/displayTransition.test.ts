import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { resolveDisplayTransitionMode, resolveTransitionDurations, shouldAnimateTransition, shouldEnterInPhase } from "./displayTransition";

const globalCss = fs.readFileSync(new URL("../styles/global.css", import.meta.url), "utf8");

test("shouldAnimateTransition skips animation for reduced-motion, none, or unloaded settings", () => {
  assert.equal(shouldAnimateTransition("fade", true), false);
  assert.equal(shouldAnimateTransition("none", false), false);
  assert.equal(shouldAnimateTransition(undefined, false), false);
});

test("shouldAnimateTransition animates fade and slide when motion is allowed", () => {
  assert.equal(shouldAnimateTransition("fade", false), true);
  assert.equal(shouldAnimateTransition("slide", false), true);
});

test("resolveDisplayTransitionMode keeps configured fade and slide modes when motion is allowed", () => {
  assert.equal(resolveDisplayTransitionMode("fade", false), "fade");
  assert.equal(resolveDisplayTransitionMode("slide", false), "slide");
  assert.equal(resolveDisplayTransitionMode("none", false), "none");
  assert.equal(resolveDisplayTransitionMode("slide", true), "none");
});

test("global transition css gives slide its own phase animations", () => {
  assert.match(globalCss, /@keyframes display-transition-slide-out/);
  assert.match(globalCss, /@keyframes display-transition-slide-in/);
  assert.match(
    globalCss,
    /\.display-transition\[data-transition="slide"\]\[data-phase="out"\]/
  );
  assert.match(
    globalCss,
    /\.display-transition\[data-transition="slide"\]\[data-phase="in"\]/
  );
});

test("resolveTransitionDurations splits the speed budget with a shorter out phase", () => {
  assert.deepEqual(resolveTransitionDurations(1000), { inMs: 700, outMs: 300, totalMs: 1000 });
  assert.deepEqual(resolveTransitionDurations(450), { inMs: 270, outMs: 180, totalMs: 450 });
});

test("resolveTransitionDurations clamps the total budget and caps the out phase", () => {
  // total clamps to 1200; out capped at 300
  assert.deepEqual(resolveTransitionDurations(5000), { inMs: 900, outMs: 300, totalMs: 1200 });
  // below the floor clamps up to 120
  assert.deepEqual(resolveTransitionDurations(50), { inMs: 72, outMs: 48, totalMs: 120 });
});

test("shouldEnterInPhase waits for the navigated route to become current before fading in", () => {
  // 導向 /solar 但 location 仍停在 /overview（loader 尚未完成）→ 不可進 in，避免舊頁淡回。
  assert.equal(shouldEnterInPhase("/solar", "/overview"), false);
  // 新 route 真正掛載後才允許淡入。
  assert.equal(shouldEnterInPhase("/solar", "/solar"), true);
  // 沒有 pending 導航時不觸發淡入。
  assert.equal(shouldEnterInPhase(null, "/overview"), false);
});

test("global transition css hides the held phase so the stale page never fades back in", () => {
  assert.match(globalCss, /\.display-transition\[data-phase="hold"\]/);
  assert.match(globalCss, /\.display-transition\[data-phase="hold"\]\s*\{[^}]*opacity:\s*0/);
});

test("resolveTransitionDurations treats non-positive or invalid speed as no animation", () => {
  assert.deepEqual(resolveTransitionDurations(0), { inMs: 0, outMs: 0, totalMs: 0 });
  assert.deepEqual(resolveTransitionDurations(-5), { inMs: 0, outMs: 0, totalMs: 0 });
  assert.deepEqual(resolveTransitionDurations(Number.NaN), { inMs: 0, outMs: 0, totalMs: 0 });
});
