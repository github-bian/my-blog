#!/usr/bin/env bash
# ============================================================
#  一键部署脚本 — 将项目部署到远程服务器
#  用法: bash deploy/deploy.sh
# ============================================================
set -euo pipefail

SERVER_IP="47.116.213.118"
SERVER_USER="root"
SERVER_PASS="Bian2580@"
REMOTE_DIR="/opt/blog"
export SSHPASS="$SERVER_PASS"
SSH_CMD="sshpass -e ssh -o StrictHostKeyChecking=no"
SCP_CMD="sshpass -e scp -o StrictHostKeyChecking=no"

echo "========================================="
echo "  博客项目部署脚本"
echo "  目标: ${SERVER_USER}@${SERVER_IP}"
echo "  远程目录: ${REMOTE_DIR}"
echo "========================================="

# 1) 在远程服务器上创建目录
echo ""
echo "[1/5] 创建远程目录..."
${SSH_CMD} ${SERVER_USER}@${SERVER_IP} "mkdir -p ${REMOTE_DIR}"

# 2) 同步项目文件（排除不需要的目录）
echo ""
echo "[2/5] 同步项目文件到服务器..."
rsync -avz --progress -e "sshpass -e ssh -o StrictHostKeyChecking=no" \
  --exclude='node_modules' \
  --exclude='.venv' \
  --exclude='__pycache__' \
  --exclude='.git' \
  --exclude='instance' \
  --exclude='*.pyc' \
  --exclude='frontend/client/dist' \
  --exclude='frontend/client/node_modules' \
  --exclude='frontend/node_modules' \
  ./ ${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/

# 3) 复制生产环境变量
echo ""
echo "[3/5] 复制环境变量文件..."
${SCP_CMD} deploy/.env.production ${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/.env

# 4) 在远程服务器上构建 & 启动
echo ""
echo "[4/5] 在远程服务器上构建并启动 Docker 容器..."
${SSH_CMD} ${SERVER_USER}@${SERVER_IP} << 'REMOTE_SCRIPT'
set -euo pipefail
cd /opt/blog

# 确保 Docker 和 Docker Compose 可用
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，正在安装..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# 停止旧容器（如有）
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# 构建并启动（清除缓存确保依赖更新）
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "等待服务启动..."
sleep 10

# 检查容器状态
docker compose -f docker-compose.prod.yml ps
REMOTE_SCRIPT

# 5) 健康检查
echo ""
echo "[5/5] 健康检查..."
sleep 5

if curl -sS --connect-timeout 10 "http://${SERVER_IP}/health" | grep -q '"ok"'; then
    echo "✅ 后端 API 健康检查通过"
else
    echo "⚠️  后端 API 尚未就绪（可能还在初始化数据库，请稍后重试）"
fi

if curl -sS --connect-timeout 10 "http://${SERVER_IP}/" | grep -q 'root'; then
    echo "✅ 前端页面可访问"
else
    echo "⚠️  前端页面尚未就绪"
fi

echo ""
echo "========================================="
echo "  部署完成！"
echo "  前端: http://${SERVER_IP}"
echo "  API:  http://${SERVER_IP}/api/v1/"
echo "========================================="
