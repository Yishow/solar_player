import assert from "node:assert/strict";
import test from "node:test";
import { createBoundedCache } from "./displayDataPreviewService.js";

test("bounded cache never retains more entries than its limit", () => {
  const cache = createBoundedCache<number>(3);
  for (let index = 0; index < 10; index += 1) {
    cache.set(`key-${index}`, index);
    assert.ok(cache.size <= 3, `size ${cache.size} must stay within the limit`);
  }
  assert.equal(cache.size, 3);
});

test("bounded cache evicts the least recently inserted entry", () => {
  const cache = createBoundedCache<string>(2);
  cache.set("a", "first");
  cache.set("b", "second");
  cache.set("c", "third");

  assert.equal(cache.get("a"), undefined);
  assert.equal(cache.get("b"), "second");
  assert.equal(cache.get("c"), "third");
});

test("bounded cache refreshes insertion order when a key is written again", () => {
  const cache = createBoundedCache<string>(2);
  cache.set("a", "first");
  cache.set("b", "second");
  cache.set("a", "first-again");
  cache.set("c", "third");

  assert.equal(cache.get("b"), undefined);
  assert.equal(cache.get("a"), "first-again");
  assert.equal(cache.get("c"), "third");
});

test("bounded cache rejects a limit that would disable caching silently", () => {
  assert.throws(() => createBoundedCache<string>(0), /positive integer/u);
  assert.throws(() => createBoundedCache<string>(-1), /positive integer/u);
  assert.throws(() => createBoundedCache<string>(1.5), /positive integer/u);
});
