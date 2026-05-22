import assert from "node:assert/strict";
import test from "node:test";
import { loadDisplayStoryRuntimePayload } from "./useDisplayStoryRuntime";

test("loadDisplayStoryRuntimePayload reads only the requested page payload from the page-scoped endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = "";

  globalThis.fetch = async (input) => {
    seenUrl = String(input);

    return new Response(
      JSON.stringify({
        generatedAt: "2026-05-22T13:31:00.000Z",
        pageId: "solar",
        payload: {
          kpis: [
            {
              comparison: {
                delta: null,
                fallbackReason: null,
                label: "今日目標",
                state: "on-target"
              },
              metricKey: "todayGeneration"
            }
          ],
          story: {
            flowState: {
              reason: "ready",
              state: "normal"
            }
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
    const payload = await loadDisplayStoryRuntimePayload("solar");

    assert.match(seenUrl, /\/api\/display-story\/solar$/);
    assert.equal(payload.story.flowState.state, "normal");
    assert.equal(payload.kpis[0]?.metricKey, "todayGeneration");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
