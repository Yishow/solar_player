"""Watchdog 心跳（Feature #6）。

獨立 thread，每 N 秒對 `<prefix>/<factory>/heartbeat` 發一次 JSON。
MQTT client 可替換（支援 reconnect）。
"""

from __future__ import annotations

import json
import threading
import time
from datetime import datetime
from typing import Callable


class Heartbeat:
    def __init__(
        self,
        factory_id: str,
        prefix: str,
        interval: int,
        publish: Callable[[str, str], bool],
    ) -> None:
        """publish(topic, payload_str) → ok；失敗 callback 仍要安靜回 False。"""
        self.factory_id = factory_id
        self.prefix = prefix
        self.interval = max(5, int(interval))
        self._publish = publish
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._boot_ts = datetime.now().isoformat(timespec="seconds")

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(
            target=self._loop, name=f"heartbeat-{self.factory_id}", daemon=True
        )
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=2)
            self._thread = None

    def update_settings(self, prefix: str, interval: int) -> None:
        self.prefix = prefix
        self.interval = max(5, int(interval))

    def _loop(self) -> None:
        while not self._stop.is_set():
            payload = {
                "ts": datetime.now().isoformat(timespec="seconds"),
                "boot": self._boot_ts,
                "factory": self.factory_id,
            }
            topic = f"{self.prefix}/{self.factory_id}/heartbeat"
            try:
                self._publish(topic, json.dumps(payload, ensure_ascii=False))
            except Exception as e:
                print(f"[{self.factory_id}] heartbeat 發佈失敗：{e}")
            # 用 Event.wait 可被 stop() 立即喚醒
            self._stop.wait(self.interval)
