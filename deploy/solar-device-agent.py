#!/usr/bin/env python3
"""Read-only Pi device-status agent for Solar Player split topology.

Exposes:
  GET /stats  — disk/mem/cpu/uptime from this Pi's /proc and filesystem
  GET /logs?limit=N — Pi-local diagnostic logs (kiosk launcher + optional journal helper)

Security:
  ALLOWED_SOURCE_IPS — comma-separated source IPs. Empty/unset = fail-closed (all 403).
  Never returns secrets. No write endpoints.

Environment:
  DEVICE_AGENT_HOST   bind address (default 0.0.0.0)
  DEVICE_AGENT_PORT   listen port (default 3001)
  ALLOWED_SOURCE_IPS  allowlist (required; fail-closed when empty)
  JOURNAL_HELPER_PATH path to read-solar-display-journal.sh
                      (default /usr/local/sbin/read-solar-display-journal.sh)
  KIOSK_LAUNCHER_LOG  optional kiosk launcher log path
  DEVICE_AGENT_DISK_PATH path for disk stats (default /)
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse


def env_str(name: str, default: str) -> str:
    value = os.environ.get(name)
    if value is None:
        return default
    trimmed = value.strip()
    return trimmed if trimmed else default


def parse_allowlist() -> set[str]:
    raw = os.environ.get("ALLOWED_SOURCE_IPS", "")
    if not raw or not raw.strip():
        return set()
    return {part.strip() for part in raw.split(",") if part.strip()}


def clamp_limit(raw: str | None) -> int:
    try:
        value = int(raw) if raw is not None else 20
    except (TypeError, ValueError):
        value = 20
    return max(1, min(500, value))


def read_uptime_seconds() -> int:
    try:
        content = Path("/proc/uptime").read_text(encoding="utf-8")
        return int(float(content.split()[0]))
    except (OSError, ValueError, IndexError):
        return 0


def read_memory() -> dict[str, int]:
    total_kb = 0
    available_kb = 0
    try:
        for line in Path("/proc/meminfo").read_text(encoding="utf-8").splitlines():
            if line.startswith("MemTotal:"):
                total_kb = int(line.split()[1])
            elif line.startswith("MemAvailable:"):
                available_kb = int(line.split()[1])
    except (OSError, ValueError, IndexError):
        return {"totalMB": 0, "usedMB": 0, "freeMB": 0, "usePercent": 0}

    total_mb = round(total_kb / 1024)
    free_mb = round(available_kb / 1024)
    used_mb = max(0, total_mb - free_mb)
    use_percent = round((used_mb / total_mb) * 100) if total_mb > 0 else 0
    return {
        "totalMB": total_mb,
        "usedMB": used_mb,
        "freeMB": free_mb,
        "usePercent": use_percent,
    }


def read_cpu() -> dict[str, Any]:
    load_avg: list[float] = [0.0, 0.0, 0.0]
    cores = 0
    try:
        parts = Path("/proc/loadavg").read_text(encoding="utf-8").strip().split()
        load_avg = [float(parts[0]), float(parts[1]), float(parts[2])]
    except (OSError, ValueError, IndexError):
        pass
    try:
        cores = sum(
            1
            for line in Path("/proc/cpuinfo").read_text(encoding="utf-8").splitlines()
            if line.startswith("processor")
        )
    except OSError:
        cores = os.cpu_count() or 0
    return {"cores": cores, "loadAvg": load_avg}


def read_disk(path: str) -> dict[str, int]:
    try:
        st = os.statvfs(path)
        total = st.f_blocks * st.f_frsize
        free = st.f_bfree * st.f_frsize
        available = st.f_bavail * st.f_frsize
        used = max(0, total - free)
        total_mb = round(total / 1024 / 1024)
        used_mb = round(used / 1024 / 1024)
        available_mb = round(available / 1024 / 1024)
        use_percent = round((used / total) * 100) if total > 0 else 0
        return {
            "totalMB": total_mb,
            "usedMB": used_mb,
            "availableMB": available_mb,
            "usePercent": use_percent,
        }
    except OSError:
        return {"totalMB": 0, "usedMB": 0, "availableMB": 0, "usePercent": 0}


def build_stats() -> dict[str, Any]:
    disk_path = env_str("DEVICE_AGENT_DISK_PATH", "/")
    return {
        "disk": read_disk(disk_path),
        "memory": read_memory(),
        "cpu": read_cpu(),
        "uptimeSeconds": read_uptime_seconds(),
    }


def read_launcher_log_tail(limit: int) -> list[str]:
    path = os.environ.get("KIOSK_LAUNCHER_LOG", "").strip()
    if not path:
        # Common default under kiosk user state.
        candidates = [
            "/home/pi/.local/state/solar-display/kiosk-launcher.log",
        ]
        path = next((p for p in candidates if Path(p).is_file()), "")
    if not path or not Path(path).is_file():
        return []
    try:
        lines = Path(path).read_text(encoding="utf-8", errors="replace").splitlines()
        return lines[-limit:]
    except OSError:
        return []


def read_journal_lines(limit: int) -> tuple[list[str], str | None]:
    helper = env_str(
        "JOURNAL_HELPER_PATH",
        "/usr/local/sbin/read-solar-display-journal.sh",
    )
    if not Path(helper).is_file():
        return [], "journal reader helper is unavailable"
    try:
        # Prefer non-interactive sudo when available; fall back to direct helper.
        commands = [
            ["sudo", "-n", helper, "export", str(limit)],
            [helper, "export", str(limit)],
        ]
        last_error = "journal reader failed"
        for cmd in commands:
            try:
                completed = subprocess.run(
                    cmd,
                    check=False,
                    capture_output=True,
                    text=True,
                    timeout=10,
                )
            except FileNotFoundError:
                continue
            except subprocess.TimeoutExpired:
                last_error = "journal reader timed out"
                continue
            if completed.returncode == 0:
                lines = [
                    line for line in completed.stdout.splitlines() if line.strip()
                ]
                return lines[-limit:], None
            stderr = (completed.stderr or completed.stdout or "").strip()
            if stderr:
                last_error = stderr.splitlines()[-1][:200]
        return [], last_error
    except OSError as exc:
        return [], str(exc)


def build_logs(limit: int) -> dict[str, Any]:
    launcher = read_launcher_log_tail(limit)
    journal, journal_reason = read_journal_lines(limit)
    entries: list[dict[str, str]] = []
    for line in launcher:
        entries.append({"source": "kiosk-launcher", "message": line})
    for line in journal:
        entries.append({"source": "journal", "message": line})
    # Keep total bounded.
    entries = entries[-limit:]
    available = len(entries) > 0 or journal_reason is None
    unavailable_reason = None
    if not entries and journal_reason:
        unavailable_reason = journal_reason
        available = False
    return {
        "available": available,
        "limit": limit,
        "entries": entries,
        "unavailableReason": unavailable_reason,
    }


class DeviceAgentHandler(BaseHTTPRequestHandler):
    server_version = "SolarDeviceAgent/1.0"

    def log_message(self, fmt: str, *args: Any) -> None:
        # Keep stdout clean for systemd journal; use stderr for diagnostics.
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _client_ip(self) -> str:
        # client_address is (host, port)
        return self.client_address[0]

    def _is_allowed(self) -> bool:
        allowlist = parse_allowlist()
        if not allowlist:
            return False
        return self._client_ip() in allowlist

    def _send_json(self, status: int, payload: dict[str, Any] | None) -> None:
        body = b"" if payload is None else json.dumps(payload).encode("utf-8")
        self.send_response(status)
        if payload is not None:
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
        else:
            self.send_header("Content-Length", "0")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if body:
            self.wfile.write(body)

    def _deny(self) -> None:
        # 403 with empty body — no host stats or log content.
        self._send_json(403, None)

    def do_GET(self) -> None:  # noqa: N802 — http.server API
        if not self._is_allowed():
            self._deny()
            return

        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        query = parse_qs(parsed.query)

        try:
            if path == "/stats":
                self._send_json(200, build_stats())
                return
            if path == "/logs":
                limit_raw = query.get("limit", [None])[0]
                limit = clamp_limit(limit_raw)
                self._send_json(200, build_logs(limit))
                return
            self._send_json(404, {"error": "not found"})
        except Exception:  # pragma: no cover - defensive
            traceback.print_exc(file=sys.stderr)
            self._send_json(500, {"error": "internal error"})


def main() -> int:
    host = env_str("DEVICE_AGENT_HOST", "0.0.0.0")
    port = int(env_str("DEVICE_AGENT_PORT", "3001"))
    allowlist = parse_allowlist()
    if not allowlist:
        sys.stderr.write(
            "WARNING: ALLOWED_SOURCE_IPS is empty — fail-closed (all requests 403). "
            "Set ALLOWED_SOURCE_IPS to the server PC address.\n"
        )
    else:
        sys.stderr.write(
            "solar-device-agent listening on %s:%s allowlist=%s\n"
            % (host, port, ",".join(sorted(allowlist)))
        )

    server = ThreadingHTTPServer((host, port), DeviceAgentHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
