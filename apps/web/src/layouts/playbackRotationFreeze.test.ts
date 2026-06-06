import assert from "node:assert/strict";
import test from "node:test";
import {
  isPlaybackRotationFrozen,
  resolvePlaybackRotationEnabled
} from "./playbackRotationFreeze";

test("rotation is not frozen without an autoplay override", () => {
  assert.equal(isPlaybackRotationFrozen(undefined), false);
  assert.equal(isPlaybackRotationFrozen(""), false);
  assert.equal(isPlaybackRotationFrozen("?foo=bar"), false);
});

test("autoplay=0 and autoplay=false freeze rotation", () => {
  assert.equal(isPlaybackRotationFrozen("?autoplay=0"), true);
  assert.equal(isPlaybackRotationFrozen("?autoplay=false"), true);
  assert.equal(isPlaybackRotationFrozen("?page=overview&autoplay=0"), true);
});

test("rotation enabled requires playback group and no freeze override", () => {
  assert.equal(resolvePlaybackRotationEnabled({ isPlaybackGroup: true, search: "" }), true);
  assert.equal(
    resolvePlaybackRotationEnabled({ isPlaybackGroup: true, search: "?autoplay=0" }),
    false
  );
  assert.equal(
    resolvePlaybackRotationEnabled({ isPlaybackGroup: false, search: "" }),
    false
  );
});
