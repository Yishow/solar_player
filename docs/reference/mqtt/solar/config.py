"""設定檔載入 / 儲存 / 型別強制。

支援多廠（factories 陣列）與舊版單廠格式自動遷移。
"""

from __future__ import annotations

import json
import os
from copy import deepcopy
from typing import Any

CONFIG_PATH = "solar_config.json"

# ── 全域（非廠別）欄位 schema ──
GLOBAL_SCHEMA: dict[str, type] = {
    "mqtt_host":        str,
    "mqtt_port":        int,
    "mqtt_prefix":      str,
    "interval":         int,
    "mosquitto_path":   str,
    "mosquitto_config": str,
    # HA Discovery
    "ha_discovery":        bool,
    "ha_discovery_prefix": str,
    # SQLite
    "sqlite_path":      str,
    "sqlite_enabled":   bool,
    # Night pause
    "night_pause":         bool,
    "night_lat":           float,
    "night_lon":           float,
    "night_padding_min":   int,
    # 異常告警（白天零功率超過 N 分鐘）
    "anomaly_daytime_zero_minutes": int,
    # 心跳
    "heartbeat_interval":  int,
    "mqtt_retain_summary":   bool,
    "mqtt_retain_zone":      bool,
    "mqtt_retain_status":    bool,
    "mqtt_retain_config":    bool,
    "mqtt_retain_alert":     bool,
    "mqtt_retain_heartbeat": bool,
}

# ── 單一廠別欄位 schema ──
FACTORY_SCHEMA: dict[str, type] = {
    "factory_id": str,
    "base_url":   str,
    "login_user": str,
    "login_pass": str,
}

DEFAULT_GLOBAL: dict[str, Any] = {
    "mqtt_host":   "localhost",
    "mqtt_port":   1883,
    "mqtt_prefix": "solar",
    "interval":    60,
    "mosquitto_path":   "",
    "mosquitto_config": "",
    "ha_discovery":        False,
    "ha_discovery_prefix": "homeassistant",
    "sqlite_path":      "solar.db",
    "sqlite_enabled":   True,
    "night_pause":         False,
    "night_lat":           24.9576,   # 中壢
    "night_lon":           121.2254,
    "night_padding_min":   30,
    "anomaly_daytime_zero_minutes": 5,
    "heartbeat_interval":  30,
    "mqtt_retain_summary":   True,
    "mqtt_retain_zone":      True,
    "mqtt_retain_status":    True,
    "mqtt_retain_config":    True,
    "mqtt_retain_alert":     False,
    "mqtt_retain_heartbeat": False,
}

DEFAULT_FACTORY: dict[str, Any] = {
    "factory_id": "KN",
    "base_url":   "http://192.168.80.5",
    "login_user": "toyota",
    "login_pass": "toyota",
}


def _coerce(schema: dict[str, type], key: str, value: Any) -> Any:
    t = schema.get(key)
    if t is None:
        return None
    try:
        if t is bool:
            if isinstance(value, str):
                return value.lower() in ("1", "true", "yes", "on")
            return bool(value)
        if t is float:
            return float(value)
        return t(value)
    except (ValueError, TypeError):
        return None


def _coerce_global(key: str, value: Any) -> Any:
    return _coerce(GLOBAL_SCHEMA, key, value)


def _coerce_factory(key: str, value: Any) -> Any:
    return _coerce(FACTORY_SCHEMA, key, value)


