"""EZ-Solar 發電量擷取服務 CLI。

用法：
  python scrape_solar.py run                 # 循環執行（預設）
  python scrape_solar.py once                # 每廠各跑一輪
  python scrape_solar.py test-login [FACTORY_ID]
  python scrape_solar.py test-mqtt
  python scrape_solar.py dump-api [FACTORY_ID]
  python scrape_solar.py history [--factory KN] [--limit 50]
  python scrape_solar.py alerts [--limit 50]
  python scrape_solar.py install-service     # 產生 nssm 安裝 .bat

依賴：
  pip install requests beautifulsoup4 paho-mqtt
"""

from __future__ import annotations

import argparse
import json
import signal
import sys
import time

sys.stdout.reconfigure(encoding="utf-8")

from solar.config import CONFIG
from solar.mosquitto import MosquittoRunner
from solar.mqtt_bus import MQTT_AVAILABLE, MqttBus
from solar.scraper import Scraper
from solar.service import FactoryServiceManager
from solar.storage import Storage, print_history
from solar.winsvc import print_install_guide, write_install_scripts


_SIGNAL_COUNT = 0


def _install_signals(stop_event) -> None:
    def handler(signum, frame):
        global _SIGNAL_COUNT
        _SIGNAL_COUNT += 1
        if _SIGNAL_COUNT >= 2:
            print("\n強制結束")
            sys.exit(130)
        print("\n停止服務...（再按一次 Ctrl+C 強制結束）")
        stop_event.set()

    signal.signal(signal.SIGINT, handler)
    signal.signal(signal.SIGTERM, handler)


# ── run ──────────────────────────────────────────────
def cmd_run() -> int:
    CONFIG.load()
    if not MQTT_AVAILABLE:
        print("錯誤：需要安裝 paho-mqtt（pip install paho-mqtt）")
        return 1

    mosquitto = MosquittoRunner()
    mosquitto.start(
        CONFIG.get("mosquitto_path", ""),
        CONFIG.get("mosquitto_config", ""),
        CONFIG.get("mqtt_host", "localhost"),
        int(CONFIG.get("mqtt_port", 1883)),
    )

    bus = MqttBus()
    ok = bus.connect(
        CONFIG.get("mqtt_host", "localhost"),
        int(CONFIG.get("mqtt_port", 1883)),
        CONFIG.get("mqtt_prefix", "solar"),
    )
    if not ok:
        print("MQTT 連線失敗，終止")
        mosquitto.stop()
        return 1
    time.sleep(1)

    storage = Storage(
        path=CONFIG.get("sqlite_path", "solar.db"),
        enabled=bool(CONFIG.get("sqlite_enabled", True)),
    )

    manager = FactoryServiceManager(bus, storage)
    _install_signals(manager.stop_event)

    print("=" * 60)
    print(f"  EZ-Solar 服務啟動")
    print(f"  Broker : {CONFIG.get('mqtt_host')}:{CONFIG.get('mqtt_port')}")
    print(f"  Prefix : {CONFIG.get('mqtt_prefix')}")
    print(f"  廠別   : {', '.join(CONFIG.factory_ids())}")
    print(f"  SQLite : {'啟用 ' + CONFIG.get('sqlite_path', '') if storage.enabled else '停用'}")
    print(f"  HA MQTT: {'啟用' if CONFIG.get('ha_discovery') else '停用'}")
    print(f"  夜間暫停: {'啟用' if CONFIG.get('night_pause') else '停用'}")
    print("  Ctrl+C 停止")
    print("=" * 60)

    try:
        manager.start_all()
        manager.wait()
    finally:
        manager.stop_all()
        bus.disconnect()
        storage.close()
        mosquitto.stop()
        print("服務已停止")
    return 0


# ── once ──────────────────────────────────────────────
def cmd_once() -> int:
    CONFIG.load()
    storage = Storage(
        path=CONFIG.get("sqlite_path", "solar.db"),
        enabled=bool(CONFIG.get("sqlite_enabled", True)),
    )
    from solar.display import print_result

    for fac in CONFIG.factories:
        fid = fac["factory_id"]
        try:
            scraper = Scraper(fid, fac["base_url"], fac["login_user"], fac["login_pass"])
            summary, zones = scraper.fetch()
            storage.record(fid, summary, zones)
            print_result(
                fid,
                summary,
                zones,
                False,
                prefix=CONFIG.get("mqtt_prefix", "solar"),
                mqtt_host=CONFIG.get("mqtt_host", "localhost"),
                mqtt_port=int(CONFIG.get("mqtt_port", 1883)),
            )
        except Exception as e:
            print(f"[{fid}] 失敗: {e}")
    storage.close()
    return 0


# ── test-login ──────────────────────────────────────────────
def cmd_test_login(factory_id: str | None) -> int:
    CONFIG.load()
    facs = CONFIG.factories
    if factory_id:
        facs = [f for f in facs if f["factory_id"] == factory_id]
        if not facs:
            print(f"找不到 factory_id={factory_id}")
            return 1
    for fac in facs:
        fid = fac["factory_id"]
        try:
            s = Scraper(fid, fac["base_url"], fac["login_user"], fac["login_pass"])
            s.login()
            print(f"[{fid}] 登入 OK")
        except Exception as e:
            print(f"[{fid}] 登入失敗：{e}")
    return 0


