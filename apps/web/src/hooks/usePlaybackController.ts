import {
  createSafePlaybackBoundaryPlan,
  createPlaybackRuntime,
  resolveSafePlaybackBoundaryRuntime,
  SERVER_TIME_ZONE,
  type AppTimeSnapshot,
  type DisplayClientContext,
  type DisplayPageTemplateKey,
  type DisplayPlaybackRuntimeResponse,
  type DisplayRotationPreview,
  type DeviceProfileRolloutStatus,
  getEnabledPlaybackPages,
  getNextPlaybackIndex,
  getPlaybackDurationMs,
  getPlaybackPage,
  isDisplayPageTemplateKey,
  isPlaybackAllowedByScheduleAtEpoch,
  isPlaybackAtEdge,
  resolveDisplayPageTemplateKeyFromPageId,
  shouldEnterIdleMode,
  type PlaybackPage,
  type PlaybackRuntime,
  type SafePlaybackBoundaryPlan,
  type PlaybackSettings
} from "@solar-display/shared";
import { startTransition, useEffect, useRef, useState } from "react";
import { ApiRequestError, getPlaybackRuntime } from "../services/api";
import { getAppTimeSnapshot } from "../services/appTime";
import { prefetchDisplayPageTemplate } from "../pages/shared/displayPageTemplateLoaders";
import { resolveRouteRuntimeSync } from "./playbackRouteSync";
import { reconcilePlaybackRuntimeAfterRefresh } from "./playbackRuntimeRefresh";
import type { PlaybackRuntimeReloadOptions } from "./displaySyncPlaybackReload";
import {
  applyStagedProfileRollout,
  stageProfileRollout,
  type StagedProfileRollout,
  validateProfileRolloutCandidate
} from "../services/profileRollout";

export function resolvePlaybackPageTemplateKey(page: PlaybackPage | null): DisplayPageTemplateKey | null {
  if (!page) {
    return null;
  }

  if (page.templateKey && isDisplayPageTemplateKey(page.templateKey)) {
    return page.templateKey;
  }

  return resolveDisplayPageTemplateKeyFromPageId(page.pageKey);
}

export function resolveNextEffectivePlaybackTemplateKey({
  currentIndex,
  loop,
  pages
}: {
  currentIndex: number;
  loop: boolean;
  pages: PlaybackPage[];
}): DisplayPageTemplateKey | null {
  const playablePages = getEnabledPlaybackPages(pages);

  if (playablePages.length === 0) {
    return null;
  }

  const nextIndex = getNextPlaybackIndex(currentIndex, pages, loop, 1);
  return resolvePlaybackPageTemplateKey(playablePages[nextIndex] ?? null);
}

type UsePlaybackControllerOptions = {
  currentPath?: string;
  enabled?: boolean;
  rotationPreview?: DisplayRotationPreview | null;
  settings?: PlaybackSettings | null;
  tickMs?: number;
  tickMode?: PlaybackRuntimeTickMode;
  monotonicNow?: () => number;
  readAppTimeSnapshot?: () => AppTimeSnapshot;
};

export type PlaybackRuntimeTickMode = "countdown" | "boundary";
const DISPLAY_RUNTIME_REFRESH_MS = 5_000;
const DISPLAY_RUNTIME_REFRESH_JITTER_MS = 2_000;

export function resolveDisplayRuntimeRefreshDelay(randomValue: number) {
  const boundedRandom = Math.min(1, Math.max(0, randomValue));
  return DISPLAY_RUNTIME_REFRESH_MS
    + Math.round(boundedRandom * DISPLAY_RUNTIME_REFRESH_JITTER_MS);
}

type PlaybackControllerState = {
  appliedVersion: number | null;
  countdown: number;
  currentPage: PlaybackPage | null;
  displayClientContext: DisplayClientContext | null;
  desiredVersion: number | null;
  effectiveRotationRevision: string | null;
  errorMessage: string;
  fallbackRoute: string | null;
  isIdle: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  profileRolloutHydrated: boolean;
  pages: PlaybackPage[];
  progress: number;
  profileUpdateError: string | null;
  profileUpdateState: DeviceProfileRolloutStatus["updateState"];
  reload: (options?: PlaybackRuntimeReloadOptions) => Promise<void>;
  rotationPreview: DisplayRotationPreview | null;
  settings: PlaybackSettings | null;
  nextPage: () => void;
  prevPage: () => void;
  togglePlay: () => void;
};

