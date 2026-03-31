import os
from urllib.parse import quote_plus


class Config:
    """
    Flask 配置类。

    你可以把它理解为：把“写死在代码里的参数”集中放到一个地方，并允许用环境变量覆盖。
    本项目主要用这些环境变量（.env 或系统环境变量均可）：

    - SECRET_KEY：Flask 内部会用到的密钥（例如 session/cookie 签名）
    - JWT_SECRET_KEY：JWT 的签名密钥（不填就沿用 SECRET_KEY）
    - DATABASE_URL：数据库连接串，默认 SQLite，便于本地直接跑
      - SQLite: sqlite:///app.db
      - MySQL: mysql+pymysql://user:password@127.0.0.1:3306/dbname?charset=utf8mb4
    - CORS_ORIGINS：允许跨域访问 API 的前端域名列表（逗号分隔）
    """
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    def _build_database_uri() -> str:
        """
        生成 SQLAlchemy 连接串（优先级从高到低）：
        1) DATABASE_URL：你显式指定的完整连接串（最推荐）
        2) MYSQL_*：用 host/port/user/password/db 组合成 MySQL 连接串
        3) 默认 SQLite：sqlite:///app.db（便于“开箱即跑”）
        """
        explicit = os.getenv("DATABASE_URL")
        if explicit:
            return explicit

        mysql_host = os.getenv("MYSQL_HOST")
        mysql_user = os.getenv("MYSQL_USER")
        mysql_password = os.getenv("MYSQL_PASSWORD")
        mysql_db = os.getenv("MYSQL_DB")
        mysql_port = os.getenv("MYSQL_PORT", "3306")

        if mysql_host and mysql_user and mysql_password and mysql_db:
            user = quote_plus(mysql_user)
            pwd = quote_plus(mysql_password)
            db = quote_plus(mysql_db)
            host = mysql_host.strip()
            port = str(mysql_port).strip()
            return f"mysql+pymysql://{user}:{pwd}@{host}:{port}/{db}?charset=utf8mb4"

        return "sqlite:///app.db"

    # SQLAlchemy 连接串：支持 DATABASE_URL 或 MYSQL_*，否则使用 SQLite
    SQLALCHEMY_DATABASE_URI = _build_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # 企业级扩展配置
    REDIS_URL = os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/0")
    ELASTICSEARCH_URL = os.environ.get("ELASTICSEARCH_URL", "http://127.0.0.1:9200")
    
    # 邮件服务
    MAIL_SERVER = os.environ.get("MAIL_SERVER")
    MAIL_PORT = int(os.environ.get("MAIL_PORT", 465))
    MAIL_USE_SSL = os.environ.get("MAIL_USE_SSL", "true").lower() in ["true", "1", "yes"]
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME")
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = os.environ.get("MAIL_DEFAULT_SENDER")
    
    # CDN / OSS 配置
    CDN_DOMAIN = os.environ.get("CDN_DOMAIN")
    OSS_ACCESS_KEY_ID = os.environ.get("OSS_ACCESS_KEY_ID")
    OSS_ACCESS_KEY_SECRET = os.environ.get("OSS_ACCESS_KEY_SECRET")
    OSS_BUCKET_NAME = os.environ.get("OSS_BUCKET_NAME")
    # JWT_SECRET_KEY 用于 JWT token 的签名与校验；和 SECRET_KEY 分开会更安全
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    # 允许跨域的前端地址（逗号分隔）。如果你用 NestJS 做同域代理，CORS 可以不必启用。
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"
        ).split(",")
        if origin.strip()
    ]
