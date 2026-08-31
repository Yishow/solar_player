import assert from "node:assert/strict";
import test from "node:test";
import {
  bootstrapImagePlaylistGovernance,
  buildApiUrl,
  fetchDisplayStoryPage,
  getDataSourceOverview,
  getEnergyHistory,
  getMonitoringDiagnostics,
  resetTodayTrend,
  isManagementAccessDeniedError,
  isManagementDraftConflictError,
  isViteDevRuntime,
  fetchImagePlaylist,
  fetchImagePlaylistGovernance,
  fetchSustainabilityStory,
  getPlaybackRuntime,
  getPlaybackProfiles,
  getDeviceLogs,
  isPlaybackProfileDraftConflictError,
  publishPlaybackProfile,
  rollbackPlaybackProfile,
  runDeviceKioskExit,
  getRuntimeBrandProfile,
  getRuntimeMqttStatus,
  saveDisplayCardOverride,
  clearDisplayCardOverride,
  resolveBrowserApiOrigin,
  updateAllImagePlaylistDurations,
  updateDisplayPageConfig,
  updateImagePlaylistSettings,
  requestJson,
  resetPlaybackRuntimeCacheForTest,
  savePlaybackProfileDraft
} from "./api";
import { buildRuntimeApiUrl } from "./runtimeOrigin";

test("getPlaybackRuntime reuses the cached payload after an ETag 304", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Headers[] = [];
  const payload = {
    context: { contextRevision: "ctx-1" },
    effectiveRotationRevision: "rotation-1",
    preview: {
      evaluatedAt: "2026-07-30T00:00:00.000Z",
      fallbackRoute: null,
      playablePages: [],
      skippedPages: []
    },
    profileRollout: {
      appliedVersion: null,
      desired: null,
      desiredVersion: null,
      lastError: null,
      updatedAt: null,
      updateState: "waiting"
    },
    settings: {}
  } as never;
  resetPlaybackRuntimeCacheForTest();
  globalThis.fetch = async (_input, init) => {
    const headers = new Headers(init?.headers);
    calls.push(headers);
    return calls.length === 1
      ? new Response(JSON.stringify(payload), {
          headers: {
            "content-type": "application/json",
            etag: "\"runtime-1\""
          },
          status: 200
        })
      : new Response(null, { status: 304 });
  };

  try {
    const first = await getPlaybackRuntime();
    const second = await getPlaybackRuntime();
    assert.deepEqual(first, payload);
    assert.equal(second, first);
    assert.equal(calls[0]?.has("if-none-match"), false);
    assert.equal(calls[1]?.get("if-none-match"), "\"runtime-1\"");
  } finally {
    resetPlaybackRuntimeCacheForTest();
    globalThis.fetch = originalFetch;
  }
});

test("buildRuntimeApiUrl keeps Vite dev browser requests same-origin", () => {
  assert.equal(
    buildRuntimeApiUrl("/api/images", {
      configuredVitePort: "5177",
      isViteDevServer: true,
      location: {
        hostname: "localhost",
        port: "5177",
        protocol: "http:"
      }
    }),
    "/api/images"
  );
});

test("buildRuntimeApiUrl keeps explicit API origin override consistent", () => {
  assert.equal(
    buildRuntimeApiUrl("/api/images", {
      apiBaseUrl: "https://display-api.example.test"
    }),
    "https://display-api.example.test/api/images"
  );
});

test("buildApiUrl falls back to the backend origin when the HMR runtime marker is absent", () => {
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
    assert.equal(buildApiUrl("/api/images"), "http://100.76.76.75:3000/api/images");
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow
    });
  }
});

test("isViteDevRuntime trusts Vite dev environment signals", () => {
  assert.equal(isViteDevRuntime({ hot: undefined }), false);
  assert.equal(isViteDevRuntime({ hot: {} }), true);
  assert.equal(isViteDevRuntime({ env: { DEV: true } }), true);
});

