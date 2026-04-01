FROM python:3.12-slim

WORKDIR /app

# 使用阿里云镜像源（解决国内服务器网络问题）
RUN sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources

# 系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc default-libmysqlclient-dev pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple/ -r requirements.txt

COPY . .

EXPOSE 5000

# Gunicorn 启动：4 worker, 绑定 0.0.0.0:5000
CMD ["gunicorn", "wsgi:app", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "--access-logfile", "-"]
