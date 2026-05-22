export function isWakeLockSupported(nav: { wakeLock?: unknown } | undefined) {
  const wakeLock = nav?.wakeLock as {
    request?: unknown;
  } | undefined;

  return typeof wakeLock?.request === "function";
}

export function shouldReacquireWakeLock(input: {
  visibilityState: DocumentVisibilityState;
  hasSentinel: boolean;
}) {
  return input.visibilityState === "visible" && !input.hasSentinel;
}
