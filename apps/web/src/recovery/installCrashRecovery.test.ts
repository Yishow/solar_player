import assert from "node:assert/strict";
import test from "node:test";
import {
  installCrashRecoveryWithEnvironment,
  type CrashRecoveryWindowLike
} from "./installCrashRecovery";

type Listener = (event: unknown) => void;

function createFakeWindow(options: {
  storageThrows?: boolean;
} = {}) {
  const listeners = new Map<string, Set<Listener>>();
  let reloadCount = 0;
  let storedValue: string | null = null;

  const fakeWindow: CrashRecoveryWindowLike = {
    addEventListener(event, listener) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }

      listeners.get(event)?.add(listener);
    },
    location: {
      reload() {
        reloadCount += 1;
      }
    },
    removeEventListener(event, listener) {
      listeners.get(event)?.delete(listener);
    },
    sessionStorage: {
      getItem() {
        if (options.storageThrows) {
          throw new Error("storage unavailable");
        }

        return storedValue;
      },
      setItem(_key, value) {
        if (options.storageThrows) {
          throw new Error("storage unavailable");
        }

        storedValue = value;
      }
    }
  };

  return {
    dispatch(event: string, payload: unknown) {
      listeners.get(event)?.forEach((listener) => {
        listener(payload);
      });
    },
    fakeWindow,
    get reloadCount() {
      return reloadCount;
    },
    get storedValue() {
      return storedValue;
    }
  };
}

test("installCrashRecovery reloads chunk failures within budget and unregisters listeners on dispose", () => {
  const fake = createFakeWindow();
  const dispose = installCrashRecoveryWithEnvironment(fake.fakeWindow, {
    now: () => 1_000_000
  });

  fake.dispatch("unhandledrejection", {
    reason: "Failed to fetch dynamically imported module: /assets/x.js"
  });

  assert.equal(fake.reloadCount, 1);
  assert.match(fake.storedValue ?? "", /1000000/);

  dispose();
  fake.dispatch("vite:preloadError", {
    preventDefault() {}
  });

  assert.equal(fake.reloadCount, 1);
});

test("installCrashRecovery ignores unhandled rejections that are not chunk failures", () => {
  const fake = createFakeWindow();

  installCrashRecoveryWithEnvironment(fake.fakeWindow, {
    now: () => 1_000_000
  });

  fake.dispatch("unhandledrejection", {
    reason: new TypeError("TypeError: cannot read properties of undefined")
  });

  assert.equal(fake.reloadCount, 0);
});

test("installCrashRecovery tolerates sessionStorage failures without throwing", () => {
  const fake = createFakeWindow({
    storageThrows: true
  });

  assert.doesNotThrow(() => {
    const dispose = installCrashRecoveryWithEnvironment(fake.fakeWindow, {
      now: () => 1_000_000
    });

    fake.dispatch("vite:preloadError", {
      preventDefault() {}
    });
    dispose();
  });

  assert.equal(fake.reloadCount, 1);
});
