from app import create_app

# WSGI 入口：
# - 用于生产部署时给 gunicorn/uwsgi 等 WSGI Server 加载
# - 本地开发你通常会跑 manage.py
app = create_app()
