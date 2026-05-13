import { useCallback, useEffect, useRef, useState } from "react";

type UseCountdownOptions = {
  /** Total duration in milliseconds */
  durationMs: number;
  /** Whether the countdown is active */
  running: boolean;
  /** Callback when countdown reaches zero */
  onDone?: () => void;
};

export function useCountdown(options: UseCountdownOptions) {
  const { durationMs, running, onDone } = options;
  const [remaining, setRemaining] = useState(durationMs);
  const onDoneRef = useRef(onDone);
  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Keep onDone ref current
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  // Reset when duration or running changes
  useEffect(() => {
    if (!running) {
      setRemaining(durationMs);
      startTimeRef.current = null;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    startTimeRef.current = Date.now();
    setRemaining(durationMs);

    const tick = () => {
      if (startTimeRef.current === null) return;

      const elapsed = Date.now() - startTimeRef.current;
      const left = Math.max(0, durationMs - elapsed);

      setRemaining(left);

      if (left <= 0) {
        animFrameRef.current = null;
        onDoneRef.current?.();
        return;
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [durationMs, running]);

  // Reset timer
  const reset = useCallback(() => {
    startTimeRef.current = null;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setRemaining(durationMs);
  }, [durationMs]);

  const progress = durationMs > 0 ? 1 - remaining / durationMs : 0;

  return {
    remaining,
    remainingSeconds: Math.ceil(remaining / 1000),
    progress,
    reset
  };
}
