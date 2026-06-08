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