# ── test-mqtt ──────────────────────────────────────────────
def cmd_test_mqtt() -> int:
    CONFIG.load()
    if not MQTT_AVAILABLE:
        print("錯誤：未安裝 paho-mqtt")
        return 1
    bus = MqttBus()
    ok = bus.connect(
        CONFIG.get("mqtt_host", "localhost"),
        int(CONFIG.get("mqtt_port", 1883)),
        CONFIG.get("mqtt_prefix", "solar"),
    )
    if not ok:
        return 1
    time.sleep(1)
    topic = f"{CONFIG.get('mqtt_prefix', 'solar')}/_test"
    bus.publish_json(topic, {"ts": time.time()}, retain=False)
    print(f"已發一筆測試訊息到 {topic}")
    time.sleep(1)
    bus.disconnect()
    return 0


# ── dump-api ──────────────────────────────────────────────
def cmd_dump_api(factory_id: str | None) -> int:
    CONFIG.load()
    facs = CONFIG.factories
    if factory_id:
        facs = [f for f in facs if f["factory_id"] == factory_id]
        if not facs:
            print(f"找不到 factory_id={factory_id}")
            return 1
    for fac in facs:
        fid = fac["factory_id"]
        try:
            s = Scraper(fid, fac["base_url"], fac["login_user"], fac["login_pass"])
            s.login()
            summary = s.fetch_summary()
            zones = s.fetch_zones()
            print(f"=== [{fid}] summary ===")
            print(json.dumps(summary, ensure_ascii=False, indent=2))
            print(f"=== [{fid}] zones ({len(zones)}) ===")
            print(json.dumps(zones, ensure_ascii=False, indent=2))
        except Exception as e:
            print(f"[{fid}] 失敗: {e}")
    return 0


# ── history / alerts ──────────────────────────────────────
def cmd_history(factory_id: str | None, limit: int) -> int:
    CONFIG.load()
    storage = Storage(
        path=CONFIG.get("sqlite_path", "solar.db"),
        enabled=bool(CONFIG.get("sqlite_enabled", True)),
    )
    print_history(storage, factory_id, limit)
    storage.close()
    return 0


def cmd_alerts(limit: int) -> int:
    CONFIG.load()
    storage = Storage(
        path=CONFIG.get("sqlite_path", "solar.db"),
        enabled=bool(CONFIG.get("sqlite_enabled", True)),
    )
    rows = storage.history_alerts(limit)
    if not rows:
        print("（無 alert）")
    else:
        for r in rows:
            print(f"{r['ts']}  [{r['factory_id']}] {r['level']}: {r['message']}")
    storage.close()
    return 0


# ── install-service ──────────────────────────────────────
def cmd_install_service(nssm: str | None, write: bool) -> int:
    print_install_guide(nssm)
    if write:
        write_install_scripts(nssm_path=nssm)
    return 0


# ── main ──────────────────────────────────────────────
def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="EZ-Solar 發電量擷取")
    sub = p.add_subparsers(dest="command")

    sub.add_parser("run", help="循環執行（多廠）")
    sub.add_parser("once", help="各廠各跑一輪")

    p_tl = sub.add_parser("test-login", help="只測試登入")
    p_tl.add_argument("factory_id", nargs="?", help="指定廠別（預設全部）")

    sub.add_parser("test-mqtt", help="測試 MQTT 連線")

    p_da = sub.add_parser("dump-api", help="印出 API 原始 JSON")
    p_da.add_argument("factory_id", nargs="?", help="指定廠別（預設全部）")

    p_hist = sub.add_parser("history", help="顯示 SQLite 歷史摘要")
    p_hist.add_argument("--factory", "-f", default=None)
    p_hist.add_argument("--limit", "-n", type=int, default=50)

    p_alert = sub.add_parser("alerts", help="顯示異常告警紀錄")
    p_alert.add_argument("--limit", "-n", type=int, default=50)

    p_svc = sub.add_parser("install-service", help="產生 nssm 安裝指引 / bat")
    p_svc.add_argument("--nssm", default=None, help="nssm.exe 路徑（預設: PATH 上的 nssm.exe）")
    p_svc.add_argument("--write", action="store_true", help="同時寫出 install/uninstall bat")

    # 舊版相容：--once
    p.add_argument("--once", "-o", action="store_true", help=argparse.SUPPRESS)
    return p


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.once:
        return cmd_once()

    cmd = args.command or "run"
    if cmd == "run":
        return cmd_run()
    if cmd == "once":
        return cmd_once()
    if cmd == "test-login":
        return cmd_test_login(args.factory_id)
    if cmd == "test-mqtt":
        return cmd_test_mqtt()
    if cmd == "dump-api":
        return cmd_dump_api(args.factory_id)
    if cmd == "history":
        return cmd_history(args.factory, args.limit)
    if cmd == "alerts":
        return cmd_alerts(args.limit)
    if cmd == "install-service":
        return cmd_install_service(args.nssm, args.write)
    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