test("resolveBrowserApiOrigin keeps configured custom non-loopback Vite dev ports same-origin", () => {
  assert.equal(
    resolveBrowserApiOrigin(
      {
        hostname: "100.76.76.75",
        port: "4173",
        protocol: "http:"
      },
      "4173",
      true
    ),
    "http://100.76.76.75:4173"
  );
});

test("resolveBrowserApiOrigin sends preview traffic on Vite-like ports back to the backend origin", () => {
  assert.equal(
    resolveBrowserApiOrigin(
      {
        hostname: "100.76.76.75",
        port: "4173",
        protocol: "http:"
      },
      "4173",
      false
    ),
    "http://100.76.76.75:3000"
  );
});

test("resolveBrowserApiOrigin keeps configured custom Vite dev ports same-origin on loopback", () => {
  assert.equal(
    resolveBrowserApiOrigin(
      {
        hostname: "localhost",
        port: "4173",
        protocol: "http:"
      },
      "4173",
      true
    ),
    "http://localhost:4173"
  );
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

test("saveDisplayCardOverride sends the concrete metric scope in the PUT body", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  let requestedBody = "";

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    requestedBody = String(init?.body ?? "");
    return new Response(JSON.stringify({ row: {}, success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  };

  try {
    await saveDisplayCardOverride("overview.realTimePower", "cl", 60);
    assert.equal(
      requestedUrl,
      buildApiUrl("/api/display-card-data/overrides/overview.realTimePower")
    );
    assert.deepEqual(JSON.parse(requestedBody), { displayValue: 60, metricScope: "cl" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("clearDisplayCardOverride sends the concrete metric scope in the DELETE query", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";

  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify({ row: {}, success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  };

  try {
    await clearDisplayCardOverride("overview.realTimePower", "kn");
    assert.equal(
      requestedUrl,
      buildApiUrl("/api/display-card-data/overrides/overview.realTimePower?metricScope=kn")
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

test("getDataSourceOverview requests the read-only diagnostics endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];

  globalThis.fetch = async (input) => {
    requestedUrls.push(String(input));
    return new Response(
      JSON.stringify({
        generatedAt: "2026-06-16T00:00:00.000Z",
        warnings: []
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
    await getDataSourceOverview();
    assert.equal(
      requestedUrls[0],
      buildApiUrl("/api/data-source/overview?metricScope=global")
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getMonitoringDiagnostics requests the explicit management scope", async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];

  globalThis.fetch = async (input) => {
    requestedUrls.push(String(input));
    return new Response(
      JSON.stringify({
        generatedAt: "2026-08-31T00:00:00.000Z",
        requestedScope: "all",
        summaries: []
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
    const response = await getMonitoringDiagnostics();
    assert.equal(response.requestedScope, "all");
    assert.equal(
      requestedUrls[0],
      buildApiUrl("/api/data-source/monitoring-diagnostics?metricScope=all")
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getEnergyHistory requests one combined endpoint with explicit scope and range", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";

  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return new Response(
      JSON.stringify({
        counters: [],
        metricScope: "global",
        range: "month",
        snapshots: [],
        summaries: []
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200
      }
    );
  };

  try {
    const response = await getEnergyHistory("global", "month");
    assert.equal(response.metricScope, "global");
    assert.equal(response.range, "month");
    assert.equal(
      requestedUrl,
      buildApiUrl("/api/data-hub/energy-history?metricScope=global&range=month")
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("resetTodayTrend sends only the selected concrete scope and returns the scoped result", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  let requestedMethod = "";
  let requestedBody = "";

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    requestedMethod = init?.method ?? "";
    requestedBody = typeof init?.body === "string" ? init.body : "";
    return new Response(
      JSON.stringify({
        data: {
          deletedSnapshots: 2,
          metricScope: "cl",
          resetAt: "2026-08-31T03:00:00.000Z",
          resetDate: "2026-08-31"
        },
        success: true
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200
      }
    );
  };

  try {
    const result = await resetTodayTrend("cl");
    assert.equal(requestedUrl, buildApiUrl("/api/data-source/reset-today-trend"));
    assert.equal(requestedMethod, "POST");
    assert.deepEqual(JSON.parse(requestedBody), { metricScope: "cl" });
    assert.deepEqual(result, {
      deletedSnapshots: 2,
      metricScope: "cl",
      resetAt: "2026-08-31T03:00:00.000Z",
      resetDate: "2026-08-31"
    });
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

test("getDeviceLogs reads journald summary and maps unavailable envelopes", async () => {
  const originalFetch = globalThis.fetch;
  const seenUrls: string[] = [];

  globalThis.fetch = async (input) => {
    const url = String(input);
    seenUrls.push(url);

    if (url.includes("/api/device/logs?limit=20")) {
      return new Response(
        JSON.stringify({
          data: {
            available: true,
            entries: [
              {
                message: "player ready",
                priority: "info",
                timestamp: "2026-05-18T08:00:00.000Z"
              }
            ],
            retention: {
              maxEntries: 20,
              scope: "current-boot",
              unit: "solar-display"
            },
            source: "journald",
            unavailableReason: null
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
    }

    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const response = await getDeviceLogs(20);

    assert.deepEqual(seenUrls.map((url) => new URL(url).pathname + new URL(url).search), ["/api/device/logs?limit=20"]);
    assert.equal(response.source, "journald");
    assert.equal(response.available, true);
    assert.equal(response.entries[0]?.message, "player ready");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getDeviceLogs returns unavailable journal summary from 503 envelopes", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        data: {
          available: false,
          entries: [],
          retention: {
            maxEntries: 20,
            scope: "current-boot",
            unit: "solar-display"
          },
          source: "journald",
          unavailableReason: "journal access denied"
        },
        error: "journal access denied",
        success: false,
        timestamp: "2026-07-14T00:00:00.000Z"
      }),
      {
        headers: {
          "Content-Type": "application/json"
        },
        status: 503
      }
    );

  try {
    const response = await getDeviceLogs(20);
    assert.equal(response.available, false);
    assert.equal(response.unavailableReason, "journal access denied");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("runDeviceKioskExit posts to the dedicated kiosk-exit route and returns re-entry guidance", async () => {
  const originalFetch = globalThis.fetch;
  const seenUrls: string[] = [];
  const seenMethods: string[] = [];

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    seenUrls.push(url);
    seenMethods.push(String(init?.method ?? "GET"));

    return new Response(
      JSON.stringify({
        data: {
          scheduled: true,
          launcherName: "Solar Display Kiosk",
          reentryHint: "回到桌面後點擊 Solar Display Kiosk 重新進入。"
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
    const result = await runDeviceKioskExit();

    assert.equal(result.scheduled, true);
    assert.equal(result.launcherName, "Solar Display Kiosk");
    assert.match(result.reentryHint, /Solar Display Kiosk/);
    assert.ok(seenUrls.some((url) => url.includes("/api/device/kiosk-exit")));
    assert.ok(seenMethods.includes("POST"));
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
      { baseVersion: 4 },
      [
        {
          frame: { height: 4, left: 48, top: 24, width: 240 },
          id: "page-line",
          locked: false,
          metadata: {},
          mount: "content",
          source: { kind: "line" },
          style: { color: "#d2b46a", thickness: 4 },
          type: "line",
          visible: true,
          zIndex: 1
        }
      ]
    );

    assert.equal(response.version, 5);
    assert.match(seenUrl, /\/api\/display-pages\/overview\/draft$/);
    assert.match(seenBody, /"baseVersion":4/);
    assert.match(seenBody, /"freeformObjects":\[/);
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
          hasPlaylistRows: false,
          settings: { shuffle: false }
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
    assert.equal(response.playlist.settings.shuffle, false);
    assert.match(seenUrl, /\/api\/image-playlist\/governance$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateImagePlaylistSettings writes shuffle mode to the playlist settings endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenBody = "";
  let seenMethod = "";
  let seenUrl = "";

  globalThis.fetch = async (input, init) => {
    seenUrl = String(input);
    seenMethod = init?.method ?? "";
    seenBody = String(init?.body ?? "");

    return new Response(
      JSON.stringify({
        playlist: {
          settings: {
            shuffle: true
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
    const response = await updateImagePlaylistSettings({ shuffle: true });

    assert.equal(response.playlist.settings.shuffle, true);
    assert.equal(seenMethod, "PUT");
    assert.match(seenUrl, /\/api\/image-playlist\/settings$/);
    assert.deepEqual(JSON.parse(seenBody), { shuffle: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateAllImagePlaylistDurations writes the shared duration to the bulk endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenBody = "";
  let seenMethod = "";
  let seenUrl = "";

  globalThis.fetch = async (input, init) => {
    seenUrl = String(input);
    seenMethod = init?.method ?? "";
    seenBody = String(init?.body ?? "");

    return new Response(
      JSON.stringify({
        playlist: {
          entries: []
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
    await updateAllImagePlaylistDurations({ durationSeconds: 8 });

    assert.equal(seenMethod, "PUT");
    assert.match(seenUrl, /\/api\/image-playlist\/duration-all$/);
    assert.deepEqual(JSON.parse(seenBody), { durationSeconds: 8 });
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
          productTitleZh: "國瑞汽車綠能展示播放器",
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

test("Playback Profile API client saves Drafts and surfaces typed stale conflicts", async () => {
  const originalFetch = globalThis.fetch;
  const seen: Array<{ body: string; method: string; url: string }> = [];
  let requestCount = 0;
  globalThis.fetch = async (input, init) => {
    requestCount += 1;
    seen.push({
      body: String(init?.body ?? ""),
      method: init?.method ?? "GET",
      url: String(input)
    });
    if (requestCount === 1) {
      return new Response(JSON.stringify({ data: [], success: true }), {
        headers: { "content-type": "application/json" },
        status: 200
      });
    }
    return new Response(
      JSON.stringify({
        code: "profile_draft_conflict",
        currentRevision: 7,
        error: "Playback Profile Draft changed since it was loaded",
        success: false
      }),
      {
        headers: { "content-type": "application/json" },
        status: 409
      }
    );
  };

  try {
    assert.deepEqual(await getPlaybackProfiles(), []);
    await assert.rejects(
      async () => {
        try {
          await savePlaybackProfileDraft(3, {
            expectedRevision: 6,
            pages: [],
            settings: {} as never
          });
        } catch (error) {
          assert.equal(isPlaybackProfileDraftConflictError(error), true);
          throw error;
        }
      },
      /changed since it was loaded/
    );
    assert.deepEqual(seen.map(({ method }) => method), ["GET", "PUT"]);
    assert.match(seen[0]!.url, /\/api\/playback-profiles$/u);
    assert.match(seen[1]!.url, /\/api\/playback-profiles\/3\/draft$/u);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Playback Profile publish and rollback send server-attributed payloads", async () => {
  const originalFetch = globalThis.fetch;
  const seenBodies: string[] = [];
  globalThis.fetch = async (_input, init) => {
    seenBodies.push(String(init?.body ?? ""));
    return new Response(JSON.stringify({
      data: {
        createdAt: "2026-07-30T00:00:00.000Z",
        createdBy: "management-trusted",
        id: 1,
        profileId: 3,
        rollbackFromVersionId: null,
        schemaVersion: 1,
        snapshot: { pages: [], settings: {} },
        versionNumber: 1
      },
      success: true
    }), {
      headers: { "content-type": "application/json" },
      status: 200
    });
  };
  try {
    await publishPlaybackProfile(3, 7);
    await rollbackPlaybackProfile(3, 11);
    assert.deepEqual(seenBodies.map((body) => JSON.parse(body)), [
      { expectedRevision: 7 },
      { versionId: 11 }
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
