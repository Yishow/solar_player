import assert from "node:assert/strict";
import test from "node:test";
import {
  bootstrapImagePlaylistGovernance,
  buildApiUrl,
  fetchDisplayStoryPage,
  isManagementAccessDeniedError,
  isManagementDraftConflictError,
  fetchImagePlaylist,
  fetchImagePlaylistGovernance,
  fetchSustainabilityStory,
  getRuntimeBrandProfile,
  getRuntimeMqttStatus,
  updateDisplayPageConfig,
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

test("requestJson surfaces explicit management denied envelopes as typed access-denied errors", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        access: "denied",
        code: "management_access_denied",
        error: "Management access denied",
        requiredRole: "management-trusted",
        success: false,
        timestamp: "2026-05-20T12:00:00.000Z"
      }),
      {
        headers: {
          "Content-Type": "application/json"
        },
        status: 403
      }
    );

  try {
    await assert.rejects(async () => {
      try {
        await requestJson("/api/device/status");
      } catch (error) {
        assert.equal(isManagementAccessDeniedError(error), true);
        throw error;
      }
    }, /Management access denied/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requestJson surfaces explicit management draft conflicts as typed optimistic-concurrency errors", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        code: "management_draft_conflict",
        conflict: {
          baseVersion: 4,
          currentVersion: 5,
          latestEnvelope: {
            pageId: "overview",
            regions: {
              heroCopyLayout: {
                left: 120
              }
            },
            stage: "draft",
            updatedAt: "2026-05-20T10:00:00.000Z",
            version: 5
          },
          resourceId: "overview",
          resourceType: "display-page-draft"
        },
        error: "Draft save conflict",
        success: false,
        timestamp: "2026-05-20T12:00:00.000Z"
      }),
      {
        headers: {
          "Content-Type": "application/json"
        },
        status: 409
      }
    );

  try {
    await assert.rejects(async () => {
      try {
        await requestJson("/api/display-pages/overview/draft", {
          body: JSON.stringify({ baseVersion: 4, regions: {} }),
          method: "PUT"
        });
      } catch (error) {
        assert.equal(isManagementDraftConflictError(error), true);
        throw error;
      }
    }, /Draft save conflict/);
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

test("fetchDisplayStoryPage requests the page-scoped display story endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = "";

  globalThis.fetch = async (input) => {
    seenUrl = String(input);

    return new Response(
      JSON.stringify({
        generatedAt: "2026-05-22T13:30:00.000Z",
        pageId: "overview",
        payload: {
          metrics: [
            {
              metricKey: "todayGeneration"
            }
          ],
          summary: {
            alertTone: "normal",
            bindingState: "bound",
            fallbackReason: null,
            freshnessState: "fresh"
          }
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
    const response = await fetchDisplayStoryPage("overview");

    assert.match(seenUrl, /\/api\/display-story\/overview$/);
    assert.equal(response.pageId, "overview");
    assert.equal(response.payload.summary.bindingState, "bound");
    assert.equal(response.payload.metrics[0]?.metricKey, "todayGeneration");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateDisplayPageConfig forwards the draft baseVersion precondition to the draft save endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenBody = "";
  let seenUrl = "";

  globalThis.fetch = async (input, init) => {
    seenUrl = String(input);
    seenBody = String(init?.body ?? "");

    return new Response(
      JSON.stringify({
        config: {
          pageId: "overview",
          regions: {
            heroCopyLayout: {
              left: 120
            }
          },
          stage: "draft",
          updatedAt: "2026-05-20T10:00:00.000Z",
          version: 5
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
    const response = await updateDisplayPageConfig(
      "overview",
      { heroCopyLayout: { left: 120 } },
      "draft",
      { baseVersion: 4 }
    );

    assert.equal(response.version, 5);
    assert.match(seenUrl, /\/api\/display-pages\/overview\/draft$/);
    assert.match(seenBody, /"baseVersion":4/);
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

test("fetchImagePlaylist targets the pure runtime read playlist contract", async () => {
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
    const response = await fetchImagePlaylist(0);
    assert.equal(response.playlist.activeEntry, null);
    assert.equal(response.playlist.hasPlaylistRows, false);
    assert.match(seenUrl, /\/api\/image-playlist\?activeIndex=0$/);
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

test("getRuntimeBrandProfile targets the public active-brand bootstrap endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = "";

  globalThis.fetch = async (input) => {
    seenUrl = String(input);

    return new Response(
      JSON.stringify({
        data: {
          brandNameZh: "國瑞汽車",
          brandNameEn: "KUOZUI MOTORS",
          logoUrl: "/uploads/brand/default.png",
          productTitleZh: "國瑞汽車中廠綠能展示播放器",
          productTitleEn: "KUOZUI GREEN ENERGY DISPLAY PLAYER",
          sloganZh: "永續，從現在開始",
          sloganEn: "/ Sustainability Starts with Us"
        },
        success: true
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
    const brand = await getRuntimeBrandProfile();
    assert.equal(brand.brandNameZh, "國瑞汽車");
    assert.match(seenUrl, /\/api\/brand\/profiles\/active$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getRuntimeMqttStatus targets the public-safe runtime mqtt bootstrap endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = "";

  globalThis.fetch = async (input) => {
    seenUrl = String(input);

    return new Response(
      JSON.stringify({
        status: {
          broker: "mqtt.example:1883",
          clientId: "display-player",
          connected: true,
          reason: null,
          updatedAt: "2026-05-20T12:00:00.000Z"
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
    const status = await getRuntimeMqttStatus();
    assert.equal(status.connected, true);
    assert.match(seenUrl, /\/api\/runtime\/mqtt-status$/);
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
