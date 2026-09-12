import assert from "node:assert/strict";
import test from "node:test";
import { defaultFallbackPolicy } from "@solar-display/shared";
import { canEditDraft, resolveDraftInteractionState } from "./draftInteractionState";

const envelope = {
  fallbackPolicy: defaultFallbackPolicy,
  pageId: "overview" as const,
  publishedAt: null,
  publishedBy: null,
  regions: {},
  stage: "draft" as const,
  updatedAt: "2026-09-12T00:00:00.000Z",
  version: 7
};

test("draft interaction requires a matching authoritative baseline after loading", () => {
  assert.equal(
    canEditDraft({
      enabled: true,
      isLoading: true,
      lastLoadedEnvelope: null,
      pageId: "overview",
      stage: "draft"
    }),
    false
  );
  assert.equal(
    canEditDraft({
      enabled: true,
      isLoading: false,
      lastLoadedEnvelope: envelope,
      pageId: "overview",
      stage: "draft"
    }),
    true
  );
  assert.equal(
    canEditDraft({
      enabled: true,
      isLoading: true,
      lastLoadedEnvelope: envelope,
      pageId: "overview",
      stage: "draft"
    }),
    false
  );
});

test("draft interaction rejects an envelope belonging to another page or stage", () => {
  const otherPage = { ...envelope, pageId: "solar" as const };
  const otherStage = { ...envelope, stage: "live" as const };

  assert.equal(
    resolveDraftInteractionState({
      enabled: true,
      isLoading: false,
      lastLoadedEnvelope: otherPage,
      pageId: "overview",
      stage: "draft"
    }).canEdit,
    false
  );
  assert.equal(
    resolveDraftInteractionState({
      enabled: true,
      isLoading: false,
      lastLoadedEnvelope: otherStage,
      pageId: "overview",
      stage: "draft"
    }).canEdit,
    false
  );
});

test("live hydration keeps its existing editable contract", () => {
  const state = resolveDraftInteractionState({
    enabled: true,
    isLoading: true,
    lastLoadedEnvelope: null,
    pageId: "overview",
    stage: "live"
  });

  assert.equal(state.canEdit, true);
  assert.equal(state.hasAuthoritativeBaseline, false);
  assert.equal(state.isPending, false);
});
