# Pi weather diagnostic live evidence

- Verified host: `raspberry5`
- Release: `0.1.0+90a3954123b4-dirty`
- Source commit: `90a3954123b436e297b537ae8c73fa18f4123928`
- Runtime backup: `/data/solar-display/backups/20260716-180639`
- Test method: temporarily replaced the CWA endpoint with a reserved `.invalid` hostname, restarted the service, triggered a weather refresh, then restored the original `.env` exactly and restarted again.

## Controlled failure

- Trusted `GET /api/weather/diagnostics` returned:
  - `state: error`
  - `operation: current`
  - `code: WEATHER_DNS_LOOKUP_FAILED`
  - `retryable: true`
  - `safeSummary: 無法解析 CWA 主機名稱`
- Public `GET /api/weather/current` remained on its existing contract and contained no diagnostic code, diagnostic object, URL, hostname, token, stack, or raw exception.
- `journalctl -u solar-display` recorded the same bounded code with only the controlled error name and message. It contained no URL, hostname, token, stack, or raw exception.
- `/settings/mqtt` displayed the failure state, stable code, operation, timestamp, retryability, and safe summary. Screenshot: `weather-diagnostic-live.png`.
- The copy control was exercised. The HTTP browser denied clipboard access, so the UI showed its expected manual-selection fallback while retaining the bounded diagnostic text on screen.

## Restoration

- The original `.env` was restored and the temporary test backup was removed.
- `solar-display.service` returned `active`; loopback `/health` returned `status: ok`.
- A new current-weather refresh returned `fetchState: fresh` for station `C0C700` (`中壢`).
- Diagnostics returned `state: ok`, `operation: current`, and `safeSummary: CWA 天氣資料取得成功`.
- Boot time remained `2026-07-16 15:37:27`, proving the application update and diagnostic test did not reboot the Pi.
