# Server-authoritative App Time

Solar Player uses the Server host clock as the wall-clock authority. The
Server broadcasts that clock to display Clients, and each Client advances the
accepted baseline with a monotonic timer. Playback does not fall back to the
Client OS Clock while waiting for a valid signal.

The Header renders the accepted App Time in `Asia/Taipei` and reports one of
four states:

- `waiting`：尚未收到有效 Server Time Signal。
- `synced`：最近 90 秒內收到有效 signal。
- `stale`：已超過 90 秒，但未達 30 分鐘。
- `time-untrusted`：已達 30 分鐘，absolute-time behavior 保持凍結。

## Operator responsibility

The operator is responsible for keeping the Server host clock and its chosen
NTP/time-sync service correct. Before launch or after host maintenance, verify
the Server clock and synchronization state with the operating system's normal
tools, for example:

```bash
timedatectl status
```

If the Server clock must be corrected forward or backward, perform that
maintenance outside Solar Player and restart `solar-display` afterward. The
new Server process creates a new time instance, allowing Clients to accept the
corrected baseline immediately.

Solar Player does **not** set the Server or Client OS Clock, change an OS time
zone, configure NTP, or invoke a host time-sync service. The
`Asia/Taipei` value in the application protocol controls product calendar
rendering only; it is not an OS configuration command.
