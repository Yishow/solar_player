"""異常偵測（Feature #5）。

規則：
- 白天時段（由 schedule.is_daytime 判斷），若總功率為 0 或 None 持續超過
  `daytime_zero_minutes` 分鐘，視為異常。
- 單區功率為 0 持續超過門檻，逐區觸發。
- 觸發後每次持續仍為 0 不重複 alert（僅首次），恢復後才會 reset。
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Callable


@dataclass
class _ZeroWindow:
    start: datetime | None = None
    fired: bool = False

    def update(self, is_zero: bool, now: datetime, threshold: timedelta) -> str:
        """回傳事件：'start', 'fire', 'recover', 'none'。"""
        if is_zero:
            if self.start is None:
                self.start = now
                self.fired = False
                return "start"
            if not self.fired and (now - self.start) >= threshold:
                self.fired = True
                return "fire"
            return "none"
        # 非零 → 恢復
        if self.start is not None:
            event = "recover" if self.fired else "none"
            self.start = None
            self.fired = False
            return event
        return "none"


@dataclass
class AnomalyDetector:
    daytime_zero_minutes: int = 5
    on_alert: Callable[[str, str, str], None] | None = None  # (factory, level, msg)

    _factory_windows: dict[str, _ZeroWindow] = field(default_factory=dict)
    _zone_windows: dict[tuple[str, int], _ZeroWindow] = field(default_factory=dict)

    def check(
        self,
        factory_id: str,
        summary: dict,
        zones: list[dict],
        is_daytime: bool,
        now: datetime | None = None,
    ) -> None:
        now = now or datetime.now()
        threshold = timedelta(minutes=self.daytime_zero_minutes)

        if not is_daytime:
            # 夜間 reset
            self._factory_windows.pop(factory_id, None)
            for k in [k for k in self._zone_windows if k[0] == factory_id]:
                self._zone_windows.pop(k, None)
            return

        # 全廠
        total = summary.get("total_power_kw")
        fw = self._factory_windows.setdefault(factory_id, _ZeroWindow())
        ev = fw.update(_is_zero(total), now, threshold)
        self._emit(factory_id, "factory", None, ev, total, fw, threshold)

        # 各區
        for z in zones:
            zid = z["zone_id"]
            key = (factory_id, zid)
            zw = self._zone_windows.setdefault(key, _ZeroWindow())
            power = z.get("power_kw")
            ev = zw.update(_is_zero(power), now, threshold)
            self._emit(factory_id, "zone", z, ev, power, zw, threshold)

    def _emit(
        self,
        factory_id: str,
        scope: str,
        zone: dict | None,
        event: str,
        value,
        window: _ZeroWindow,
        threshold: timedelta,
    ) -> None:
        if event == "none" or self.on_alert is None:
            return
        if scope == "factory":
            target = "全廠"
        else:
            zid = zone["zone_id"] if zone else "?"
            name = (zone or {}).get("name") or ""
            target = f"Zone{zid} {name}".strip()

        if event == "fire":
            msg = f"{target} 白天連續零功率超過 {threshold.total_seconds()/60:.0f} 分鐘"
            self.on_alert(factory_id, "WARN", msg)
        elif event == "recover":
            v = f"{value:.1f} kW" if isinstance(value, (int, float)) else "有值"
            msg = f"{target} 已恢復發電（{v}）"
            self.on_alert(factory_id, "INFO", msg)


def _is_zero(v) -> bool:
    if v is None:
        return True
    try:
        return float(v) <= 0.0
    except (ValueError, TypeError):
        return True