type PendingRuntimeUpdate = {
  identity: string;
  plan: SafePlaybackBoundaryPlan;
  response: DisplayPlaybackRuntimeResponse;
  stagedProfileRollout: StagedProfileRollout | null;
};

type FormalPlaybackAccessState = {
  appliedRuntimeIdentity: string | null;
  displayClientContext: DisplayClientContext | null;
  effectiveRotationRevision: string | null;
  fallbackRoute: string | null;
  pages: PlaybackPage[];
  pendingRuntimeUpdate: PendingRuntimeUpdate | null;
  rotationPreview: DisplayRotationPreview | null;
  runtime: PlaybackRuntime | null;
  settings: PlaybackSettings | null;
};

type PlaybackScheduleGate = {
  activeAllowed: boolean;
  pendingAllowed: boolean | null;
};

export function isAbsoluteTimeFrozen(snapshot: AppTimeSnapshot) {
  return snapshot.state === "waiting" || snapshot.state === "time-untrusted";
}

export function resolvePlaybackScheduleGate({
  atSafeBoundary,
  current,
  settings,
  snapshot
}: {
  atSafeBoundary: boolean;
  current: PlaybackScheduleGate;
  settings: PlaybackSettings;
  snapshot: AppTimeSnapshot;
}): PlaybackScheduleGate {
  if (isAbsoluteTimeFrozen(snapshot) || snapshot.nowEpochMs === null) {
    return current;
  }

  const candidate = isPlaybackAllowedByScheduleAtEpoch(
    settings,
    snapshot.nowEpochMs,
    SERVER_TIME_ZONE
  );
  if (candidate === current.activeAllowed) {
    return {
      activeAllowed: current.activeAllowed,
      pendingAllowed: null
    };
  }

  if (candidate || atSafeBoundary) {
    return {
      activeAllowed: candidate,
      pendingAllowed: null
    };
  }

  return {
    activeAllowed: current.activeAllowed,
    pendingAllowed: candidate
  };
}

export function createInitialPlaybackScheduleGate(
  settings: PlaybackSettings,
  snapshot: AppTimeSnapshot
): PlaybackScheduleGate {
  if (isAbsoluteTimeFrozen(snapshot) || snapshot.nowEpochMs === null) {
    return {
      activeAllowed: true,
      pendingAllowed: null
    };
  }

  return {
    activeAllowed: isPlaybackAllowedByScheduleAtEpoch(
      settings,
      snapshot.nowEpochMs,
      SERVER_TIME_ZONE
    ),
    pendingAllowed: null
  };
}

export function resolvePendingRuntimeAtTrustedBoundary<T>(
  snapshot: AppTimeSnapshot,
  resolveBoundary: () => T
): T | null {
  return isAbsoluteTimeFrozen(snapshot) ? null : resolveBoundary();
}

export function shouldMarkSchedulePaused(
  current: PlaybackRuntime,
  next: PlaybackRuntime,
  scheduleAllowed: boolean
) {
  return !scheduleAllowed && current.isPlaying && !next.isPlaying;
}

export function preparePendingScheduleBoundaryCurrent(
  current: PlaybackRuntime,
  input: {
    autoplay: boolean;
    scheduleAllowed: boolean;
    schedulePaused: boolean;
  }
) {
  return input.autoplay && input.scheduleAllowed && input.schedulePaused
    ? {
        ...current,
        isPlaying: true
      }
    : current;
}

export function resolvePendingSchedulePausedMarker(
  current: PlaybackRuntime,
  next: PlaybackRuntime,
  input: {
    scheduleAllowed: boolean;
    schedulePaused: boolean;
  }
) {
  if (input.scheduleAllowed) {
    return false;
  }

  return (
    input.schedulePaused
    || shouldMarkSchedulePaused(current, next, input.scheduleAllowed)
  );
}

export function isDisplayContextAccessError(error: unknown) {
  return (
    error instanceof ApiRequestError &&
    (error.statusCode === 401 || error.statusCode === 403)
  );
}

