import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

test("SocketService keeps direct io broadcasts inside broadcastToAll", () => {
  const source = readFileSync(
    fileURLToPath(new URL("./SocketService.ts", import.meta.url)),
    "utf8"
  );
  const directBroadcasts = [...source.matchAll(/this\.io\.emit\(/g)];
  const allBroadcastMethod = source.indexOf("private broadcastToAll");
  const identifiedBroadcastMethod = source.indexOf("private broadcastToIdentified");

  assert.equal(directBroadcasts.length, 1);
  assert.ok(allBroadcastMethod >= 0);
  assert.ok(identifiedBroadcastMethod > allBroadcastMethod);

  const directBroadcastIndex = directBroadcasts[0]?.index;
  assert.ok(directBroadcastIndex !== undefined);
  // Pinning the sole `this.io.emit(` between the two declarations proves it sits
  // inside broadcastToAll — an emit added anywhere earlier (constructor, another
  // method) would fall outside this window.
  assert.ok(directBroadcastIndex > allBroadcastMethod);
  assert.ok(directBroadcastIndex < identifiedBroadcastMethod);
});
