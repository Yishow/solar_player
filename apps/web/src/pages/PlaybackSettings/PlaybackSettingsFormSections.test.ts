import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const source = readFileSync(path.join(import.meta.dirname, "PlaybackSettingsFormSections.tsx"), "utf8");

test("playback settings uses CustomSelect for page enablement instead of a click-only div dropdown", () => {
    assert.match(source, /<CustomSelect/);
    assert.doesNotMatch(source, /ps-dropdown-menu/);
    assert.doesNotMatch(source, /ps-dropdown-item/);
});

test("playback settings stepper uses pointer events instead of duplicate mouse plus touch handlers", () => {
    assert.match(source, /onPointerDown=\{\(\) => startChanging\(-1\)\}/);
    assert.match(source, /onPointerDown=\{\(\) => startBrightnessChange\(-1\)\}/);
    assert.doesNotMatch(source, /onTouchStart/);
    assert.doesNotMatch(source, /onMouseDown/);
});

test("playback settings exposes transition type and speed controls", () => {
    assert.match(source, /updateSettingsField\("transitionType"/);
    assert.match(source, /updateSettingsField\("transitionSpeed"/);
    assert.match(source, /Math\.max\(120, Number\.parseInt\(event\.target\.value, 10\) \|\| 120\)/);
    assert.match(source, /value=\{settings\?\.transitionType \?\? "fade"\}/);
    assert.match(source, /\{ label: "淡入淡出 Fade", value: "fade" \}/);
    assert.match(source, /\{ label: "滑動切換 Slide", value: "slide" \}/);
    assert.match(source, /\{ label: "無轉場 None", value: "none" \}/);
});
