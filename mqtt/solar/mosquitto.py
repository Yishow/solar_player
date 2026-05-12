"""以 subprocess 啟動本機 mosquitto（隱藏視窗）。"""

from __future__ import annotations

import os
import socket
import subprocess
import time


def port_in_use(host: str, port: int, timeout: float = 1.0) -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(timeout)
            return sock.connect_ex((host, port)) == 0
    except Exception:
        return False


class MosquittoRunner:
    def __init__(self) -> None:
        self._proc: subprocess.Popen | None = None

    def start(
        self,
        path: str,
        config: str,
        host: str,
        port: int,
    ) -> None:
        if not (path or "").strip():
            return
        if self._proc is not None and self._proc.poll() is None:
            return  # already running
        if not os.path.isfile(path):
            print(f"警告：找不到 mosquitto 執行檔 {path}，略過自動啟動")
            return

        probe_host = "127.0.0.1" if host in ("localhost", "0.0.0.0") else host
        if port_in_use(probe_host, port):
            print(f"MQTT port {port} 已被佔用，沿用現有 broker（略過自動啟動）")
            return

        args = [path]
        conf = (config or "").strip()
        if conf:
            if not os.path.isfile(conf):
                print(f"警告：找不到 mosquitto_config {conf}，改用預設設定")
            else:
                args += ["-c", conf]

        print(f"啟動 mosquitto: {' '.join(args)}")
        creationflags = 0
        if os.name == "nt":
            creationflags = subprocess.CREATE_NO_WINDOW | subprocess.CREATE_NEW_PROCESS_GROUP
        try:
            self._proc = subprocess.Popen(
                args,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                stdin=subprocess.DEVNULL,
                creationflags=creationflags,
            )
        except Exception as e:
            print(f"啟動 mosquitto 失敗：{e}")
            self._proc = None
            return

        for _ in range(20):
            if self._proc.poll() is not None:
                print(f"mosquitto 意外結束，exit code={self._proc.returncode}")
                self._proc = None
                return
            if port_in_use(probe_host, port):
                print(f"mosquitto 已監聽 {host}:{port}")
                return
            time.sleep(0.2)
        print(f"警告：mosquitto 啟動後 4 秒內仍未監聽 {host}:{port}")

    def stop(self) -> None:
        if self._proc is None:
            return
        if self._proc.poll() is not None:
            self._proc = None
            return
        print("停止 mosquitto...")
        try:
            self._proc.terminate()
            self._proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self._proc.kill()
            try:
                self._proc.wait(timeout=2)
            except Exception:
                pass
        except Exception as e:
            print(f"停止 mosquitto 失敗：{e}")
        self._proc = None
