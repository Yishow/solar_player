import {
  createPlaybackRuntime,
  type DisplayRotationPreview,
  getEnabledPlaybackPages,
  getNextPlaybackIndex,
  getPlaybackDurationMs,
  getPlaybackPage,
  isPlaybackAllowedBySchedule,
  isPlaybackAtEdge,
  resolvePlaybackIndexByRoute,
  shouldEnterIdleMode,
  type PlaybackPage,
  type PlaybackRuntime,
  type PlaybackSettings
} from "@solar-display/shared";
import { startTransition, useEffect, useRef, useState } from "react";
import { getDisplayRotationPreview, getPlaybackSettings } from "../services/api";
import { resolveRouteRuntimeSync } from "./playbackRouteSync";
import { reconcilePlaybackRuntimeAfterRefresh } from "./playbackRuntimeRefresh";
import type { PlaybackRuntimeReloadOptions } from "./displaySyncPlaybackReload";

type UsePlaybackControllerOptions = {
  currentPath?: string;
  enabled?: boolean;
  rotationPreview?: DisplayRotationPreview | null;
  settings?: PlaybackSettings | null;
  tickMs?: number;
};

type PlaybackControllerState = {
  countdown: number;
  currentPage: PlaybackPage | null;
  errorMessage: string;
  fallbackRoute: string | null;
  isIdle: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  pages: PlaybackPage[];
  progress: number;
  reload: (options?: PlaybackRuntimeReloadOptions) => Promise<void>;
  rotationPreview: DisplayRotationPreview | null;
  settings: PlaybackSettings | null;
  nextPage: () => void;
  prevPage: () => void;
  togglePlay: () => void;
};

export function usePlaybackController(
  options: UsePlaybackControllerOptions = {}
): PlaybackControllerState {
  const enabled = options.enabled ?? true;
  const [settings, setSettings] = useState<PlaybackSettings | null>(() => options.settings ?? null);
  const [pages, setPages] = useState<PlaybackPage[]>(() => options.rotationPreview?.playablePages ?? []);
  const [runtime, setRuntime] = useState<PlaybackRuntime | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [errorMessage, setErrorMessage] = useState("");
  const [fallbackRoute, setFallbackRoute] = useState<string | null>(null);
  const [rotationPreview, setRotationPreview] = useState<DisplayRotationPreview | null>(() => options.rotationPreview ?? null);
  const providedSettingsRef = useRef<PlaybackSettings | null>(options.settings ?? null);
  const providedRotationPreviewRef = useRef<DisplayRotationPreview | null>(options.rotationPreview ?? null);
  const settingsRef = useRef<PlaybackSettings | null>(null);
  const pagesRef = useRef<PlaybackPage[]>([]);
  const runtimeRef = useRef<PlaybackRuntime | null>(null);
  const lastSyncedPathRef = useRef<string | undefined>(undefined);
  const tickMs = options.tickMs ?? 250;

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

    setIsLoading(true);

    try {
      const providedSettings = providedSettingsRef.current;
      const providedRotationPreview = providedRotationPreviewRef.current;
      const [nextSettings, rotationPreview] = await Promise.all([
        providedSettings ? Promise.resolve(providedSettings) : getPlaybackSettings(),
        providedRotationPreview ? Promise.resolve(providedRotationPreview) : getDisplayRotationPreview()
      ]);
      const runtimePages = rotationPreview.playablePages;
      const nowMs = Date.now();
      const nextRuntime = reconcilePlaybackRuntimeAfterRefresh({
        currentPath: options.currentPath,
        currentRuntime: runtimeRef.current,
        nextPages: runtimePages,
        nowMs,
        previousPages: pagesRef.current,
        resumeAutoplay: reloadOptions?.resumeAutoplay,
        settings: nextSettings
      });

      startTransition(() => {
        setSettings(nextSettings);
        setPages(runtimePages);
        setFallbackRoute(rotationPreview.fallbackRoute);
        setRotationPreview(rotationPreview);
        setRuntime(nextRuntime);
        setErrorMessage("");
      });
    } catch (error) {
      setRotationPreview(null);
      setErrorMessage(error instanceof Error ? error.message : "載入播放設定失敗。");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    void loadPlayback();
  }, [enabled, options.rotationPreview, options.settings]);

  useEffect(() => {
    const nextRuntime = resolveRouteRuntimeSync({
      currentPath: options.currentPath,
      lastSyncedPath: lastSyncedPathRef.current,
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

      setRuntime((current) => {
        if (!current) {
          return current;
        }

        const currentPages = pagesRef.current;
        const nowMs = Date.now();

        if (shouldEnterIdleMode(nextSettings, current.lastInteractionAt, nowMs)) {
          return createPlaybackRuntime(nextSettings, currentPages, {
            currentPageId: nextSettings.startPage,
            isIdle: true,
            isPlaying: false,
            lastInteractionAt: nowMs,
            nowMs
          });
        }

        if (!isPlaybackAllowedBySchedule(nextSettings, new Date(nowMs))) {
          return {
            ...current,
            isPlaying: false
          };
        }

        if (!current.isPlaying) {
          return current;
        }

        const nextCountdownMs = current.countdownMs - tickMs;
        if (nextCountdownMs > 0) {
          return {
            ...current,
            countdownMs: nextCountdownMs
          };
        }

        const atEdge = isPlaybackAtEdge(current, currentPages, 1);
        const nextIndex = getNextPlaybackIndex(current.currentIndex, currentPages, nextSettings.loop, 1);
        const nextPage = playablePages[nextIndex] ?? null;

        return {
          ...current,
          countdownMs: getPlaybackDurationMs(nextPage),
          currentIndex: nextIndex,
          isPlaying: atEdge && !nextSettings.loop ? false : current.isPlaying
        };
      });
    }, tickMs);

    return () => {
      window.clearInterval(timerId);
    };
  }, [pages, tickMs]);

  useEffect(() => {
    const handleInteraction = () => {
      const nextSettings = settingsRef.current;

      if (!nextSettings) {
        return;
      }

      const nowMs = Date.now();

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
          nowMs
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
        lastInteractionAt: Date.now()
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
        lastInteractionAt: Date.now()
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

      const nowMs = Date.now();
      const canPlay =
        isPlaybackAllowedBySchedule(nextSettings, new Date(nowMs)) && playablePages.length > 0;

      if (current.isIdle) {
        return createPlaybackRuntime(nextSettings, pagesRef.current, {
          currentPageId: nextSettings.startPage,
          isIdle: false,
          isPlaying: canPlay,
          lastInteractionAt: nowMs,
          nowMs
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
    countdown,
    currentPage,
    errorMessage,
    fallbackRoute,
    isIdle: runtime?.isIdle ?? false,
    isLoading,
    isPlaying: runtime?.isPlaying ?? false,
    nextPage,
    pages,
    prevPage,
    progress,
    reload: loadPlayback,
    rotationPreview,
    settings,
    togglePlay
  };
}
