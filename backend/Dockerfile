# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./
RUN npm ci --only=production

# 复制源代码
COPY . .

# 生成 Prisma 客户端
RUN npx prisma generate

# 构建应用
RUN npm run build

# 生产阶段
FROM node:20-alpine AS production

WORKDIR /app

# 复制依赖
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# 安装 Prisma CLI
RUN npm install -g prisma

# 暴露端口
EXPOSE 3001

# 运行迁移和启动应用
CMD prisma migrate deploy && npm run start:prod
