"""終端輸出（中文寬度對齊、安全格式化、結果列印）。"""

from __future__ import annotations

from datetime import datetime
from typing import Any


def fmt(v: Any, spec: str, dash: str = "   -  ") -> str:
    if v is None:
        return dash
    try:
        return format(v, spec)
    except (ValueError, TypeError):
        return dash


def display_width(s: str) -> int:
    width = 0
    for ch in s:
        code = ord(ch)
        if (
            0x1100 <= code <= 0x115F
            or 0x2E80 <= code <= 0x303E
            or 0x3041 <= code <= 0x33FF
            or 0x3400 <= code <= 0x4DBF
            or 0x4E00 <= code <= 0x9FFF
            or 0xA000 <= code <= 0xA4CF
            or 0xAC00 <= code <= 0xD7A3
            or 0xF900 <= code <= 0xFAFF
            or 0xFE30 <= code <= 0xFE4F
            or 0xFF00 <= code <= 0xFF60
            or 0xFFE0 <= code <= 0xFFE6
        ):
            width += 2
        else:
            width += 1
    return width


def pad_display(s: str, width: int) -> str:
    w = 0
    out: list[str] = []
    for ch in s:
        cw = 2 if display_width(ch) == 2 else 1
        if w + cw > width:
            break
        out.append(ch)
        w += cw
    return "".join(out) + " " * max(0, width - w)


def print_result(
    factory: str,
    summary: dict,
    zones: list[dict],
    mqtt_ok: bool,
    prefix: str,
    mqtt_host: str,
    mqtt_port: int,
) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print("")
    print("=" * 60)
    print(f"  {factory} {ts}")
    print("-" * 60)
    print(
        f"  總功率: {fmt(summary.get('total_power_kw'), '.1f')} kW  |  "
        f"今日: {fmt(summary.get('today_mwh'), '.2f')} MWh  |  "
        f"本月: {fmt(summary.get('month_mwh'), '.2f')} MWh"
    )
    print("-" * 60)
    for z in zones:
        print(
            f"  Zone{z['zone_id']:<2} {pad_display(z['name'], 16)}  "
            f"{fmt(z.get('power_kw'), '7.1f')} kW  |  "
            f"今日: {fmt(z.get('today_kwh'), '7.1f')} kWh  |  "
            f"本月: {fmt(z.get('month_mwh'), '.2f')} MWh"
        )
    print("-" * 60)
    print(f"  MQTT: {'OK' if mqtt_ok else 'FAIL'}   prefix={prefix}/{factory}")
    print("-" * 60)
    print(f"    → {prefix}/{factory}/summary          (JSON) total_power_kw, today_mwh, month_mwh")
    print(f"    → {prefix}/{factory}/total_power_kw   {fmt(summary.get('total_power_kw'), '.1f')} kW")
    print(f"    → {prefix}/{factory}/today_mwh        {fmt(summary.get('today_mwh'), '.2f')} MWh")
    print(f"    → {prefix}/{factory}/month_mwh        {fmt(summary.get('month_mwh'), '.2f')} MWh")
    print(f"    → {prefix}/{factory}/status           (JSON) running / stopped / paused")
    print(f"    → {prefix}/{factory}/heartbeat        (JSON) 每 N 秒")
    print(f"    → {prefix}/{factory}/alert            (JSON) 異常通知")
    print(f"    ← {prefix}/{factory}/config           (JSON) 查詢設定")
    print(f"    ← {prefix}/{factory}/set              (JSON) 修改設定 / 重啟")
    for z in zones:
        zid = z["zone_id"]
        print(f"    → {prefix}/{factory}/zone/{zid}                (JSON) 整包欄位")
        print(f"    → {prefix}/{factory}/zone/{zid}/power_kw       {fmt(z.get('power_kw'), '.1f')} kW  ({z['name']})")
        print(f"    → {prefix}/{factory}/zone/{zid}/today_kwh      {fmt(z.get('today_kwh'), '.1f')} kWh")
        print(f"    → {prefix}/{factory}/zone/{zid}/month_mwh      {fmt(z.get('month_mwh'), '.2f')} MWh")
        print(f"    → {prefix}/{factory}/zone/{zid}/total_mwh      {fmt(z.get('total_mwh'), '.2f')} MWh")
        print(f"    → {prefix}/{factory}/zone/{zid}/capacity_kwp   {fmt(z.get('capacity_kwp'), '.1f')} kWp")
        print(f"    → {prefix}/{factory}/zone/{zid}/today_hours    {fmt(z.get('today_hours'), '.2f')} h")
    print("-" * 60)
    print(f"  快速訂閱全部：  mosquitto_sub -h {mqtt_host} -p {mqtt_port} -v -t '{prefix}/{factory}/#'")
    print("=" * 60)
