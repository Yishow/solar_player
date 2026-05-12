"""單廠 worker — 每廠一個 FactoryService，共用 MqttBus / Storage。

FactoryServiceManager 負責建立 / 停止所有廠 worker，並處理 /set 變更帶來的
broker 切換、prefix 切換、廠變更等協調動作。
"""

from __future__ import annotations

import json
import threading
from datetime import datetime

from . import discovery
from .anomaly import AnomalyDetector
from .config import CONFIG
from .display import print_result
from .heartbeat import Heartbeat
from .mqtt_bus import MqttBus
from .schedule import is_daytime, seconds_until_sunrise
from .scraper import Scraper
from .storage import Storage


class FactoryService:
    """單廠主迴圈（獨立 thread）。"""

    def __init__(
        self,
        factory_id: str,
        bus: MqttBus,
        storage: Storage,
        stop_event: threading.Event,
    ) -> None:
        self.factory_id = factory_id
        self.bus = bus
        self.storage = storage
        self.stop_event = stop_event

        fac = CONFIG.factory(factory_id)
        if fac is None:
            raise ValueError(f"factory_id={factory_id} 不在設定中")
        self.scraper = Scraper(
            factory_id=factory_id,
            base_url=fac["base_url"],
            login_user=fac["login_user"],
            login_pass=fac["login_pass"],
        )
        self.anomaly = AnomalyDetector(
            daytime_zero_minutes=int(CONFIG.get("anomaly_daytime_zero_minutes", 5)),
            on_alert=self._on_alert,
        )
        self.heartbeat = Heartbeat(
            factory_id=factory_id,
            prefix=CONFIG.get("mqtt_prefix", "solar"),
            interval=int(CONFIG.get("heartbeat_interval", 30)),
            publish=lambda t, p: bus.publish(
                t, p, retain=bool(CONFIG.get("mqtt_retain_heartbeat", False))
            ),
        )
        self._thread: threading.Thread | None = None
        self._ha_discovery_done = False
        self._last_zone_ids: list[int] = []

    # ── 生命週期 ──
    def start(self) -> None:
        self.bus.register_factory(
            self.factory_id,
            on_set=self._on_set,
            on_config=self._on_config_request,
        )
        self.heartbeat.start()
        self._publish_status("running")
        self._thread = threading.Thread(
            target=self._loop, name=f"factory-{self.factory_id}", daemon=True
        )
        self._thread.start()

    def stop(self) -> None:
        self.heartbeat.stop()
        self._publish_status("stopped")
        self.bus.unregister_factory(self.factory_id)
        if self._thread:
            self._thread.join(timeout=5)
            self._thread = None

    # ── 主迴圈 ──
    def _loop(self) -> None:
        while not self.stop_event.is_set():
            # 夜間暫停
            if bool(CONFIG.get("night_pause")):
                now = datetime.now()
                lat = float(CONFIG.get("night_lat", 24.9576))
                lon = float(CONFIG.get("night_lon", 121.2254))
                pad = int(CONFIG.get("night_padding_min", 30))
                if not is_daytime(now, lat, lon, pad):
                    wait = seconds_until_sunrise(now, lat, lon, pad)
                    self._publish_status("paused", f"night, wake in {wait}s")
                    print(f"[{self.factory_id}] 夜間暫停，{wait}s 後恢復")
                    self._wait(wait)
                    continue

            self._run_once()

            interval = max(1, int(CONFIG.get("interval", 60)))
            self._wait(interval)

    def _wait(self, seconds: int) -> None:
        # 用 Event.wait 支援即時喚醒（重啟 / 停止）
        self.stop_event.wait(seconds)

    # ── 單輪 ──
    def _run_once(self) -> bool:
        try:
            summary, zones = self.scraper.fetch()
        except Exception as e:
            print(f"[{self.factory_id}] 抓取失敗: {e}，下一輪重新登入")
            self.scraper.session = None
            self._publish_status("error", str(e))
            return False

        # 日間旗標（給異常偵測用）
        daytime = True
        if bool(CONFIG.get("night_pause")):
            daytime = is_daytime(
                datetime.now(),
                float(CONFIG.get("night_lat", 24.9576)),
                float(CONFIG.get("night_lon", 121.2254)),
                int(CONFIG.get("night_padding_min", 30)),
            )

        self._publish_data(summary, zones)
        self.storage.record(self.factory_id, summary, zones)
        self.anomaly.check(self.factory_id, summary, zones, daytime)
        self._maybe_publish_discovery(zones)

        print_result(
            self.factory_id,
            summary,
            zones,
            True,
            prefix=CONFIG.get("mqtt_prefix", "solar"),
            mqtt_host=CONFIG.get("mqtt_host", "localhost"),
            mqtt_port=int(CONFIG.get("mqtt_port", 1883)),
        )
        return True

    # ── 發佈 ──
    def _publish_data(self, summary: dict, zones: list[dict]) -> None:
        prefix = CONFIG.get("mqtt_prefix", "solar")
        factory = self.factory_id
        ts = datetime.now().isoformat(timespec="seconds")
        base = f"{prefix}/{factory}"

        retain_summary = bool(CONFIG.get("mqtt_retain_summary", True))
        retain_zone = bool(CONFIG.get("mqtt_retain_zone", True))

        self.bus.publish_json(
            f"{base}/summary",
            {**summary, "factory": factory, "timestamp": ts},
            retain=retain_summary,
        )
        self.bus.publish_json(
            f"{base}/total_power_kw",
            {"value": summary.get("total_power_kw")},
            retain=retain_summary,
        )
        self.bus.publish_json(
            f"{base}/today_mwh",
            {"value": summary.get("today_mwh")},
            retain=retain_summary,
        )
        self.bus.publish_json(
            f"{base}/month_mwh",
            {"value": summary.get("month_mwh")},
            retain=retain_summary,
        )

        for z in zones:
            zid = z["zone_id"]
            self.bus.publish_json(
                f"{base}/zone/{zid}",
                {**z, "factory": factory, "timestamp": ts},
                retain=retain_zone,
            )
            for key in ("power_kw", "today_kwh", "month_mwh", "total_mwh", "capacity_kwp", "today_hours"):
                self.bus.publish_json(
                    f"{base}/zone/{zid}/{key}",
                    {"value": z.get(key)},
                    retain=retain_zone,
                )

    def _publish_status(self, status: str, message: str = "") -> None:
        prefix = CONFIG.get("mqtt_prefix", "solar")
        self.bus.publish_json(
            f"{prefix}/{self.factory_id}/status",
            {
                "status": status,
                "message": message,
                "timestamp": datetime.now().isoformat(timespec="seconds"),
            },
            retain=bool(CONFIG.get("mqtt_retain_status", True)),
        )

    # ── HA Discovery ──
    def _maybe_publish_discovery(self, zones: list[dict]) -> None:
        if not bool(CONFIG.get("ha_discovery")):
            return
        zone_ids = [z["zone_id"] for z in zones]
        if self._ha_discovery_done and zone_ids == self._last_zone_ids:
            return
        discovery.publish_factory_discovery(
            publish=lambda t, p, r: self.bus.publish(t, p, retain=r),
            ha_prefix=CONFIG.get("ha_discovery_prefix", "homeassistant"),
            prefix=CONFIG.get("mqtt_prefix", "solar"),
            factory_id=self.factory_id,
            zones=zones,
        )
        self._ha_discovery_done = True
        self._last_zone_ids = zone_ids

    # ── 告警 callback ──
    def _on_alert(self, factory_id: str, level: str, message: str) -> None:
        prefix = CONFIG.get("mqtt_prefix", "solar")
        payload = {
            "level": level,
            "message": message,
            "timestamp": datetime.now().isoformat(timespec="seconds"),
        }
        self.bus.publish_json(
            f"{prefix}/{factory_id}/alert",
            payload,
            retain=bool(CONFIG.get("mqtt_retain_alert", False)),
        )
        self.storage.record_alert(factory_id, level, message)
        print(f"[{factory_id}] {level}: {message}")

    # ── MQTT 指令 ──
    def _on_set(self, payload: dict) -> None:
        global_changed, factory_changed = CONFIG.apply_set(self.factory_id, payload)
        restart = bool(payload.get("restart"))

        if "base_url" in factory_changed or "login_user" in factory_changed or "login_pass" in factory_changed:
            fac = CONFIG.factory(self.factory_id) or {}
            self.scraper.update_credentials(fac["base_url"], fac["login_user"], fac["login_pass"])
            print(f"[{self.factory_id}] 登入資訊已變更，下一輪將重新登入")

        if "mqtt_prefix" in global_changed:
            # 由 Manager 層處理 bus 重訂 + 各廠 heartbeat/discovery 重發
            self.heartbeat.update_settings(
                CONFIG.get("mqtt_prefix", "solar"),
                int(CONFIG.get("heartbeat_interval", 30)),
            )
            self._ha_discovery_done = False  # 重發 discovery

        if "heartbeat_interval" in global_changed:
            self.heartbeat.update_settings(
                CONFIG.get("mqtt_prefix", "solar"),
                int(CONFIG.get("heartbeat_interval", 30)),
            )

        if "anomaly_daytime_zero_minutes" in global_changed:
            self.anomaly.daytime_zero_minutes = int(
                CONFIG.get("anomaly_daytime_zero_minutes", 5)
            )

        if global_changed or factory_changed or restart:
            CONFIG.save()
            self._publish_config()

        if restart:
            print(f"[{self.factory_id}] 收到重啟指令")
            self.stop_event.set()

    def _on_config_request(self) -> None:
        self._publish_config()

    def _publish_config(self) -> None:
        prefix = CONFIG.get("mqtt_prefix", "solar")
        fac = CONFIG.factory(self.factory_id) or {}
        payload = {**CONFIG.globals, "factory": fac}
        self.bus.publish_json(
            f"{prefix}/{self.factory_id}/config",
            payload,
            retain=bool(CONFIG.get("mqtt_retain_config", True)),
        )


class FactoryServiceManager:
    """多廠 service 容器。"""

    def __init__(self, bus: MqttBus, storage: Storage) -> None:
        self.bus = bus
        self.storage = storage
        self.stop_event = threading.Event()
        self.services: dict[str, FactoryService] = {}

    def start_all(self) -> None:
        for fid in CONFIG.factory_ids():
            svc = FactoryService(fid, self.bus, self.storage, self.stop_event)
            svc.start()
            self.services[fid] = svc

    def stop_all(self) -> None:
        self.stop_event.set()
        for svc in self.services.values():
            svc.stop()
        self.services.clear()

    def wait(self) -> None:
        """阻塞直到 stop_event 被 set。"""
        try:
            while not self.stop_event.is_set():
                self.stop_event.wait(1.0)
        except KeyboardInterrupt:
            self.stop_event.set()
