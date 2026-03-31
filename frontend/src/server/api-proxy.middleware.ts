import { Injectable, NestMiddleware } from "@nestjs/common";
import { createProxyMiddleware } from "http-proxy-middleware";

function toJsonBody(req: any): string | null {
  if (!req) return null;
  if (req.body == null) return null;
  if (typeof req.body === "string") return req.body;
  try {
    return JSON.stringify(req.body);
  } catch {
    return null;
  }
}

// 代理的目标后端地址：默认 http://localhost:5001
// 你可以通过环境变量 FLASK_API_URL 指向不同端口/不同机器。
//
// 例如：
// FLASK_API_URL=http://localhost:5001 npm run dev:server
const proxy = createProxyMiddleware({
  target: process.env.FLASK_API_URL ?? "http://localhost:5001",
  changeOrigin: true,
  ws: false,
  // NestJS 的中间件是从 /api 这个路由挂进去的：
  // consumer.apply(...).forRoutes("/api")
  //
  // 但我们的前端请求路径是 /api/v1/...（注意：不是 /v1/...）。
  // 为了确保转发时“路径不丢”，这里用 originalUrl 把完整路径带过去。
  pathRewrite: (_path, req) => (req as any).originalUrl ?? _path,
  // Nest(Express) 默认会先用 body-parser 读取 JSON body。
  // 这会导致代理在转发 POST/PUT/PATCH 时拿不到原始请求流，后端可能一直等待 body（表现为“请求一直 pending”）。
  // 所以这里把 req.body 再写回到 proxyReq 里。
  on: {
    proxyReq: (proxyReq: any, req: any) => {
      const method = req?.method?.toUpperCase?.() ?? "";
      if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return;

      const body = toJsonBody(req);
      if (!body) return;

      const contentType = String(proxyReq.getHeader("Content-Type") ?? "");
      if (!contentType.includes("application/json")) return;

      proxyReq.setHeader("Content-Length", Buffer.byteLength(body));
      proxyReq.write(body);
    },
  },
});

@Injectable()
export class ApiProxyMiddleware implements NestMiddleware {
  use(req: any, res: any, next: any) {
    // 这里不会自己处理请求，只负责转发；转发成功后由 Flask 返回 JSON。
    proxy(req, res, next);
  }
}
