import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { existsSync } from "fs";
import { join } from "path";

import { ApiProxyMiddleware } from "./api-proxy.middleware";

// React 构建后的产物目录：frontend/client/dist
// - 开发模式下可能不存在（你可能只启动 Vite）
// - 生产模式下 build 后一定会生成
const clientDist = join(process.cwd(), "client", "dist");

@Module({
  imports: [
    ...(existsSync(clientDist)
      ? [
          ServeStaticModule.forRoot({
            rootPath: clientDist,
            // 不要把 /api 这种接口路径当静态文件；否则会被 index.html 吃掉
            exclude: ["/api*"],
          }),
        ]
      : []),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 把 /api 开头的请求交给代理中间件处理（转发到 Flask）
    consumer.apply(ApiProxyMiddleware).forRoutes("/api");
  }
}
