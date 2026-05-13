"""Home Assistant MQTT Discovery（Feature #2）。

發佈 `homeassistant/sensor/<object_id>/config` 的 retained JSON，HA 自動建立感測器。
摘要：每廠 3 個（總功率、今日、本月）
各區：每區 6 個（功率、今日、本月、累計、容量、有效時數）

設計原則：
- 一次性在啟動（或 zone 清單首次獲得）後發佈，重複發也沒關係（HA 會覆蓋）
- value_template 從 {prefix}/{factory}/... 的 JSON payload 取 value 欄位
- unique_id 用 factory + zone_id + metric，跨廠不衝突
- device 分組：每廠一個 device
"""

from __future__ import annotations

import json
from typing import Callable

PublishFn = Callable[[str, str, bool], bool]  # (topic, payload, retain)


def _device(factory_id: str) -> dict:
    return {
        "identifiers": [f"ez_solar_{factory_id}"],
        "name": f"EZ-Solar {factory_id}",
        "manufacturer": "Joseph-Tech / 國瑞汽車",
        "model": "EZ-Solar Dashboard",
    }


def _sensor_config(
    *,
    factory_id: str,
    object_id: str,
    name: str,
    state_topic: str,
    unit: str | None,
    device_class: str | None,
    state_class: str | None = "measurement",
    value_template: str = "{{ value_json.value }}",
    icon: str | None = None,
) -> dict:
    cfg: dict = {
        "name": name,
        "unique_id": object_id,
        "object_id": object_id,
        "state_topic": state_topic,
        "value_template": value_template,
        "device": _device(factory_id),
    }
    if unit:
        cfg["unit_of_measurement"] = unit
    if device_class:
        cfg["device_class"] = device_class
    if state_class:
        cfg["state_class"] = state_class
    if icon:
        cfg["icon"] = icon
    return cfg


def publish_factory_discovery(
    publish: PublishFn,
    *,
    ha_prefix: str,
    prefix: str,
    factory_id: str,
    zones: list[dict],
) -> None:
    base = f"{prefix}/{factory_id}"

    entries: list[tuple[str, dict]] = []

    # Summary
    entries.append(
        (
            f"ez_solar_{factory_id}_total_power",
            _sensor_config(
                factory_id=factory_id,
                object_id=f"ez_solar_{factory_id}_total_power",
                name=f"{factory_id} 總功率",
                state_topic=f"{base}/total_power_kw",
                unit="kW",
                device_class="power",
            ),
        )
    )
    entries.append(
        (
            f"ez_solar_{factory_id}_today_energy",
            _sensor_config(
                factory_id=factory_id,
                object_id=f"ez_solar_{factory_id}_today_energy",
                name=f"{factory_id} 今日發電",
                state_topic=f"{base}/today_mwh",
                unit="MWh",
                device_class="energy",
                state_class="total_increasing",
            ),
        )
    )
    entries.append(
        (
            f"ez_solar_{factory_id}_month_energy",
            _sensor_config(
                factory_id=factory_id,
                object_id=f"ez_solar_{factory_id}_month_energy",
                name=f"{factory_id} 本月發電",
                state_topic=f"{base}/month_mwh",
                unit="MWh",
                device_class="energy",
                state_class="total_increasing",
            ),
        )
    )

    # Per-zone
    for z in zones:
        zid = z["zone_id"]
        zname = z.get("name") or f"Zone{zid}"
        ztopic = f"{base}/zone/{zid}"
        obj_prefix = f"ez_solar_{factory_id}_zone{zid}"

        metrics = [
            ("power", "功率", "power_kw", "kW", "power", "measurement"),
            ("today", "今日發電", "today_kwh", "kWh", "energy", "total_increasing"),
            ("month", "本月發電", "month_mwh", "MWh", "energy", "total_increasing"),
            ("total", "累計發電", "total_mwh", "MWh", "energy", "total_increasing"),
            ("capacity", "裝置容量", "capacity_kwp", "kWp", None, "measurement"),
            ("hours", "今日有效時數", "today_hours", "h", None, "measurement"),
        ]
        for suffix, zh, topic_key, unit, dev_cls, state_cls in metrics:
            entries.append(
                (
                    f"{obj_prefix}_{suffix}",
                    _sensor_config(
                        factory_id=factory_id,
                        object_id=f"{obj_prefix}_{suffix}",
                        name=f"{factory_id} {zname} {zh}",
                        state_topic=f"{ztopic}/{topic_key}",
                        unit=unit,
                        device_class=dev_cls,
                        state_class=state_cls,
                    ),
                )
            )

    for object_id, cfg in entries:
        topic = f"{ha_prefix}/sensor/{object_id}/config"
        publish(topic, json.dumps(cfg, ensure_ascii=False), True)

    print(f"[{factory_id}] HA Discovery 已發佈 {len(entries)} 個 entity")


def remove_factory_discovery(
    publish: PublishFn,
    *,
    ha_prefix: str,
    factory_id: str,
    zone_ids: list[int],
) -> None:
    """清除該廠所有 discovery（發空 payload 給 HA 會自動移除 entity）。"""
    ids = [
        f"ez_solar_{factory_id}_total_power",
        f"ez_solar_{factory_id}_today_energy",
        f"ez_solar_{factory_id}_month_energy",
    ]
    for zid in zone_ids:
        for suffix in ("power", "today", "month", "total", "capacity", "hours"):
            ids.append(f"ez_solar_{factory_id}_zone{zid}_{suffix}")
    for object_id in ids:
        publish(f"{ha_prefix}/sensor/{object_id}/config", "", True)
