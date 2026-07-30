import type {
  DisplayRotationPreview,
  DeviceProfileRolloutStatus,
  PlaybackPage,
  PlaybackProfileVersion,
  PlaybackRuntime,
  SafePlaybackBoundaryPlan
} from "@solar-display/shared";
import {
  createSafePlaybackBoundaryPlan,
  isDisplayPageTemplateKey,
  PLAYBACK_TRANSITION_SPEED_MAX_MS,
  PLAYBACK_TRANSITION_SPEED_MIN_MS,
  resolveSafePlaybackBoundaryRuntime
} from "@solar-display/shared";

export type StagedProfileRollout = {
  candidate: PlaybackProfileVersion | null;
  currentRuntime: PlaybackRuntime | null;
  nextPages: PlaybackPage[];
  plan: SafePlaybackBoundaryPlan | null;
  status: DeviceProfileRolloutStatus;
};

function isTime(value: string | null) {
  return value === null || /^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(value);
}

export function validateProfileRolloutCandidate(
  version: PlaybackProfileVersion,
  preview: DisplayRotationPreview
) {
  if (
    !Number.isInteger(version.id)
    || version.id <= 0
    || !Number.isInteger(version.profileId)
    || version.profileId <= 0
    || !Number.isInteger(version.versionNumber)
    || version.versionNumber <= 0
    || version.schemaVersion !== 1
  ) {
    return "unsupported Profile snapshot schema";
  }
  const pages = version.snapshot?.pages;
  const settings = version.snapshot?.settings;
  if (!Array.isArray(pages) || pages.length === 0) {
    return "invalid Profile pages";
  }
  if (pages.some((page) => (
      !Number.isInteger(page.id)
      || page.id <= 0
      || typeof page.pageKey !== "string"
      || !page.pageKey
      || typeof page.templateKey !== "string"
      || !isDisplayPageTemplateKey(page.templateKey)
      || typeof page.route !== "string"
      || !page.route.startsWith("/")
      || typeof page.labelZh !== "string"
      || typeof page.labelEn !== "string"
      || typeof page.enabled !== "boolean"
      || !Number.isInteger(page.displayOrder)
      || !Number.isInteger(page.durationSeconds)
      || page.durationSeconds < 1
    ))) {
    return "invalid Profile page reference";
  }
  if (
    new Set(pages.map((page) => page.id)).size !== pages.length
    || new Set(pages.map((page) => page.pageKey)).size !== pages.length
    || new Set(pages.map((page) => page.route)).size !== pages.length
    || new Set(pages.map((page) => page.displayOrder)).size !== pages.length
  ) {
    return "duplicate Profile page reference";
  }
  if (!pages.some((page) => page.enabled)) {
    return "Profile has no enabled page";
  }
  if (
    !settings
    || typeof settings.autoplay !== "boolean"
    || typeof settings.loop !== "boolean"
    || typeof settings.enforceFreshRuntimeData !== "boolean"
    || typeof settings.scheduleEnabled !== "boolean"
    || !isTime(settings.scheduleStart)
    || !isTime(settings.scheduleEnd)
    || !Array.isArray(settings.repeatDays)
    || new Set(settings.repeatDays).size !== settings.repeatDays.length
    || settings.repeatDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
    || !Number.isInteger(settings.startPage)
    || !pages.some((page) => page.id === settings.startPage)
    || !["fade", "slide", "none"].includes(settings.transitionType)
    || !Number.isFinite(settings.transitionSpeed)
    || (
      settings.transitionSpeed !== 0
      && (
        settings.transitionSpeed < PLAYBACK_TRANSITION_SPEED_MIN_MS
        || settings.transitionSpeed > PLAYBACK_TRANSITION_SPEED_MAX_MS
      )
    )
    || (settings.transitionType !== "none" && settings.transitionSpeed === 0)
    || !["disabled", "return-to-start"].includes(settings.idleMode)
    || !Number.isInteger(settings.idleTimeout)
    || settings.idleTimeout < 1
    || !Number.isFinite(settings.brightness)
    || settings.brightness < 0
    || settings.brightness > 100
    || !["landscape", "portrait"].includes(settings.orientation)
  ) {
    return "invalid Profile settings";
  }
  const missingAsset = preview.skippedPages.find(
    (page) => page.enabled && page.skipReason === "asset-unhealthy"
  );
  if (missingAsset) {
    return `invalid Profile asset reference: ${missingAsset.pageKey}`;
  }
  return null;
}

export function stageProfileRollout(input: {
  appliedVersion: number | null;
  currentRuntime: PlaybackRuntime;
  desired: PlaybackProfileVersion;
  nextPages: PlaybackPage[];
  previousPages: PlaybackPage[];
  preview: DisplayRotationPreview;
  receivedAtMs: number;
}): StagedProfileRollout {
  const validationError = validateProfileRolloutCandidate(
    input.desired,
    input.preview
  );
  if (validationError) {
    return {
      candidate: null,
      currentRuntime: null,
      nextPages: [],
      plan: null,
      status: {
        appliedVersion: input.appliedVersion,
        desiredVersion: input.desired.id,
        lastError: validationError.slice(0, 160),
        updatedAt: null,
        updateState: "failed"
      }
    };
  }
  return {
    candidate: input.desired,
    currentRuntime: input.currentRuntime,
    nextPages: input.nextPages,
    plan: createSafePlaybackBoundaryPlan({
      current: input.currentRuntime,
      nextPages: input.nextPages,
      previousPages: input.previousPages,
      receivedAtMs: input.receivedAtMs
    }),
    status: {
      appliedVersion: input.appliedVersion,
      desiredVersion: input.desired.id,
      lastError: null,
      updatedAt: null,
      updateState: "waiting"
    }
  };
}

export function applyStagedProfileRollout(
  staged: StagedProfileRollout,
  nowMs: number,
  options: {
    currentRuntime?: PlaybackRuntime;
    scheduleAllowed?: boolean;
  } = {}
) {
  if (!staged.candidate || !staged.currentRuntime || !staged.plan) {
    return null;
  }
  const runtime = resolveSafePlaybackBoundaryRuntime({
    current: options.currentRuntime ?? staged.currentRuntime,
    nextPages: staged.nextPages,
    nowMs,
    plan: staged.plan,
    scheduleAllowed: options.scheduleAllowed,
    settings: staged.candidate.snapshot.settings
  });
  if (!runtime) {
    return null;
  }
  return {
    runtime,
    status: {
      appliedVersion: staged.candidate.id,
      desiredVersion: staged.candidate.id,
      lastError: null,
      updatedAt: null,
      updateState: "applied" as const
    }
  };
}
