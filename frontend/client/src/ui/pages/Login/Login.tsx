import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Form, Input, Segmented, Space, Typography, message } from "antd";

import { useAuth } from "../../auth/auth";
import { apiJson } from "../../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: { email: string; password: string; displayName?: string }) {
    setLoading(true);
    try {
      if (mode === "login") {
        await login({ email: values.email, password: values.password });
      } else {
        await apiJson<{ user: { id: number } }>("/api/v1/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email: values.email,
            password: values.password,
            displayName: values.displayName,
          }),
        });
        await login({ email: values.email, password: values.password });
      }
      message.success(mode === "login" ? "登录成功" : "注册成功");
      navigate("/");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "操作失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="blogAuthWrap">
      <Card className="blogPageCard blogAuthCard" style={{ width: "min(500px, 100%)" }}>
        <Space orientation="vertical" size={18} style={{ width: "100%" }}>
          <Space orientation="vertical" size={4}>
            <Typography.Text className="blogHeroKicker">Authentication</Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {mode === "login" ? "登录博客" : "注册账号"}
            </Typography.Title>
            <Typography.Text type="secondary">欢迎回来，继续你的写作与分享。</Typography.Text>
          </Space>

          <Segmented
            block
            value={mode}
            onChange={(value) => setMode(value as "login" | "register")}
            options={[
              { label: "登录", value: "login" },
              { label: "注册", value: "register" },
            ]}
          />

          <Form
            layout="vertical"
            onFinish={(values) => void handleSubmit(values)}
            requiredMark={false}
            className="blogAuthForm"
          >
            <Form.Item
              label="邮箱"
              name="email"
              rules={[{ required: true, message: "请输入邮箱" }, { type: "email", message: "邮箱格式不正确" }]}
            >
              <Input placeholder="hello@example.com" size="large" />
            </Form.Item>

            {mode === "register" && (
              <Form.Item
                label="昵称"
                name="displayName"
                rules={[{ required: true, message: "请输入昵称" }]}
              >
                <Input placeholder="你的名字" size="large" />
              </Form.Item>
            )}

            <Form.Item
              label="密码"
              name="password"
              rules={[
                { required: true, message: "请输入密码" },
                { min: 6, message: "密码长度至少 6 位" },
              ]}
            >
              <Input.Password placeholder="请输入密码" size="large" />
            </Form.Item>

            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              {mode === "login" ? "登录" : "注册"}
            </Button>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
