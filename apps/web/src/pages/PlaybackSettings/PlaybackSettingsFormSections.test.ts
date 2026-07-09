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
    assert.match(source, /updateSettingsField\(\s*"transitionSpeed"/);
    assert.match(source, /PLAYBACK_TRANSITION_SPEED_MAX_MS/);
    assert.match(source, /PLAYBACK_TRANSITION_SPEED_MIN_MS/);
    assert.match(source, /normalizePlaybackTransitionSpeed\(Number\.parseInt\(event\.target\.value, 10\)\)/);
    assert.match(source, /value=\{settings\?\.transitionType \?\? "fade"\}/);
    assert.match(source, /\{ label: "淡入淡出 Fade", value: "fade" \}/);
    assert.match(source, /\{ label: "滑動切換 Slide", value: "slide" \}/);
    assert.match(source, /\{ label: "無轉場 None", value: "none" \}/);
});

test("playback settings exposes factory site enablement as playback page enabled state", () => {
    assert.match(source, /廠區啟用/);
    assert.match(source, /Factory Sites/);
    assert.match(source, /ps-site-control/);
    assert.match(source, /viewModel\.factorySiteRows\.map/);
    assert.match(source, /page\.pageKey === pageKey \? \{ \.\.\.page, enabled \}/);
    assert.match(source, /ps-card-control/);
    assert.doesNotMatch(source, /ps-card-sites/);
});

test("playback settings exposes the live data freshness enforcement toggle", () => {
    assert.match(source, /即時資料 freshness 檢查/);
    assert.match(source, /Live Data Freshness/);
    assert.match(source, /settings\?\.enforceFreshRuntimeData \?\? true/);
    assert.match(source, /updateSettingsField\("enforceFreshRuntimeData", next\)/);
});

test("playback settings form sections are memoized for tick and preview isolation", () => {
    assert.match(source, /export const PlaybackSettingsFormSections = memo\(function PlaybackSettingsFormSections/);
});
