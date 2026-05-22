import assert from "node:assert/strict";
import test from "node:test";
import { startScreenWakeLockLifecycle } from "./useScreenWakeLock";

type Listener = () => void;

function createFakeSentinel() {
  let released = false;
  const releaseListeners = new Set<Listener>();

  return {
    addEventListener(event: string, listener: Listener) {
      if (event === "release") {
        releaseListeners.add(listener);
      }
    },
    async release() {
      released = true;
    },
    emitRelease() {
      released = true;
      for (const listener of releaseListeners) {
        listener();
      }
    },
    get released() {
      return released;
    }
  };
}

function createFakeDocument(initialVisibilityState: DocumentVisibilityState = "visible") {
  let visibilityState = initialVisibilityState;
  const listeners = new Set<Listener>();

  return {
    addEventListener(event: string, listener: Listener) {
      if (event === "visibilitychange") {
        listeners.add(listener);
      }
    },
    removeEventListener(event: string, listener: Listener) {
      if (event === "visibilitychange") {
        listeners.delete(listener);
      }
    },
    dispatchVisibilityChange(nextVisibilityState: DocumentVisibilityState) {
      visibilityState = nextVisibilityState;
      for (const listener of listeners) {
        listener();
      }
    },
    get visibilityState() {
      return visibilityState;
    }
  };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

test("startScreenWakeLockLifecycle requests a screen wake lock when enabled and releases it on dispose", async () => {
  const sentinel = createFakeSentinel();
  const documentLike = createFakeDocument();
  const requests: string[] = [];

  const stop = startScreenWakeLockLifecycle({
    document: documentLike,
    enabled: true,
    navigator: {
      wakeLock: {
        async request(type: string) {
          requests.push(type);
          return sentinel;
        }
      }
    }
  });

  await flushMicrotasks();
  assert.deepEqual(requests, ["screen"]);

  await stop();
  assert.equal(sentinel.released, true);
});

test("startScreenWakeLockLifecycle re-acquires the wake lock when the tab becomes visible without a sentinel", async () => {
  const firstSentinel = createFakeSentinel();
  const secondSentinel = createFakeSentinel();
  const documentLike = createFakeDocument("hidden");
  let requestCount = 0;

  const stop = startScreenWakeLockLifecycle({
    document: documentLike,
    enabled: true,
    navigator: {
      wakeLock: {
        async request() {
          requestCount += 1;
          return requestCount === 1 ? firstSentinel : secondSentinel;
        }
      }
    }
  });

  await flushMicrotasks();
  assert.equal(requestCount, 1);

  firstSentinel.emitRelease();
  documentLike.dispatchVisibilityChange("visible");
  await flushMicrotasks();

  assert.equal(requestCount, 2);
  await stop();
});

test("startScreenWakeLockLifecycle does not request a duplicate wake lock when a sentinel is still held", async () => {
  const sentinel = createFakeSentinel();
  const documentLike = createFakeDocument();
  let requestCount = 0;

  const stop = startScreenWakeLockLifecycle({
    document: documentLike,
    enabled: true,
    navigator: {
      wakeLock: {
        async request() {
          requestCount += 1;
          return sentinel;
        }
      }
    }
  });

  await flushMicrotasks();
  documentLike.dispatchVisibilityChange("visible");
  await flushMicrotasks();

  assert.equal(requestCount, 1);
  await stop();
});

test("startScreenWakeLockLifecycle degrades silently when wake lock is unsupported, rejected, or disabled", async () => {
  const documentLike = createFakeDocument();
  let requestCount = 0;

  const unsupportedStop = startScreenWakeLockLifecycle({
    document: documentLike,
    enabled: true,
    navigator: {}
  });
  await flushMicrotasks();
  assert.equal(requestCount, 0);
  await unsupportedStop();

  const rejectedStop = startScreenWakeLockLifecycle({
    document: documentLike,
    enabled: true,
    navigator: {
      wakeLock: {
        async request() {
          requestCount += 1;
          throw new Error("denied");
        }
      }
    }
  });
  await flushMicrotasks();
  assert.equal(requestCount, 1);
  await rejectedStop();

  const disabledStop = startScreenWakeLockLifecycle({
    document: documentLike,
    enabled: false,
    navigator: {
      wakeLock: {
        async request() {
          requestCount += 1;
          return createFakeSentinel();
        }
      }
    }
  });
  await flushMicrotasks();
  assert.equal(requestCount, 1);
  await disabledStop();
});
