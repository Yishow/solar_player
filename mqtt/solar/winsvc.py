"""Windows Service 安裝輔助（Feature #8）。

不直接實作 pywin32 service（需額外相依套件），改提供 nssm 安裝指引 +
自動產生 install/uninstall bat，使用者只要安裝 nssm 後執行 .bat 即可。

nssm 下載：https://nssm.cc/download
"""

from __future__ import annotations

import os
import sys
from pathlib import Path


SERVICE_NAME = "EzSolarScraper"
SERVICE_DISPLAY = "EZ-Solar 發電量擷取服務"


def _python_exe() -> str:
    return sys.executable or "python.exe"


def _entry_script() -> str:
    # 使用 scrape_solar.py（與本檔共父目錄的上一層）
    # 專案結構： <root>/scrape_solar.py + <root>/solar/winsvc.py
    here = Path(__file__).resolve().parent.parent
    return str(here / "scrape_solar.py")


def print_install_guide(nssm_path: str | None = None) -> None:
    py = _python_exe()
    script = _entry_script()
    work_dir = str(Path(script).parent)
    nssm = nssm_path or "nssm.exe"

    print("=" * 60)
    print("  Windows Service 安裝指引（使用 NSSM）")
    print("=" * 60)
    print()
    print("1. 下載並放置 NSSM：")
    print("   https://nssm.cc/download → 解壓後把 nssm.exe 放到 PATH 上")
    print()
    print("2. 以系統管理員身分執行 cmd / PowerShell，貼上：")
    print()
    print(f'   {nssm} install {SERVICE_NAME} "{py}" "{script}" run')
    print(f'   {nssm} set {SERVICE_NAME} AppDirectory "{work_dir}"')
    print(f'   {nssm} set {SERVICE_NAME} DisplayName "{SERVICE_DISPLAY}"')
    print(f'   {nssm} set {SERVICE_NAME} Description "EZ-Solar 太陽能發電量擷取 + MQTT 發佈"')
    print(f"   {nssm} set {SERVICE_NAME} AppStdout \"{work_dir}\\solar.log\"")
    print(f"   {nssm} set {SERVICE_NAME} AppStderr \"{work_dir}\\solar.err.log\"")
    print(f"   {nssm} set {SERVICE_NAME} Start SERVICE_AUTO_START")
    print()
    print("3. 啟動：")
    print(f"   net start {SERVICE_NAME}")
    print(f"   sc query {SERVICE_NAME}")
    print()
    print("4. 停止 / 解除安裝：")
    print(f"   net stop {SERVICE_NAME}")
    print(f"   {nssm} remove {SERVICE_NAME} confirm")
    print()
    print("5. 或使用自動產生的腳本（見下方）")
    print()


def write_install_scripts(
    out_dir: str | None = None,
    nssm_path: str | None = None,
) -> tuple[str, str]:
    py = _python_exe()
    script = _entry_script()
    work_dir = str(Path(script).parent)
    nssm = nssm_path or "nssm.exe"

    out = Path(out_dir) if out_dir else Path(work_dir)
    out.mkdir(parents=True, exist_ok=True)

    install_bat = out / "install_service.bat"
    uninstall_bat = out / "uninstall_service.bat"

    install_content = (
        "@echo off\r\n"
        "REM 需以系統管理員身分執行\r\n"
        f'"{nssm}" install {SERVICE_NAME} "{py}" "{script}" run\r\n'
        f'"{nssm}" set {SERVICE_NAME} AppDirectory "{work_dir}"\r\n'
        f'"{nssm}" set {SERVICE_NAME} DisplayName "{SERVICE_DISPLAY}"\r\n'
        f'"{nssm}" set {SERVICE_NAME} Description "EZ-Solar 太陽能發電量擷取 + MQTT 發佈"\r\n'
        f'"{nssm}" set {SERVICE_NAME} AppStdout "{work_dir}\\solar.log"\r\n'
        f'"{nssm}" set {SERVICE_NAME} AppStderr "{work_dir}\\solar.err.log"\r\n'
        f'"{nssm}" set {SERVICE_NAME} Start SERVICE_AUTO_START\r\n'
        f"net start {SERVICE_NAME}\r\n"
        "pause\r\n"
    )
    uninstall_content = (
        "@echo off\r\n"
        f"net stop {SERVICE_NAME}\r\n"
        f'"{nssm}" remove {SERVICE_NAME} confirm\r\n'
        "pause\r\n"
    )

    install_bat.write_text(install_content, encoding="utf-8")
    uninstall_bat.write_text(uninstall_content, encoding="utf-8")

    print(f"已寫出：{install_bat}")
    print(f"已寫出：{uninstall_bat}")
    return str(install_bat), str(uninstall_bat)
