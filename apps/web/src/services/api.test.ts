import assert from "node:assert/strict";
import test from "node:test";
import {
  bootstrapImagePlaylistGovernance,
  buildApiUrl,
  fetchImagePlaylist,
  fetchImagePlaylistGovernance,
  fetchSustainabilityStory,
  requestJson
} from "./api";

test("buildApiUrl maps loopback Vite dev ports back to the backend port", () => {
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

test("buildApiUrl keeps non-loopback Vite dev hosts on the current origin so proxy rules can forward API traffic", () => {
  const originalWindow = globalThis.window;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: {
        hostname: "100.76.76.75",
        port: "5173",
        protocol: "http:"
      }
    }
  });

  try {
    assert.equal(buildApiUrl("/api/images"), "http://100.76.76.75:5173/api/images");
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

test("fetchSustainabilityStory forwards the selected period to the shared story endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = "";

  globalThis.fetch = async (input) => {
    seenUrl = String(input);

    return new Response(
      JSON.stringify({
        story: {
          availablePeriods: ["month", "quarter", "year", "lifetime"],
          modules: [],
          periods: {
            quarter: {
              bigNumbers: {
                annualEnergySavingPercent: 7.2,
                accumulatedCarbonReductionTons: 312,
                accumulatedGenerationGwh: 4.8,
                plantedTreeEquivalent: 980
              },
              highlights: [],
              provenance: {
                label: "季報",
                source: "quarterly-rollup",
                syncState: "fresh",
                updatedAt: "2026-05-13T10:00:00.000Z"
              }
            }
          },
          selectedPeriod: "quarter"
        }
      }),
      {
        headers: {
          "Content-Type": "application/json"
        },
        status: 200
      }
    );
  };

  try {
    const response = await fetchSustainabilityStory("quarter");

    assert.equal(response.story.selectedPeriod, "quarter");
    assert.match(seenUrl, /\/api\/sustainability-story\?period=quarter$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchImagePlaylist can request a read-only snapshot without bootstrap side effects", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = "";

  globalThis.fetch = async (input) => {
    seenUrl = String(input);

    return new Response(
      JSON.stringify({
        playlist: {
          activeEntry: null,
          entries: [],
          generatedAt: "2026-05-19T00:00:00.000Z",
          hasPlaylistRows: false
        }
      }),
      {
        headers: {
          "Content-Type": "application/json"
        },
        status: 200
      }
    );
  };
  try {
    const response = await fetchImagePlaylist(0, { bootstrap: false });
    assert.equal(response.playlist.activeEntry, null);
    assert.equal(response.playlist.hasPlaylistRows, false);
    assert.match(seenUrl, /\/api\/image-playlist\?activeIndex=0&bootstrap=false$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchImagePlaylistGovernance targets the raw governance snapshot endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = "";

  globalThis.fetch = async (input) => {
    seenUrl = String(input);

    return new Response(
      JSON.stringify({
        playlist: {
          entries: [],
          generatedAt: "2026-05-19T00:00:00.000Z",
          hasPlaylistRows: false
        }
      }),
      {
        headers: {
          "Content-Type": "application/json"
        },
        status: 200
      }
    );
  };

  try {
    const response = await fetchImagePlaylistGovernance();

    assert.equal(response.playlist.entries.length, 0);
    assert.equal(response.playlist.hasPlaylistRows, false);
    assert.match(seenUrl, /\/api\/image-playlist\/governance$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("bootstrapImagePlaylistGovernance targets the explicit governance bootstrap endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = "";
  let seenMethod = "";

  globalThis.fetch = async (input, init) => {
    seenUrl = String(input);
    seenMethod = init?.method ?? "GET";

    return new Response(
      JSON.stringify({
        playlist: {
          entries: [],
          generatedAt: "2026-05-19T00:00:00.000Z",
          hasPlaylistRows: true
        }
      }),
      {
        headers: {
          "Content-Type": "application/json"
        },
        status: 200
      }
    );
  };

  try {
    const response = await bootstrapImagePlaylistGovernance();

    assert.equal(response.playlist.hasPlaylistRows, true);
    assert.equal(seenMethod, "POST");
    assert.match(seenUrl, /\/api\/image-playlist\/governance\/bootstrap$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
