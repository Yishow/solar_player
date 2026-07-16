import threading
import unittest
from unittest.mock import patch

from solar.config import CONFIG, DEFAULT_GLOBAL
from solar.service import FactoryService


class DummyBus:
    def __init__(self):
        self.json_calls = []
        self.raw_calls = []

    def publish_json(self, topic, data, retain=True, qos=1):
        self.json_calls.append({"topic": topic, "retain": retain, "data": data})
        return True

    def publish(self, topic, payload, retain=True, qos=1):
        self.raw_calls.append({"topic": topic, "retain": retain, "payload": payload})
        return True


class DummyStorage:
    def __init__(self):
        self.alerts = []

    def record_alert(self, factory_id, level, message):
        self.alerts.append((factory_id, level, message))


class DummyScraper:
    def __init__(self, **kwargs):
        self.kwargs = kwargs


class DummyAnomaly:
    def __init__(self, **kwargs):
        self.kwargs = kwargs


class DummyHeartbeat:
    def __init__(self, factory_id, prefix, interval, publish):
        self.factory_id = factory_id
        self.prefix = prefix
        self.interval = interval
        self.publish = publish

    def start(self):
        pass

    def stop(self):
        pass

    def update_settings(self, prefix, interval):
        self.prefix = prefix
        self.interval = interval


class MqttRetainTests(unittest.TestCase):
    def setUp(self):
        self.original_globals = dict(CONFIG.globals)
        self.original_factories = [dict(f) for f in CONFIG.factories]
        CONFIG.globals.clear()
        CONFIG.globals.update(self.original_globals)
        CONFIG.factories = [{
            "factory_id": "KN",
            "base_url": "http://example",
            "login_user": "user",
            "login_pass": "pass",
        }]

    def tearDown(self):
        CONFIG.globals.clear()
        CONFIG.globals.update(self.original_globals)
        CONFIG.factories = self.original_factories

    def test_default_global_config_contains_retain_flags(self):
        self.assertIs(DEFAULT_GLOBAL["mqtt_retain_summary"], True)
        self.assertIs(DEFAULT_GLOBAL["mqtt_retain_zone"], True)
        self.assertIs(DEFAULT_GLOBAL["mqtt_retain_status"], True)
        self.assertIs(DEFAULT_GLOBAL["mqtt_retain_config"], True)
        self.assertIs(DEFAULT_GLOBAL["mqtt_retain_alert"], False)
        self.assertIs(DEFAULT_GLOBAL["mqtt_retain_heartbeat"], False)

    def test_publish_methods_use_configured_retain_flags(self):
        CONFIG.globals.update(
            {
                "mqtt_prefix": "solar",
                "mqtt_retain_summary": False,
                "mqtt_retain_zone": False,
                "mqtt_retain_status": False,
                "mqtt_retain_config": False,
                "mqtt_retain_alert": True,
            }
        )
        bus = DummyBus()
        storage = DummyStorage()

        svc = FactoryService.__new__(FactoryService)
        svc.factory_id = "KN"
        svc.bus = bus
        svc.storage = storage

        svc._publish_data(
            {"total_power_kw": 1.2, "today_mwh": 3.4, "month_mwh": 5.6},
            [{"zone_id": 1, "power_kw": 7.8, "today_kwh": 9.1, "month_mwh": 1.2, "total_mwh": 3.4, "capacity_kwp": 5.6, "today_hours": 7.8}],
        )
        svc._publish_status("running")
        svc._publish_config()
        svc._on_alert("KN", "WARN", "demo")

        retains = {call["topic"]: call["retain"] for call in bus.json_calls}
        self.assertFalse(retains["solar/KN/summary"])
        self.assertFalse(retains["solar/KN/total_power_kw"])
        self.assertFalse(retains["solar/KN/zone/1"])
        self.assertFalse(retains["solar/KN/zone/1/power_kw"])
        self.assertFalse(retains["solar/KN/status"])
        self.assertFalse(retains["solar/KN/config"])
        self.assertTrue(retains["solar/KN/alert"])

    def test_apply_set_coerces_boolean_strings_for_retain_flags(self):
        changed_globals, changed_factory = CONFIG.apply_set(
            "KN",
            {
                "mqtt_retain_summary": "false",
                "mqtt_retain_alert": "true",
            },
        )
        self.assertEqual(changed_factory, [])
        self.assertEqual(
            changed_globals,
            ["mqtt_retain_summary", "mqtt_retain_alert"],
        )
        self.assertIs(CONFIG.get("mqtt_retain_summary"), False)
        self.assertIs(CONFIG.get("mqtt_retain_alert"), True)

    def test_factory_service_heartbeat_respects_configured_retain_flag(self):
        CONFIG.globals.update(
            {
                "mqtt_prefix": "solar",
                "heartbeat_interval": 30,
                "anomaly_daytime_zero_minutes": 5,
                "mqtt_retain_heartbeat": True,
            }
        )
        bus = DummyBus()
        storage = DummyStorage()

        with patch("solar.service.Scraper", DummyScraper), patch(
            "solar.service.AnomalyDetector", DummyAnomaly
        ), patch("solar.service.Heartbeat", DummyHeartbeat):
            svc = FactoryService("KN", bus, storage, threading.Event())

        svc.heartbeat.publish("solar/KN/heartbeat", "{}")
        self.assertTrue(bus.raw_calls[-1]["retain"])


if __name__ == "__main__":
    unittest.main()
