"""共用 MQTT 連線 + 各廠 callback 路由。

整個程式只跟 broker 建一條連線，多廠 service 透過 MqttBus 發佈與訂閱。
/set、/config 指令會依 topic 分派到對應廠的 handler。
"""

from __future__ import annotations

import json
import threading
from typing import Callable

try:
    import paho.mqtt.client as mqtt
    MQTT_AVAILABLE = True
except ImportError:
    MQTT_AVAILABLE = False


SetHandler = Callable[[dict], None]
ConfigHandler = Callable[[], None]


class MqttBus:
    """單一 broker 連線、多廠路由。"""

    def __init__(self) -> None:
        self._client: "mqtt.Client | None" = None
        self._lock = threading.Lock()
        self.host = "localhost"
        self.port = 1883
        self.prefix = "solar"
        # factory_id -> handler
        self._set_handlers: dict[str, SetHandler] = {}
        self._config_handlers: dict[str, ConfigHandler] = {}
        # 已訂閱 (prefix, factory_id) 集合
        self._subscribed: set[tuple[str, str]] = set()

    # ── 註冊 / 註銷 ──
    def register_factory(
        self,
        factory_id: str,
        on_set: SetHandler,
        on_config: ConfigHandler,
    ) -> None:
        self._set_handlers[factory_id] = on_set
        self._config_handlers[factory_id] = on_config
        self._resubscribe_factory(factory_id)

    def unregister_factory(self, factory_id: str) -> None:
        self._set_handlers.pop(factory_id, None)
        self._config_handlers.pop(factory_id, None)
        self._unsubscribe_factory(factory_id)

    # ── 連線 ──
    def connect(self, host: str, port: int, prefix: str) -> bool:
        if not MQTT_AVAILABLE:
            print("錯誤：未安裝 paho-mqtt")
            return False
        self.host = host
        self.port = int(port)
        self.prefix = prefix

        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        client.on_connect = self._on_connect
        client.on_message = self._on_message
        try:
            client.connect(host, port, keepalive=60)
        except Exception as e:
            print(f"MQTT 連線失敗: {e}")
            return False
        client.loop_start()
        with self._lock:
            self._client = client
            self._subscribed.clear()
        return True

    def reconnect(self, host: str, port: int, prefix: str) -> None:
        """broker 位址變更後呼叫，會在獨立 thread 重連以免卡 callback。"""
        threading.Thread(
            target=self._do_reconnect,
            args=(host, port, prefix),
            daemon=True,
            name="mqtt-reconnect",
        ).start()

    def _do_reconnect(self, host: str, port: int, prefix: str) -> None:
        old = self._client
        with self._lock:
            self._client = None
        if old is not None:
            try:
                old.loop_stop()
                old.disconnect()
            except Exception:
                pass
        self.connect(host, port, prefix)

    def disconnect(self) -> None:
        with self._lock:
            c = self._client
            self._client = None
        if c is None:
            return
        try:
            c.loop_stop()
            c.disconnect()
        except Exception:
            pass

    # ── 發佈 ──
    def publish(self, topic: str, payload: str, retain: bool = True, qos: int = 1) -> bool:
        c = self._client
        if c is None:
            return False
        try:
            c.publish(topic, payload, qos=qos, retain=retain)
            return True
        except Exception as e:
            print(f"MQTT publish 失敗 {topic}: {e}")
            return False

    def publish_json(
        self, topic: str, data: dict, retain: bool = True, qos: int = 1
    ) -> bool:
        return self.publish(topic, json.dumps(data, ensure_ascii=False), retain, qos)

    # ── 訂閱管理 ──
    def update_prefix(self, new_prefix: str) -> None:
        if new_prefix == self.prefix:
            return
        old_subs = list(self._subscribed)
        self.prefix = new_prefix
        # 舊 topic 取消
        for old_prefix, fac in old_subs:
            self._unsubscribe_raw(old_prefix, fac)
        # 全廠重訂
        for fac in list(self._set_handlers):
            self._resubscribe_factory(fac)

    def _resubscribe_factory(self, factory_id: str) -> None:
        c = self._client
        if c is None:
            return
        key = (self.prefix, factory_id)
        if key in self._subscribed:
            return
        for suffix in ("config", "set"):
            t = f"{self.prefix}/{factory_id}/{suffix}"
            c.subscribe(t, qos=1)
            print(f"訂閱: {t}")
        self._subscribed.add(key)

    def _unsubscribe_factory(self, factory_id: str) -> None:
        for key in list(self._subscribed):
            if key[1] == factory_id:
                self._unsubscribe_raw(*key)

    def _unsubscribe_raw(self, prefix: str, factory_id: str) -> None:
        c = self._client
        self._subscribed.discard((prefix, factory_id))
        if c is None:
            return
        for suffix in ("config", "set"):
            t = f"{prefix}/{factory_id}/{suffix}"
            try:
                c.unsubscribe(t)
                print(f"取消訂閱: {t}")
            except Exception:
                pass

    # ── callbacks ──
    def _on_connect(self, client, userdata, flags, rc, properties=None):
        if rc == 0:
            print(f"MQTT 已連線到 {self.host}:{self.port}")
            with self._lock:
                self._subscribed.clear()
            for fac in list(self._set_handlers):
                self._resubscribe_factory(fac)
        else:
            print(f"MQTT 連線失敗: {rc}")

    def _on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
        except Exception:
            print(f"無效的 JSON: {msg.topic} {msg.payload!r}")
            return
        topic = msg.topic
        parts = topic.split("/")
        if len(parts) < 3:
            return
        factory_id = parts[-2]
        kind = parts[-1]
        if kind == "config":
            h = self._config_handlers.get(factory_id)
            if h:
                try:
                    h()
                except Exception as e:
                    print(f"[{factory_id}] config handler 錯誤：{e}")
        elif kind == "set":
            h = self._set_handlers.get(factory_id)
            if h:
                try:
                    h(payload)
                except Exception as e:
                    print(f"[{factory_id}] set handler 錯誤：{e}")
