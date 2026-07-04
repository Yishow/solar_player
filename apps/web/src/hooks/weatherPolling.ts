export function setupWeatherPolling(
  enabled: boolean,
  intervalMinutes: number,
  callback: () => void | Promise<void>
): (() => void) | undefined {
  if (!enabled || intervalMinutes <= 0) {
    return undefined;
  }

  const timer = setInterval(() => {
    void callback();
  }, intervalMinutes * 60 * 1000);

  return () => {
    clearInterval(timer);
  };
}
