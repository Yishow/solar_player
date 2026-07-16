"""EZ-Solar 登入 + API 擷取。每個廠一個 Scraper 實例。"""

from __future__ import annotations

from typing import Any

import requests
from bs4 import BeautifulSoup


def _to_float(v: Any) -> float | None:
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


class Scraper:
    """單廠擷取器。封裝 session + zone serial 映射。"""

    def __init__(
        self,
        factory_id: str,
        base_url: str,
        login_user: str,
        login_pass: str,
    ) -> None:
        self.factory_id = factory_id
        self.base_url = base_url.rstrip("/")
        self.login_user = login_user
        self.login_pass = login_pass
        self.session: requests.Session | None = None
        self._zone_serial_map: dict[str, int] = {}
        self._next_zone_id: int = 1

    # ── 更新登入資訊（/set 變更後呼叫） ──
    def update_credentials(
        self,
        base_url: str,
        login_user: str,
        login_pass: str,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.login_user = login_user
        self.login_pass = login_pass
        self.session = None  # 強制下一輪重新登入

    # ── 穩定 zone id ──
    def _stable_zone_id(self, serial: str, fallback_idx: int) -> int:
        key = (serial or "").strip() or f"__pos_{fallback_idx}"
        if key not in self._zone_serial_map:
            self._zone_serial_map[key] = self._next_zone_id
            self._next_zone_id += 1
        return self._zone_serial_map[key]

    # ── 登入 ──
    def login(self) -> requests.Session:
        login_url = f"{self.base_url}/default.aspx"
        print(f"[{self.factory_id}] 登入中... {self.base_url}")

        s = requests.Session()
        s.headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0 Safari/537.36"
                ),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
            }
        )

        r = s.get(login_url, timeout=10)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")

        form = soup.find("form") or soup
        form_fields: list[tuple[str, str]] = []
        for tag in form.find_all("input"):
            name = tag.get("name")
            if not name:
                continue
            itype = (tag.get("type") or "text").lower()
            if itype == "submit" and name != "defbtn1":
                continue
            value = tag.get("value", "")
            if name == "deftxt1":
                value = self.login_user
            elif name == "deftxt2":
                value = self.login_pass
            form_fields.append((name, value))

        names = {n for n, _ in form_fields}
        if "deftxt1" not in names:
            form_fields.append(("deftxt1", self.login_user))
        if "deftxt2" not in names:
            form_fields.append(("deftxt2", self.login_pass))
        if "defbtn1" not in names:
            form_fields.append(("defbtn1", "登入"))

        headers = {
            "Referer": login_url,
            "Origin": self.base_url,
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        }
        r = s.post(login_url, data=form_fields, headers=headers, timeout=10, allow_redirects=True)

        if r.status_code >= 400:
            self._dump_debug(r, f"debug_login_fail_{self.factory_id}.html")
            r.raise_for_status()

        if 'id="deftxt1"' in r.text or 'name="deftxt1"' in r.text:
            self._dump_debug(r, f"debug_login_fail_{self.factory_id}.html")
            raise RuntimeError(f"[{self.factory_id}] 登入失敗：仍停留在登入頁")

        print(f"[{self.factory_id}] 登入完成（最終 URL：{r.url}）")
        self.session = s
        return s

    @staticmethod
    def _dump_debug(r: requests.Response, path: str) -> None:
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write(f"<!-- status={r.status_code} url={r.url} -->\n")
                f.write(r.text)
            print(f"已寫出 {path}")
        except Exception:
            pass

    # ── API ──
    def _api_post(self, payload_id: str) -> list[dict]:
        assert self.session is not None
        url = f"{self.base_url}/api/s_json.ashx"
        r = self.session.post(url, data={"id": payload_id}, timeout=10)
        r.raise_for_status()
        data = r.json()
        if not isinstance(data, list):
            raise ValueError(f"API {payload_id} 回傳非陣列: {type(data).__name__}")
        return data

    def fetch_summary(self) -> dict:
        data = self._api_post("00_00")
        if not data:
            return {"total_power_kw": None, "today_mwh": None, "month_mwh": None}
        d = data[0]
        return {
            "total_power_kw": _to_float(d.get("x0")),
            "today_mwh":      _to_float(d.get("x1")),
            "month_mwh":      _to_float(d.get("x2")),
        }

    def fetch_zones(self) -> list[dict]:
        data = self._api_post("00_02")
        zones: list[dict] = []
        for idx, d in enumerate(data, start=1):
            today_kwh = _to_float(d.get("x5"))
            capacity_kwp = _to_float(d.get("x12"))
            today_hours = None
            if today_kwh is not None and capacity_kwp and capacity_kwp > 0:
                today_hours = round(today_kwh / capacity_kwp, 2)
            serial = str(d.get("x8") or "").strip()
            zones.append(
                {
                    "zone_id":      self._stable_zone_id(serial, idx),
                    "serial":       serial,
                    "position":     idx,
                    "name":         (d.get("x0") or "").strip(),
                    "power_kw":     _to_float(d.get("x4")),
                    "today_kwh":    today_kwh,
                    "month_mwh":    _to_float(d.get("x6")),
                    "total_mwh":    _to_float(d.get("x7")),
                    "capacity_kwp": capacity_kwp,
                    "today_hours":  today_hours,
                }
            )
        return zones

    # ── 一次性擷取（自動登入） ──
    def fetch(self) -> tuple[dict, list[dict]]:
        if self.session is None:
            self.login()
        return self.fetch_summary(), self.fetch_zones()
