import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../auth/auth";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLoginMode) {
        await login({ email, password });
      } else {
        const res = await fetch("/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, displayName }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "注册失败");
        }
        await login({ email, password });
      }
      navigate("/");
    } catch (err: any) {
      setError(err.message || "操作失败，请检查网络或后端是否启动");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      padding: "20px" 
    }}>
      <div className="glassCard" style={{ width: "100%", maxWidth: "400px" }}>
        <h2 className="modalTitle" style={{ marginBottom: "24px" }}>
          {isLoginMode ? "欢迎回来" : "创建账号"}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <label className="field">
            <span className="label">邮箱</span>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="hello@example.com"
            />
          </label>

          {!isLoginMode && (
            <label className="field">
              <span className="label">昵称</span>
              <input
                type="text"
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                disabled={loading}
                placeholder="你的名字"
              />
            </label>
          )}

          <label className="field">
            <span className="label">密码</span>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="••••••••"
              minLength={6}
            />
          </label>

          {error && <div className="errorMessage">{error}</div>}

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
            <button
              type="submit"
              className="magneticButton"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center" }}
            >
              <span className="magneticButton__inner">
                {loading ? "处理中..." : isLoginMode ? "登录" : "注册"}
              </span>
            </button>
            
            <button
              type="button"
              className="linkButton"
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setError("");
              }}
              style={{ 
                background: "transparent", 
                border: "none", 
                color: "var(--accentB)", 
                cursor: "pointer",
                padding: "8px"
              }}
            >
              {isLoginMode ? "没有账号？去注册" : "已有账号？去登录"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
