import os

import sentry_sdk
from flask import Flask, jsonify
from dotenv import load_dotenv

from .api import create_api_v1_blueprint
from .config import Config
from .docs import register_docs
from .extensions import cors, db, jwt, migrate


def create_app() -> Flask:
    """
    Flask “应用工厂”。

    为什么要用工厂函数？
    - 便于测试：测试时可以创建多个 app 实例，互不影响
    - 便于配置：可以在创建时按环境加载不同配置
    - 便于扩展：初始化数据库/JWT/CORS 等扩展时更清晰

    本项目的启动顺序（你可以把它当成“后端启动流程”来理解）：
    1) 读取 .env（可选） -> 让 os.getenv 能取到本地配置
    2) 创建 Flask app，并加载 Config 配置类
    3) 初始化扩展：SQLAlchemy / Migrate / JWT / CORS
    4) 注册 API 蓝图：所有 /api/v1/... 路由都从这里挂载进来
    5) 额外提供一个 /health 健康检查
    """
    load_dotenv()

    # Sentry 初始化（需要在 Flask app 创建之前）
    sentry_dsn = os.getenv("SENTRY_DSN")
    if sentry_dsn:
        sentry_sdk.init(
            dsn=sentry_dsn,
            traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.2")),
            profiles_sample_rate=float(os.getenv("SENTRY_PROFILES_SAMPLE_RATE", "0.1")),
            environment=os.getenv("SENTRY_ENVIRONMENT", "production"),
            send_default_pii=False,
        )

    app = Flask(__name__)
    app.config.from_object(Config)

    # 扩展初始化：这些对象在 app/extensions.py 里统一创建，这里负责“绑定到当前 app”
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(
        app,
        # 只对 API 路由启用 CORS（如果你用 NestJS 做同域代理，一般就不需要 CORS）
        resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", [])}},
        supports_credentials=False,
    )

    # 便于学习/本地快速跑起来：当使用 SQLite 时（DATABASE_URL 默认 sqlite:///app.db），
    # 自动创建表结构，避免你第一天学习就卡在迁移命令上。
    #
    # 注意：
    # - 生产环境建议用 Flask-Migrate(Alembic) 来管理数据库迁移，而不是 create_all()
    # - 默认只在 SQLite 且 AUTO_CREATE_DB=1 时才会执行
    # - 如果你想在 MySQL/PostgreSQL 也“自动建表”，需要额外设置 ALLOW_CREATE_ALL=1
    db_uri = app.config.get("SQLALCHEMY_DATABASE_URI", "")
    auto_create = os.getenv("AUTO_CREATE_DB", "1") == "1"
    allow_create_all = os.getenv("ALLOW_CREATE_ALL", "0") == "1"
    should_create = (
        isinstance(db_uri, str)
        and auto_create
        and (db_uri.startswith("sqlite") or allow_create_all)
    )
    if should_create:
        with app.app_context():
            # 必须先 import models，让 SQLAlchemy “看到”模型类，从而知道要创建哪些表
            from . import models

            db.create_all()

    # /api/v1 下的所有路由，都在 app/api 目录里实现并注册
    app.register_blueprint(create_api_v1_blueprint())
    register_docs(app)

    @app.get("/health")
    def health():
        # 典型用途：容器/反向代理/监控系统探活
        return jsonify({"ok": True})

    return app
