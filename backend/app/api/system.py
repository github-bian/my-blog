from __future__ import annotations

import platform

import psutil
from flask import Blueprint, current_app, jsonify
from sqlalchemy.engine.url import make_url

system_bp = Blueprint("system", __name__, url_prefix="/system")


def _memory_payload() -> dict:
    vm = psutil.virtual_memory()
    return {
        "totalBytes": int(vm.total),
        "usedBytes": int(vm.used),
        "availableBytes": int(vm.available),
        "percent": float(vm.percent),
    }


@system_bp.get("/stats")
def system_stats():
    """系统统计（本地开发时通常就是当前设备）。"""
    cpu_percent = psutil.cpu_percent(interval=0.1)

    return jsonify(
        {
            "system": {
                "platform": platform.system(),
                "release": platform.release(),
                "machine": platform.machine(),
                "cpuCoresLogical": psutil.cpu_count(logical=True),
                "cpuCoresPhysical": psutil.cpu_count(logical=False),
                "cpuPercent": float(cpu_percent),
                "memory": _memory_payload(),
            }
        }
    )


@system_bp.get("/db")
def db_info():
    """
    返回后端当前实际连接的数据库信息（脱敏）。

    典型用途：
    - 排查“我以为在写 MySQL，但实际还在写 SQLite”的问题
    - 排查前端代理是否转发到了你期望的后端实例/端口
    """
    uri = current_app.config.get("SQLALCHEMY_DATABASE_URI", "")
    try:
        url = make_url(uri)
        payload = {
            "dialect": url.get_backend_name(),
            "driver": url.get_driver_name(),
            "host": url.host,
            "port": url.port,
            "database": url.database,
            "username": url.username,
        }
    except Exception:
        payload = {"dialect": "unknown", "raw": str(uri)[:80]}

    if payload.get("dialect") == "sqlite":
        payload["file"] = payload.get("database")

    return jsonify({"db": payload})
