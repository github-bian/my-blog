#!/bin/bash

# 遇到错误立即停止
set -e

# 定义颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 开始一键部署 My Blog 系统 (Vercel + Render)...${NC}"
echo "=================================================="

# 检查 npx 是否可用
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ 未找到 npx 命令。请确保已安装 Node.js。${NC}"
    exit 1
fi

# ==========================================
# 1. 部署前端 (Vercel)
# ==========================================
echo -e "\n${YELLOW}🎨 [1/2] 正在部署前端到 Vercel...${NC}"

cd frontend
# 执行 Vercel 部署
# --prod 表示部署到生产环境
echo -e "${YELLOW}如果是首次运行，请按照提示输入 'Y' 确认各项配置。${NC}"

# 使用 pipefail 确保我们能捕获 vercel 的退出代码，但同时尝试捕获输出
# 注意：vercel deploy 输出 URL 到 stdout，其他信息到 stderr
FRONTEND_URL=$(npx -y vercel deploy --prod)

echo -e "${GREEN}✅ 前端部署成功！${NC}"
echo -e "前端访问地址: ${GREEN}$FRONTEND_URL${NC}"
cd ..

# ==========================================
# 2. 准备后端部署 (Render)
# ==========================================
echo -e "\n${YELLOW}📦 [2/2] 正在准备后端代码 (推送到 GitHub)...${NC}"

# 确保所有更改都已提交
if [[ -n $(git status -s) ]]; then
    echo "发现未提交的更改，正在自动提交..."
    git add .
    git commit -m "chore: prepare for render deployment"
    git push
    echo -e "${GREEN}✅ 代码已推送到 GitHub。${NC}"
else
    echo -e "${GREEN}✅ 代码已是最新状态。${NC}"
fi

echo "=================================================="
echo -e "${GREEN}🎉 准备工作已完成！接下来请按照以下步骤在 Render 上完成后端部署：${NC}"
echo "=================================================="
echo -e "1. 打开 Render 仪表盘: ${GREEN}https://dashboard.render.com/blueprints/new${NC}"
echo -e "2. 点击 'New Blueprint Instance' 按钮。"
echo -e "3. 连接您的 GitHub 仓库 'my-blog'。"
echo -e "4. Render 会自动识别项目根目录下的 'render.yaml' 文件。"
echo -e "5. 点击 'Apply' 开始部署。"
echo -e "\n⚠️  重要提示：部署完成后，请在 Render 的环境变量设置中，将 FRONTEND_URL 更新为："
echo -e "${GREEN}$FRONTEND_URL${NC}"
echo "=================================================="
