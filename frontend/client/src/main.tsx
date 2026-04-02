import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import { ConfigProvider, theme } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

import { App } from "./ui/App";
import "antd/dist/reset.css";
import "./ui/styles/global.css";
import "./ui/styles/antd-blog.css";

// Sentry 初始化（需要 VITE_SENTRY_DSN 环境变量）
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? "production",
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
}

// 创建 QueryClient 实例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分钟
      refetchOnWindowFocus: false,
    },
  },
});

// React 18+ 推荐写法：createRoot + render
// StrictMode 在开发环境会做一些额外检查（例如某些 effect 可能会执行两次），
// 目的是帮助你提前发现不安全的副作用写法；生产构建不会这样做。
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#2563eb",
          colorInfo: "#2563eb",
          colorSuccess: "#16a34a",
          colorWarning: "#faad14",
          colorError: "#ff4d4f",
          borderRadius: 14,
          borderRadiusLG: 18,
          fontSize: 16,
          lineHeight: 1.65,
          fontFamily:
            '"Avenir Next", "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif',
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  </React.StrictMode>,
);