export function isLatestPlaybackLoadRequest(
  requestId: number,
  latestRequestId: number
) {
  return requestId === latestRequestId;
}

export function failClosedFormalPlaybackAccess(
  _current: FormalPlaybackAccessState
): FormalPlaybackAccessState {
  return {
    appliedRuntimeIdentity: null,
    displayClientContext: null,
    effectiveRotationRevision: null,
    fallbackRoute: null,
    pages: [],
    pendingRuntimeUpdate: null,
    rotationPreview: null,
    runtime: null,
    settings: null
  };
}

export function resolvePlaybackRuntimeTick({
  current,
  elapsedMs,
  nowMs,
  pages,
  resumeAutoplay = false,
  scheduleAllowed,
  settings,
  tickMode,
  tickMs
}: {
  current: PlaybackRuntime;
  elapsedMs: number;
  nowMs: number;
  pages: PlaybackPage[];
  resumeAutoplay?: boolean;
  scheduleAllowed?: boolean;
  settings: PlaybackSettings;
  tickMode: PlaybackRuntimeTickMode;
  tickMs: number;
}): PlaybackRuntime {
  if (!current.isIdle && shouldEnterIdleMode(settings, current.lastInteractionAt, nowMs)) {
    return createPlaybackRuntime(settings, pages, {
      currentPageId: settings.startPage,
      isIdle: true,
      isPlaying: false,
      lastInteractionAt: nowMs,
      nowMs,
      scheduleAllowed
    });
  }

  if (!current.isPlaying) {
    return resumeAutoplay && settings.autoplay
      ? {
          ...current,
          isPlaying: true
        }
      : current;
  }

  const elapsedCountdownMs = tickMode === "boundary" ? elapsedMs : tickMs;
  const nextCountdownMs = current.countdownMs - elapsedCountdownMs;
  if (scheduleAllowed === false && nextCountdownMs > 0) {
    return current;
  }
  if (nextCountdownMs > 0) {
    return tickMode === "boundary"
      ? current
      : {
          ...current,
          countdownMs: nextCountdownMs
        };
  }

  const atEdge = isPlaybackAtEdge(current, pages, 1);
  const nextIndex = getNextPlaybackIndex(current.currentIndex, pages, settings.loop, 1);
  const nextPage = getEnabledPlaybackPages(pages)[nextIndex] ?? null;

  return {
    ...current,
    countdownMs: getPlaybackDurationMs(nextPage),
    currentIndex: nextIndex,
    isPlaying:
      scheduleAllowed === false || (atEdge && !settings.loop)
        ? false
        : current.isPlaying
  };
}

