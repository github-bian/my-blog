import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { AppModule } from "./server/app.module";

async function bootstrap() {
  // 这个 Nest 应用在本项目里承担两个角色：
  // 1) 生产环境：托管 React 构建出来的静态文件（client/dist）
  // 2) 开发/生产：把 /api/... 反向代理到 Flask，避免前端跨域（CORS）问题
  //
  // 所以这里关闭 Nest 自带的 cors（cors: false），让“同域代理”成为默认方案。
  const app = await NestFactory.create(AppModule, { cors: false });
  // PORT 默认 3000：访问 http://localhost:3000 即可打开站点
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}

bootstrap();
