import os

from app import create_app

# 创建 Flask app 实例（应用工厂模式）
app = create_app()

if __name__ == "__main__":
    # 这是“开发服务器”启动方式：
    # - 适合本地学习/调试
    # - 不建议用于生产环境（生产环境应使用 gunicorn/uwsgi 等 WSGI Server）
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_DEBUG") == "1")