export function usePlaybackController(
  options: UsePlaybackControllerOptions = {}
): PlaybackControllerState {
  const enabled = options.enabled ?? true;
  const [settings, setSettings] = useState<PlaybackSettings | null>(() => options.settings ?? null);
  const [pages, setPages] = useState<PlaybackPage[]>(() => options.rotationPreview?.playablePages ?? []);
  const [runtime, setRuntime] = useState<PlaybackRuntime | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [errorMessage, setErrorMessage] = useState("");
  const [displayClientContext, setDisplayClientContext] =
    useState<DisplayClientContext | null>(null);
  const [effectiveRotationRevision, setEffectiveRotationRevision] =
    useState<string | null>(null);
  const [fallbackRoute, setFallbackRoute] = useState<string | null>(null);
  const [profileRolloutStatus, setProfileRolloutStatus] =
    useState<DeviceProfileRolloutStatus>({
      appliedVersion: null,
      desiredVersion: null,
      lastError: null,
      updatedAt: null,
      updateState: "waiting"
    });
  const [profileRolloutHydrated, setProfileRolloutHydrated] = useState(false);
  const [rotationPreview, setRotationPreview] = useState<DisplayRotationPreview | null>(() => options.rotationPreview ?? null);
  const providedSettingsRef = useRef<PlaybackSettings | null>(options.settings ?? null);
  const providedRotationPreviewRef = useRef<DisplayRotationPreview | null>(options.rotationPreview ?? null);
  const settingsRef = useRef<PlaybackSettings | null>(null);
  const pagesRef = useRef<PlaybackPage[]>([]);
  const runtimeRef = useRef<PlaybackRuntime | null>(null);
  const lastSyncedPathRef = useRef<string | undefined>(undefined);
  const runtimeTickSignatureRef = useRef<string | null>(null);
  const monotonicNowRef = useRef(
    options.monotonicNow ?? (() => performance.now())
  );
  const readAppTimeSnapshotRef = useRef(
    options.readAppTimeSnapshot ?? getAppTimeSnapshot
  );
  const runtimeTickStartedAtRef = useRef(monotonicNowRef.current());
  const playbackScheduleGateRef = useRef<PlaybackScheduleGate>({
    activeAllowed: true,
    pendingAllowed: null
  });
  const schedulePausedPlaybackRef = useRef(false);
  const appliedRuntimeIdentityRef = useRef<string | null>(null);
  const pendingRuntimeUpdateRef = useRef<PendingRuntimeUpdate | null>(null);
  const latestLoadRequestRef = useRef(0);
  const tickMs = options.tickMs ?? 250;
  const tickMode = options.tickMode ?? "countdown";

  useEffect(() => {
    providedSettingsRef.current = options.settings ?? null;
  }, [options.settings]);

  useEffect(() => {
    providedRotationPreviewRef.current = options.rotationPreview ?? null;
  }, [options.rotationPreview]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  useEffect(() => {
    runtimeRef.current = runtime;

    const nextSignature = runtime
      ? [
          runtime.currentIndex,
          runtime.countdownMs,
          runtime.isIdle ? "idle" : "active",
          runtime.isPlaying ? "playing" : "paused"
        ].join(":")
      : null;

    if (runtimeTickSignatureRef.current !== nextSignature) {
      runtimeTickSignatureRef.current = nextSignature;
      runtimeTickStartedAtRef.current = monotonicNowRef.current();
    }
  }, [runtime]);

  const currentPage = runtime ? getPlaybackPage(runtime, pages) : null;
  const playablePages = getEnabledPlaybackPages(pages);
  const currentDurationMs = getPlaybackDurationMs(currentPage);
  const countdown = runtime ? Math.max(0, Math.ceil(runtime.countdownMs / 1000)) : 0;
  const progress =
    runtime && currentDurationMs > 0
      ? Math.min(100, Math.max(0, ((currentDurationMs - runtime.countdownMs) / currentDurationMs) * 100))
      : 0;

  const loadPlayback = async (reloadOptions?: PlaybackRuntimeReloadOptions) => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const requestId = ++latestLoadRequestRef.current;
    setIsLoading(true);

    try {
      const providedSettings = providedSettingsRef.current;
      const providedRotationPreview = providedRotationPreviewRef.current;
      const providedManagementPreview =
        providedSettings !== null && providedRotationPreview !== null;
      const runtimeResponse = providedManagementPreview
        ? null
        : await getPlaybackRuntime();
      if (!isLatestPlaybackLoadRequest(requestId, latestLoadRequestRef.current)) {
        return;
      }
      const rolloutValidationError =
        runtimeResponse?.profileRollout.desired
          ? validateProfileRolloutCandidate(
              runtimeResponse.profileRollout.desired,
              runtimeResponse.preview
            )
          : null;
      if (runtimeResponse && rolloutValidationError) {
        pendingRuntimeUpdateRef.current = null;
        setProfileRolloutHydrated(true);
        setProfileRolloutStatus({
          appliedVersion: runtimeResponse.profileRollout.appliedVersion,
          desiredVersion: runtimeResponse.profileRollout.desiredVersion,
          lastError: rolloutValidationError.slice(0, 160),
          updatedAt: runtimeResponse.profileRollout.updatedAt,
          updateState: "failed"
        });
        setErrorMessage(rolloutValidationError);
        return;
      }
      const [nextSettings, rotationPreview] = providedManagementPreview
        ? await Promise.all([
            Promise.resolve(providedSettings),
            Promise.resolve(providedRotationPreview)
          ])
        : [runtimeResponse!.settings, runtimeResponse!.preview];
      const runtimePages = rotationPreview.playablePages;
      const nowMs = monotonicNowRef.current();
      const currentRuntime =
        tickMode === "boundary" && runtimeRef.current?.isPlaying
          ? {
              ...runtimeRef.current,
              countdownMs: Math.max(
                0,
                runtimeRef.current.countdownMs -
                  (nowMs - runtimeTickStartedAtRef.current)
              )
            }
          : runtimeRef.current;
      if (!currentRuntime) {
        playbackScheduleGateRef.current =
          createInitialPlaybackScheduleGate(
            nextSettings,
            readAppTimeSnapshotRef.current()
          );
      }
      const nextRuntime = reconcilePlaybackRuntimeAfterRefresh({
        currentPath: options.currentPath,
        currentRuntime,
        nextPages: runtimePages,
        nowMs,
        previousPages: pagesRef.current,
        resumeAutoplay: reloadOptions?.resumeAutoplay,
        scheduleAllowed: playbackScheduleGateRef.current.activeAllowed,
        settings: nextSettings
      });

      if (runtimeResponse && currentRuntime) {
        const identity = [
          runtimeResponse.context.contextRevision,
          runtimeResponse.effectiveRotationRevision
        ].join(":");
        if (identity !== appliedRuntimeIdentityRef.current) {
          if (pendingRuntimeUpdateRef.current?.identity !== identity) {
            const stagedProfileRollout =
              runtimeResponse.profileRollout.desired
                ? stageProfileRollout({
                    appliedVersion:
                      runtimeResponse.profileRollout.appliedVersion,
                    currentRuntime,
                    desired: runtimeResponse.profileRollout.desired,
                    nextPages: runtimePages,
                    previousPages: pagesRef.current,
                    preview: rotationPreview,
                    receivedAtMs: nowMs
                  })
                : null;
            pendingRuntimeUpdateRef.current = {
              identity,
              plan:
                stagedProfileRollout?.plan
                ?? createSafePlaybackBoundaryPlan({
                  current: currentRuntime,
                  nextPages: runtimePages,
                  previousPages: pagesRef.current,
                  receivedAtMs: nowMs
                }),
              response: runtimeResponse,
              stagedProfileRollout
            };
            setProfileRolloutStatus(
              stagedProfileRollout?.status
              ?? {
                appliedVersion: runtimeResponse.profileRollout.appliedVersion,
                desiredVersion: runtimeResponse.profileRollout.desiredVersion,
                lastError: null,
                updatedAt: runtimeResponse.profileRollout.updatedAt,
                updateState: "waiting"
              }
            );
          }
        } else {
          pendingRuntimeUpdateRef.current = null;
        }
        setProfileRolloutHydrated(true);
        setErrorMessage("");
        return;
      }

      pendingRuntimeUpdateRef.current = null;
      if (runtimeResponse) {
        setProfileRolloutHydrated(true);
        appliedRuntimeIdentityRef.current = [
          runtimeResponse.context.contextRevision,
          runtimeResponse.effectiveRotationRevision
        ].join(":");
        setProfileRolloutStatus({
          appliedVersion:
            runtimeResponse.profileRollout.desiredVersion
            ?? runtimeResponse.profileRollout.appliedVersion,
          desiredVersion: runtimeResponse.profileRollout.desiredVersion,
          lastError: null,
          updatedAt: runtimeResponse.profileRollout.updatedAt,
          updateState:
            runtimeResponse.profileRollout.desiredVersion === null
              ? runtimeResponse.profileRollout.updateState
              : "applied"
        });
      }
      settingsRef.current = nextSettings;
      pagesRef.current = runtimePages;
      runtimeRef.current = nextRuntime;
      schedulePausedPlaybackRef.current =
        !playbackScheduleGateRef.current.activeAllowed
        && nextSettings.autoplay;
      startTransition(() => {
        setSettings(nextSettings);
        setPages(runtimePages);
        setFallbackRoute(rotationPreview.fallbackRoute);
        setRotationPreview(rotationPreview);
        setRuntime(nextRuntime);
        setDisplayClientContext(runtimeResponse?.context ?? null);
        setEffectiveRotationRevision(
          runtimeResponse?.effectiveRotationRevision ?? null
        );
        setErrorMessage("");
      });
    } catch (error) {
      if (!isLatestPlaybackLoadRequest(requestId, latestLoadRequestRef.current)) {
        return;
      }
      if (isDisplayContextAccessError(error)) {
        setProfileRolloutHydrated(false);
        const failedClosed = failClosedFormalPlaybackAccess({
          appliedRuntimeIdentity: appliedRuntimeIdentityRef.current,
          displayClientContext,
          effectiveRotationRevision,
          fallbackRoute,
          pages: pagesRef.current,
          pendingRuntimeUpdate: pendingRuntimeUpdateRef.current,
          rotationPreview,
          runtime: runtimeRef.current,
          settings: settingsRef.current
        });
        pendingRuntimeUpdateRef.current = failedClosed.pendingRuntimeUpdate;
        appliedRuntimeIdentityRef.current = failedClosed.appliedRuntimeIdentity;
        settingsRef.current = failedClosed.settings;
        pagesRef.current = failedClosed.pages;
        runtimeRef.current = failedClosed.runtime;
        setSettings(failedClosed.settings);
        setPages(failedClosed.pages);
        setRuntime(failedClosed.runtime);
        setDisplayClientContext(failedClosed.displayClientContext);
        setEffectiveRotationRevision(failedClosed.effectiveRotationRevision);
        setFallbackRoute(failedClosed.fallbackRoute);
      }
      setRotationPreview(null);
      setErrorMessage(error instanceof Error ? error.message : "載入播放設定失敗。");
    } finally {
      if (isLatestPlaybackLoadRequest(requestId, latestLoadRequestRef.current)) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!enabled) {
      latestLoadRequestRef.current += 1;
      setIsLoading(false);
      return;
    }

    void loadPlayback();
    return () => {
      latestLoadRequestRef.current += 1;
    };
  }, [enabled, options.rotationPreview, options.settings]);

  useEffect(() => {
    if (
      !enabled ||
      options.settings !== undefined ||
      options.rotationPreview !== undefined
    ) {
      return;
    }

    let cancelled = false;
    let timerId: number | null = null;
    const schedule = () => {
      timerId = window.setTimeout(async () => {
        await loadPlayback();
        if (!cancelled) {
          schedule();
        }
      }, resolveDisplayRuntimeRefreshDelay(Math.random()));
    };
    schedule();

    return () => {
      cancelled = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [enabled, options.rotationPreview, options.settings]);

  useEffect(() => {
    const nextRuntime = resolveRouteRuntimeSync({
      currentPath: options.currentPath,
      lastSyncedPath: lastSyncedPathRef.current,
      nowMs: monotonicNowRef.current(),
      pages,
      runtime: runtimeRef.current
    });

    lastSyncedPathRef.current = options.currentPath;

    if (!nextRuntime) {
      return;
    }

    setRuntime(nextRuntime);
  }, [options.currentPath, pages]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      const nextSettings = settingsRef.current;
      const currentRuntime = runtimeRef.current;

      if (!nextSettings || !currentRuntime) {
        return;
      }

      const nowMs = monotonicNowRef.current();
      const snapshot = readAppTimeSnapshotRef.current();
      const elapsedMs = nowMs - runtimeTickStartedAtRef.current;
      const previousScheduleGate = playbackScheduleGateRef.current;
      playbackScheduleGateRef.current = resolvePlaybackScheduleGate({
        atSafeBoundary:
          tickMode === "boundary"
            ? elapsedMs >= currentRuntime.countdownMs
            : currentRuntime.countdownMs <= tickMs,
        current: previousScheduleGate,
        settings: nextSettings,
        snapshot
      });
      const pendingUpdate = pendingRuntimeUpdateRef.current;
      if (pendingUpdate) {
        const pendingScheduleGate = createInitialPlaybackScheduleGate(
          pendingUpdate.response.settings,
          snapshot
        );
        const pendingBoundaryCurrent =
          preparePendingScheduleBoundaryCurrent(currentRuntime, {
            autoplay: pendingUpdate.response.settings.autoplay,
            scheduleAllowed: pendingScheduleGate.activeAllowed,
            schedulePaused: schedulePausedPlaybackRef.current
          });
        const boundaryRuntime = resolvePendingRuntimeAtTrustedBoundary(
          snapshot,
          () => (
            pendingUpdate.stagedProfileRollout
              ? applyStagedProfileRollout(
                  pendingUpdate.stagedProfileRollout,
                  nowMs,
                  {
                    currentRuntime: pendingBoundaryCurrent,
                    scheduleAllowed: pendingScheduleGate.activeAllowed
                  }
                )?.runtime ?? null
              : resolveSafePlaybackBoundaryRuntime({
                  current: pendingBoundaryCurrent,
                  nextPages: pendingUpdate.response.preview.playablePages,
                  nowMs,
                  plan: pendingUpdate.plan,
                  scheduleAllowed: pendingScheduleGate.activeAllowed,
                  settings: pendingUpdate.response.settings
                })
          )
        );

        if (boundaryRuntime) {
          const nextPages = pendingUpdate.response.preview.playablePages;
          const nextSettings = pendingUpdate.response.settings;
          pendingRuntimeUpdateRef.current = null;
          appliedRuntimeIdentityRef.current = pendingUpdate.identity;
          setProfileRolloutStatus({
            appliedVersion:
              pendingUpdate.response.profileRollout.desiredVersion,
            desiredVersion:
              pendingUpdate.response.profileRollout.desiredVersion,
            lastError: null,
            updatedAt: pendingUpdate.response.profileRollout.updatedAt,
            updateState: "applied"
          });
          playbackScheduleGateRef.current = pendingScheduleGate;
          schedulePausedPlaybackRef.current =
            resolvePendingSchedulePausedMarker(
            currentRuntime,
            boundaryRuntime,
            {
              scheduleAllowed: pendingScheduleGate.activeAllowed,
              schedulePaused: schedulePausedPlaybackRef.current
            }
          );
          settingsRef.current = nextSettings;
          pagesRef.current = nextPages;
          runtimeRef.current = boundaryRuntime;
          startTransition(() => {
            setSettings(nextSettings);
            setPages(nextPages);
            setFallbackRoute(pendingUpdate.response.preview.fallbackRoute);
            setRotationPreview(pendingUpdate.response.preview);
            setRuntime(boundaryRuntime);
            setDisplayClientContext(pendingUpdate.response.context);
            setEffectiveRotationRevision(
              pendingUpdate.response.effectiveRotationRevision
            );
          });
          return;
        }
      }

      const shouldResumeSchedulePausedPlayback =
        schedulePausedPlaybackRef.current
        && (
          isAbsoluteTimeFrozen(snapshot)
          || (
            !previousScheduleGate.activeAllowed
            && playbackScheduleGateRef.current.activeAllowed
          )
        );
      const effectiveScheduleAllowed = isAbsoluteTimeFrozen(snapshot)
        ? true
        : playbackScheduleGateRef.current.activeAllowed;
      const nextRuntime = resolvePlaybackRuntimeTick({
        current: currentRuntime,
        elapsedMs,
        nowMs,
        pages: pagesRef.current,
        resumeAutoplay: shouldResumeSchedulePausedPlayback,
        scheduleAllowed: effectiveScheduleAllowed,
        settings: nextSettings,
        tickMode,
        tickMs
      });

      if (
        shouldMarkSchedulePaused(
          currentRuntime,
          nextRuntime,
          effectiveScheduleAllowed
        )
      ) {
        schedulePausedPlaybackRef.current = true;
      } else if (
        shouldResumeSchedulePausedPlayback
        && nextRuntime.isPlaying
      ) {
        schedulePausedPlaybackRef.current = false;
      }

      if (nextRuntime !== currentRuntime) {
        setRuntime(nextRuntime);
      }
    }, tickMs);

    return () => {
      window.clearInterval(timerId);
    };
  }, [pages, tickMode, tickMs]);

  useEffect(() => {
    if (!enabled || !runtime || !settings) {
      return;
    }

    if (!playbackScheduleGateRef.current.activeAllowed) {
      return;
    }

    const nextTemplateKey = resolveNextEffectivePlaybackTemplateKey({
      currentIndex: runtime.currentIndex,
      loop: settings.loop,
      pages
    });

    if (!nextTemplateKey) {
      return;
    }

    void prefetchDisplayPageTemplate(nextTemplateKey);
  }, [enabled, pages, runtime?.currentIndex, settings?.loop]);

  useEffect(() => {
    const handleInteraction = () => {
      const nextSettings = settingsRef.current;

      if (!nextSettings) {
        return;
      }

      const nowMs = monotonicNowRef.current();

      setRuntime((current) => {
        if (!current) {
          return current;
        }

        if (!current.isIdle) {
          return {
            ...current,
            lastInteractionAt: nowMs
          };
        }

        return createPlaybackRuntime(nextSettings, pagesRef.current, {
          currentPageId: nextSettings.startPage,
          isIdle: false,
          isPlaying: nextSettings.autoplay,
          lastInteractionAt: nowMs,
          nowMs,
          scheduleAllowed: playbackScheduleGateRef.current.activeAllowed
        });
      });
    };

    window.addEventListener("pointerdown", handleInteraction);
    window.addEventListener("keydown", handleInteraction);
    window.addEventListener("touchstart", handleInteraction);

    return () => {
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
    };
  }, []);

  const nextPage = () => {
    const nextSettings = settingsRef.current;

    if (!nextSettings) {
      return;
    }

    setRuntime((current) => {
      if (!current) {
        return current;
      }

      const currentPages = pagesRef.current;
      const nextIndex = getNextPlaybackIndex(current.currentIndex, currentPages, nextSettings.loop, 1);
      const nextPlaybackPage = getEnabledPlaybackPages(currentPages)[nextIndex] ?? null;
      const atEdge = isPlaybackAtEdge(current, currentPages, 1);

      return {
        ...current,
        countdownMs: getPlaybackDurationMs(nextPlaybackPage),
        currentIndex: nextIndex,
        isIdle: false,
        isPlaying: atEdge && !nextSettings.loop ? false : current.isPlaying,
        lastInteractionAt: monotonicNowRef.current()
      };
    });
  };

  const prevPage = () => {
    setRuntime((current) => {
      if (!current) {
        return current;
      }

      const currentPages = pagesRef.current;
      const nextIndex = getNextPlaybackIndex(
        current.currentIndex,
        currentPages,
        settingsRef.current?.loop ?? true,
        -1
      );
      const nextPlaybackPage = getEnabledPlaybackPages(currentPages)[nextIndex] ?? null;

      return {
        ...current,
        countdownMs: getPlaybackDurationMs(nextPlaybackPage),
        currentIndex: nextIndex,
        isIdle: false,
        lastInteractionAt: monotonicNowRef.current()
      };
    });
  };

  const togglePlay = () => {
    const nextSettings = settingsRef.current;

    if (!nextSettings) {
      return;
    }

    setRuntime((current) => {
      if (!current) {
        return current;
      }

      const nowMs = monotonicNowRef.current();
      const canPlay =
        playbackScheduleGateRef.current.activeAllowed && playablePages.length > 0;

      if (current.isIdle) {
        return createPlaybackRuntime(nextSettings, pagesRef.current, {
          currentPageId: nextSettings.startPage,
          isIdle: false,
          isPlaying: canPlay,
          lastInteractionAt: nowMs,
          nowMs,
          scheduleAllowed: playbackScheduleGateRef.current.activeAllowed
        });
      }

      return {
        ...current,
        isIdle: false,
        isPlaying: current.isPlaying ? false : canPlay,
        lastInteractionAt: nowMs
      };
    });
  };

  return {
    appliedVersion: profileRolloutStatus.appliedVersion,
    countdown,
    currentPage,
    displayClientContext,
    desiredVersion: profileRolloutStatus.desiredVersion,
    effectiveRotationRevision,
    errorMessage,
    fallbackRoute,
    isIdle: runtime?.isIdle ?? false,
    isLoading,
    isPlaying: runtime?.isPlaying ?? false,
    profileRolloutHydrated,
    nextPage,
    pages,
    prevPage,
    progress,
    profileUpdateError: profileRolloutStatus.lastError,
    profileUpdateState: profileRolloutStatus.updateState,
    reload: loadPlayback,
    rotationPreview,
    settings,
    togglePlay
  };
}