class Config:
    """中央設定容器。支援多廠與 /set 動態更新。"""

    def __init__(self) -> None:
        self.globals: dict[str, Any] = dict(DEFAULT_GLOBAL)
        self.factories: list[dict[str, Any]] = [dict(DEFAULT_FACTORY)]

    # ── 存取 ──
    def get(self, key: str, default: Any = None) -> Any:
        return self.globals.get(key, default)

    def factory(self, factory_id: str) -> dict[str, Any] | None:
        for f in self.factories:
            if f.get("factory_id") == factory_id:
                return f
        return None

    def factory_ids(self) -> list[str]:
        return [f["factory_id"] for f in self.factories]

    def as_dict(self) -> dict[str, Any]:
        return {**self.globals, "factories": deepcopy(self.factories)}

    # ── 載入 ──
    def load(self, path: str = CONFIG_PATH) -> None:
        try:
            with open(path, "r", encoding="utf-8") as f:
                raw = json.load(f)
        except FileNotFoundError:
            return
        except Exception as e:
            print(f"讀取設定失敗：{e}")
            return

        # 舊版單廠格式 → 遷移為 factories 陣列
        if "factories" not in raw and any(k in raw for k in FACTORY_SCHEMA):
            legacy = {k: raw.pop(k) for k in list(FACTORY_SCHEMA) if k in raw}
            raw["factories"] = [legacy]
            print("偵測到舊版單廠格式，已自動遷移為 factories 陣列")

        # 全域欄位
        for k, v in raw.items():
            if k == "factories":
                continue
            if k in GLOBAL_SCHEMA:
                coerced = _coerce_global(k, v)
                if coerced is not None:
                    self.globals[k] = coerced
                else:
                    print(f"警告：config {k}={v!r} 型別不符，沿用預設")
            else:
                self.globals[k] = v  # 未知 key 先收著

        # 各廠欄位
        factories_raw = raw.get("factories") or []
        if not isinstance(factories_raw, list) or not factories_raw:
            print("警告：factories 為空或格式錯誤，沿用預設單廠")
            return

        cleaned: list[dict[str, Any]] = []
        for idx, fac in enumerate(factories_raw):
            if not isinstance(fac, dict):
                print(f"警告：factories[{idx}] 非物件，略過")
                continue
            merged = dict(DEFAULT_FACTORY)
            for k, v in fac.items():
                if k in FACTORY_SCHEMA:
                    coerced = _coerce_factory(k, v)
                    if coerced is not None:
                        merged[k] = coerced
                    else:
                        print(f"警告：factories[{idx}].{k}={v!r} 型別不符")
                else:
                    merged[k] = v
            cleaned.append(merged)

        if cleaned:
            self.factories = cleaned
        print(f"載入設定：{len(self.factories)} 廠 [{', '.join(self.factory_ids())}]")

    # ── 儲存（原子） ──
    def save(self, path: str = CONFIG_PATH) -> None:
        tmp = f"{path}.tmp"
        try:
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(self.as_dict(), f, indent=2, ensure_ascii=False)
            os.replace(tmp, path)
        except Exception as e:
            print(f"寫入設定失敗：{e}")
            if os.path.exists(tmp):
                try:
                    os.remove(tmp)
                except Exception:
                    pass

    # ── /set 指令套用 ──
    def apply_set(
        self,
        factory_id: str,
        payload: dict[str, Any],
    ) -> tuple[list[str], list[str]]:
        """套用 /set 指令。回傳 (全域變更欄位, 該廠變更欄位)。

        payload 內全域欄位寫進 self.globals；廠別欄位（factory_id / base_url
        / login_user / login_pass）寫進對應的 factory dict。
        未知欄位忽略。
        """
        global_changed: list[str] = []
        factory_changed: list[str] = []

        target = self.factory(factory_id)
        if target is None:
            print(f"警告：/set 收到的 factory_id={factory_id} 不在 factories 中")
            return ([], [])

        for key, raw in payload.items():
            if key == "restart":
                continue
            if key in FACTORY_SCHEMA:
                coerced = _coerce_factory(key, raw)
                if coerced is None:
                    print(f"警告：/set {factory_id}.{key}={raw!r} 型別不符")
                    continue
                if target.get(key) != coerced:
                    target[key] = coerced
                    factory_changed.append(key)
            elif key in GLOBAL_SCHEMA:
                coerced = _coerce_global(key, raw)
                if coerced is None:
                    print(f"警告：/set {key}={raw!r} 型別不符")
                    continue
                if self.globals.get(key) != coerced:
                    self.globals[key] = coerced
                    global_changed.append(key)
            # else: 未知欄位靜默忽略（避免污染）
        return (global_changed, factory_changed)


# 全域單例（便於各模組 import）
CONFIG = Config()
