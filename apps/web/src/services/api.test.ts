import assert from "node:assert/strict";
import test from "node:test";
import { buildApiUrl, requestJson } from "./api";

test("buildApiUrl maps any Vite dev port back to the backend port", () => {
  const originalWindow = globalThis.window;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: {
        hostname: "localhost",
        port: "5177",
        protocol: "http:"
      }
    }
  });

  try {
    assert.equal(buildApiUrl("/api/images"), "http://localhost:3000/api/images");
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow
    });
  }
});

test("requestJson prefers JSON error messages over the raw serialized body", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        code: "ECONNREFUSED",
        message: "connect ECONNREFUSED 127.0.0.1:18831",
        statusCode: 500
      }),
      {
        headers: {
          "Content-Type": "application/json"
        },
        status: 500
      }
    );

  try {
    await assert.rejects(
      () => requestJson("/api/settings/mqtt/test"),
      /connect ECONNREFUSED 127\.0\.0\.1:18831/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requestJson does not force application/json when the request has no body", async () => {
  const originalFetch = globalThis.fetch;
  let seenContentType: string | null = null;

  globalThis.fetch = async (_input, init) => {
    const headers = new Headers(init?.headers);
    seenContentType = headers.get("Content-Type");

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        "Content-Type": "application/json"
      },
      status: 200
    });
  };

  try {
    const response = await requestJson<{ success: boolean }>("/api/device/clear-cache", {
      method: "POST"
    });

    assert.equal(response.success, true);
    assert.equal(seenContentType, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requestJson keeps caller headers while still using the normalized Headers object", async () => {
  const originalFetch = globalThis.fetch;
  let seenTraceId: string | null = null;

  globalThis.fetch = async (_input, init) => {
    const headers = new Headers(init?.headers);
    seenTraceId = headers.get("X-Trace-Id");

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        "Content-Type": "application/json"
      },
      status: 200
    });
  };

  try {
    const response = await requestJson<{ success: boolean }>("/api/brand/profiles", {
      headers: {
        "X-Trace-Id": "brand-review"
      }
    });

    assert.equal(response.success, true);
    assert.equal(seenTraceId, "brand-review");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
