"""夜間暫停（Feature #4）。

零依賴的日出日落計算（NOAA 簡化版）。準確度 ±2 分鐘，對判斷白天 / 夜晚綽綽有餘。
"""

from __future__ import annotations

import math
from datetime import date, datetime, time, timedelta, timezone


def _solar_event(
    d: date,
    lat: float,
    lon: float,
    rising: bool,
    tz_offset_hours: float = 8.0,
) -> time | None:
    """回傳當地時間的日出 (rising=True) 或日落 (rising=False)。

    NOAA 簡化演算法。無日出 / 無日落的極地情況回 None。
    """
    # 儒略日
    n = d.toordinal() - date(2000, 1, 1).toordinal() + 1
    j_star = n - lon / 360.0 + (6.0 if rising else 0.0)
    j_star_rising = n - lon / 360.0  # 用於太陽黃經

    # 平近點角
    m = (357.5291 + 0.98560028 * j_star) % 360.0
    m_rad = math.radians(m)

    # 中心方程
    c = 1.9148 * math.sin(m_rad) + 0.0200 * math.sin(2 * m_rad) + 0.0003 * math.sin(3 * m_rad)

    # 黃道經度
    lam = (m + c + 180.0 + 102.9372) % 360.0
    lam_rad = math.radians(lam)

    # 太陽正中天（transit）
    j_transit = 2451545.0 + j_star_rising + 0.0053 * math.sin(m_rad) - 0.0069 * math.sin(2 * lam_rad)

    # 赤緯
    sin_delta = math.sin(lam_rad) * math.sin(math.radians(23.44))
    delta = math.asin(sin_delta)

    # 時角
    lat_rad = math.radians(lat)
    cos_h = (
        math.sin(math.radians(-0.83)) - math.sin(lat_rad) * math.sin(delta)
    ) / (math.cos(lat_rad) * math.cos(delta))
    if cos_h > 1 or cos_h < -1:
        return None
    h = math.degrees(math.acos(cos_h))

    # 日出 / 日落的儒略日
    if rising:
        j_event = j_transit - h / 360.0
    else:
        j_event = j_transit + h / 360.0

    # 轉回 UTC datetime
    unix_days = j_event - 2440587.5
    dt_utc = datetime(1970, 1, 1, tzinfo=timezone.utc) + timedelta(days=unix_days)
    dt_local = dt_utc + timedelta(hours=tz_offset_hours)
    return dt_local.time().replace(microsecond=0)


def sunrise(d: date, lat: float, lon: float, tz: float = 8.0) -> time | None:
    return _solar_event(d, lat, lon, rising=True, tz_offset_hours=tz)


def sunset(d: date, lat: float, lon: float, tz: float = 8.0) -> time | None:
    return _solar_event(d, lat, lon, rising=False, tz_offset_hours=tz)


def is_daytime(
    now: datetime,
    lat: float,
    lon: float,
    padding_min: int = 30,
    tz: float = 8.0,
) -> bool:
    """是否在「日出-padding ~ 日落+padding」之內。"""
    sr = sunrise(now.date(), lat, lon, tz)
    ss = sunset(now.date(), lat, lon, tz)
    if sr is None or ss is None:
        return True  # 無法判斷 → 保守視為白天
    sr_dt = datetime.combine(now.date(), sr) - timedelta(minutes=padding_min)
    ss_dt = datetime.combine(now.date(), ss) + timedelta(minutes=padding_min)
    return sr_dt <= now.replace(tzinfo=None) <= ss_dt


def seconds_until_sunrise(
    now: datetime,
    lat: float,
    lon: float,
    padding_min: int = 30,
    tz: float = 8.0,
) -> int:
    """回傳距離下個日出-padding 還有幾秒（夜間暫停時用）。最少 60。"""
    # 今天 or 明天的日出
    today = now.date()
    for offset in (0, 1):
        d = today + timedelta(days=offset)
        sr = sunrise(d, lat, lon, tz)
        if sr is None:
            continue
        target = datetime.combine(d, sr) - timedelta(minutes=padding_min)
        delta = (target - now.replace(tzinfo=None)).total_seconds()
        if delta > 0:
            return max(60, int(delta))
    return 3600  # 極區備援
