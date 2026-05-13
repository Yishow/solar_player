"""SQLite 本地備援（Feature #3）。

每輪擷取後寫一筆摘要 + 每區詳細資料。MQTT broker 掛掉也不會丟歷史。
提供 history 查詢給 CLI `history` 子命令用。
"""

from __future__ import annotations

import os
import sqlite3
import threading
from datetime import datetime
from typing import Any, Iterable

SCHEMA = """
CREATE TABLE IF NOT EXISTS summary (
    ts              TEXT NOT NULL,
    factory_id      TEXT NOT NULL,
    total_power_kw  REAL,
    today_mwh       REAL,
    month_mwh       REAL,
    PRIMARY KEY (ts, factory_id)
);
CREATE INDEX IF NOT EXISTS idx_summary_factory_ts ON summary(factory_id, ts);

CREATE TABLE IF NOT EXISTS zone (
    ts            TEXT NOT NULL,
    factory_id    TEXT NOT NULL,
    zone_id       INTEGER NOT NULL,
    serial        TEXT,
    name          TEXT,
    power_kw      REAL,
    today_kwh     REAL,
    month_mwh     REAL,
    total_mwh     REAL,
    capacity_kwp  REAL,
    today_hours   REAL,
    PRIMARY KEY (ts, factory_id, zone_id)
);
CREATE INDEX IF NOT EXISTS idx_zone_factory_ts ON zone(factory_id, ts);

CREATE TABLE IF NOT EXISTS alert (
    ts          TEXT NOT NULL,
    factory_id  TEXT NOT NULL,
    level       TEXT NOT NULL,
    message     TEXT NOT NULL
);
"""


class Storage:
    """SQLite 備援（thread-safe via Lock）。"""

    def __init__(self, path: str, enabled: bool = True) -> None:
        self.path = path
        self.enabled = enabled
        self._lock = threading.Lock()
        self._conn: sqlite3.Connection | None = None
        if enabled:
            self._open()

    def _open(self) -> None:
        if not self.enabled:
            return
        try:
            d = os.path.dirname(self.path)
            if d and not os.path.exists(d):
                os.makedirs(d, exist_ok=True)
            self._conn = sqlite3.connect(
                self.path, check_same_thread=False, isolation_level=None
            )
            self._conn.executescript(SCHEMA)
        except Exception as e:
            print(f"SQLite 初始化失敗（{self.path}）：{e}，停用本地備援")
            self.enabled = False
            self._conn = None

    def close(self) -> None:
        if self._conn is not None:
            try:
                self._conn.close()
            except Exception:
                pass
            self._conn = None

    # ── 寫入 ──
    def record(
        self,
        factory_id: str,
        summary: dict,
        zones: list[dict],
        ts: str | None = None,
    ) -> None:
        if not self.enabled or self._conn is None:
            return
        ts = ts or datetime.now().isoformat(timespec="seconds")
        try:
            with self._lock:
                self._conn.execute(
                    "INSERT OR REPLACE INTO summary VALUES (?,?,?,?,?)",
                    (
                        ts,
                        factory_id,
                        summary.get("total_power_kw"),
                        summary.get("today_mwh"),
                        summary.get("month_mwh"),
                    ),
                )
                self._conn.executemany(
                    "INSERT OR REPLACE INTO zone VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                    [
                        (
                            ts,
                            factory_id,
                            z["zone_id"],
                            z.get("serial"),
                            z.get("name"),
                            z.get("power_kw"),
                            z.get("today_kwh"),
                            z.get("month_mwh"),
                            z.get("total_mwh"),
                            z.get("capacity_kwp"),
                            z.get("today_hours"),
                        )
                        for z in zones
                    ],
                )
        except Exception as e:
            print(f"[{factory_id}] SQLite 寫入失敗：{e}")

    def record_alert(self, factory_id: str, level: str, message: str) -> None:
        if not self.enabled or self._conn is None:
            return
        ts = datetime.now().isoformat(timespec="seconds")
        try:
            with self._lock:
                self._conn.execute(
                    "INSERT INTO alert VALUES (?,?,?,?)",
                    (ts, factory_id, level, message),
                )
        except Exception as e:
            print(f"[{factory_id}] SQLite alert 寫入失敗：{e}")

    # ── 查詢 ──
    def history_summary(
        self,
        factory_id: str | None = None,
        limit: int = 50,
    ) -> Iterable[sqlite3.Row]:
        if not self.enabled or self._conn is None:
            return []
        with self._lock:
            self._conn.row_factory = sqlite3.Row
            if factory_id:
                return list(
                    self._conn.execute(
                        "SELECT * FROM summary WHERE factory_id=? "
                        "ORDER BY ts DESC LIMIT ?",
                        (factory_id, limit),
                    )
                )
            return list(
                self._conn.execute(
                    "SELECT * FROM summary ORDER BY ts DESC LIMIT ?",
                    (limit,),
                )
            )

    def history_alerts(self, limit: int = 50) -> Iterable[sqlite3.Row]:
        if not self.enabled or self._conn is None:
            return []
        with self._lock:
            self._conn.row_factory = sqlite3.Row
            return list(
                self._conn.execute(
                    "SELECT * FROM alert ORDER BY ts DESC LIMIT ?",
                    (limit,),
                )
            )


def print_history(storage: Storage, factory_id: str | None, limit: int) -> None:
    rows = storage.history_summary(factory_id, limit)
    if not rows:
        print("（無資料）")
        return
    print(f"{'時間':<20} {'廠':<4} {'kW':>8} {'今日MWh':>10} {'本月MWh':>10}")
    print("-" * 60)
    for r in rows:
        total = r["total_power_kw"]
        today = r["today_mwh"]
        month = r["month_mwh"]
        print(
            f"{r['ts']:<20} {r['factory_id']:<4} "
            f"{total if total is not None else '-':>8} "
            f"{today if today is not None else '-':>10} "
            f"{month if month is not None else '-':>10}"
        )
