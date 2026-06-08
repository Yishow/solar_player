import type { PlaybackTransitionType } from "@solar-display/shared";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type DisplayTransitionPhase = "idle" | "out" | "hold" | "in";
export type DisplayTransitionMode = "none" | "fade" | "slide";

export type DisplayTransitionDurations = {
  inMs: number;
  outMs: number;
  totalMs: number;
};

const TOTAL_MIN_MS = 120;
const TOTAL_MAX_MS = 1200;
const OUT_MAX_MS = 300;
const OUT_RATIO = 0.4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * 決定切頁是否要播過場動畫。
 * reduced-motion、transitionType 為 "none"、或設定尚未載入 (undefined) 時都不播。
 */
export function shouldAnimateTransition(
  transitionType: PlaybackTransitionType | undefined,
  prefersReducedMotion: boolean
): boolean {
  if (prefersReducedMotion || transitionType === undefined || transitionType === "none") {
    return false;
  }

  return transitionType === "fade" || transitionType === "slide";
}

export function resolveDisplayTransitionMode(
  transitionType: PlaybackTransitionType | undefined,
  prefersReducedMotion: boolean
): DisplayTransitionMode {
  return shouldAnimateTransition(transitionType, prefersReducedMotion) && transitionType
    ? transitionType
    : "none";
}

/**
 * 把 PlaybackSettings.transitionSpeed (ms, 總過場預算) 拆成 fade-out 與 fade-in 時長。
 * out 較短讓切換更俐落。speed <= 0 視為不播動畫。
 */
export function resolveTransitionDurations(transitionSpeed: number): DisplayTransitionDurations {
  if (!Number.isFinite(transitionSpeed) || transitionSpeed <= 0) {
    return { inMs: 0, outMs: 0, totalMs: 0 };
  }

  const totalMs = clamp(Math.round(transitionSpeed), TOTAL_MIN_MS, TOTAL_MAX_MS);
  const outMs = clamp(Math.round(totalMs * OUT_RATIO), 0, OUT_MAX_MS);
  const inMs = totalMs - outMs;

  return { inMs, outMs, totalMs };
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * 只有在「已導向的 route」真正成為目前 route（loader 完成、新頁掛載）後，才允許進入 fade-in。
 * 否則 fade-in 會落在仍掛著的舊頁上，造成舊頁淡回的閃爍。
 */
export function shouldEnterInPhase(navigatedRoute: string | null, currentPath: string): boolean {
  return navigatedRoute !== null && navigatedRoute === currentPath;
}

type UseDisplayTransitionOptions = {
  currentPath: string;
  navigate: (route: string) => void;
  transitionType: PlaybackTransitionType | undefined;
  transitionSpeed: number | undefined;
};

/**
 * deferred-navigate gate：攔截輪播切頁，先播 fade-out 再真正導頁，新頁掛載後播 fade-in。
 * 不動 usePageRotation / usePlaybackController 內部。
 *
 * navigate 與 settings 都透過 ref 在每次 render 同步，讓回傳的 onRouteChange 是穩定函式，
 * 避免「transition 要 controller.settings、usePageRotation 要 onRouteChange」的循環依賴。
 */
export function useDisplayTransition({
  currentPath,
  navigate,
  transitionType,
  transitionSpeed
}: UseDisplayTransitionOptions) {
  const [phase, setPhase] = useState<DisplayTransitionPhase>("idle");
  const pendingRouteRef = useRef<string | null>(null);
  const navigatedRouteRef = useRef<string | null>(null);
  const outTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateRef = useRef(navigate);
  const durations = resolveTransitionDurations(transitionSpeed ?? 0);
  const transitionMode = resolveDisplayTransitionMode(transitionType, prefersReducedMotion());
  const animate = transitionMode !== "none" && durations.outMs > 0;
  const animateRef = useRef(animate);
  const outMsRef = useRef(durations.outMs);

  useEffect(() => {
    navigateRef.current = navigate;
    animateRef.current = animate;
    outMsRef.current = durations.outMs;
  });

  const onRouteChange = useCallback((incomingRoute: string) => {
    if (!animateRef.current) {
      navigateRef.current(incomingRoute);
      return;
    }

    // latest pending wins；已在 out 階段就只覆蓋 pendingRoute、沿用既有計時器。
    pendingRouteRef.current = incomingRoute;
    setPhase("out");

    if (outTimerRef.current !== null) {
      return;
    }

    outTimerRef.current = setTimeout(() => {
      outTimerRef.current = null;
      const route = pendingRouteRef.current;
      pendingRouteRef.current = null;

      if (route !== null) {
        navigatedRouteRef.current = route;
        navigateRef.current(route);
      }

      // 先進 hold（opacity 0 隱藏），等新 route 真正掛載再淡入，避免 loader 期間舊頁淡回。
      setPhase("hold");
    }, outMsRef.current);
  }, []);

  // 導向的 route 成為目前 route（loader 完成、新頁掛載）後才播 fade-in。
  useLayoutEffect(() => {
    if (shouldEnterInPhase(navigatedRouteRef.current, currentPath)) {
      navigatedRouteRef.current = null;
      setPhase("in");
    }
  }, [currentPath]);

  const onInAnimationEnd = useCallback(() => {
    setPhase((current) => (current === "in" ? "idle" : current));
  }, []);

  useEffect(() => {
    return () => {
      if (outTimerRef.current !== null) {
        clearTimeout(outTimerRef.current);
        outTimerRef.current = null;
      }
    };
  }, []);

  const transitionVars = {
    "--display-transition-in-ms": `${durations.inMs}ms`,
    "--display-transition-out-ms": `${durations.outMs}ms`
  } as React.CSSProperties;

  return { onInAnimationEnd, onRouteChange, phase, transitionMode, transitionVars };
}
