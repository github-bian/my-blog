import { useEffect, useMemo, useRef, useState } from "react";

import { formatApiError } from "../lib/api";
import { useAuth } from "../auth/auth";
import { MagneticButton } from "./MagneticButton";

type Mode = "login" | "register";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoading(false);
    window.setTimeout(() => emailRef.current?.focus(), 0);
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, loading]);

  const title = useMemo(() => (mode === "login" ? "登录" : "注册"), [mode]);

  if (!open) return null;

  const onSubmit = async () => {
    const trimmedEmail = email.trim();
    const trimmedName = displayName.trim();

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("请输入有效邮箱");
      return;
    }
    if (!password || password.length < 8) {
      setError("密码至少 8 位");
      return;
    }
    if (mode === "register" && !trimmedName) {
      setError("昵称不能为空");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      if (mode === "login") {
        await login({ email: trimmedEmail, password });
      } else {
        await register({ email: trimmedEmail, password, displayName: trimmedName });
      }
      setPassword("");
      onClose();
    } catch (e: unknown) {
      setError(formatApiError(e, "操作失败，请稍后重试"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modalOverlay"
      role="dialog"
      aria-modal="true"
      aria-label="登录注册弹窗"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="glassCard modalCard">
        <div className="modalHeader">
          <div className="modalTitle">{title}</div>
          <button
            type="button"
            className="iconButton"
            onClick={onClose}
            aria-label="关闭"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <div className="segmented" role="tablist" aria-label="登录注册切换">
          <button
            type="button"
            className={["segmented__item", mode === "login" ? "isActive" : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setMode("login")}
            aria-selected={mode === "login"}
            disabled={loading}
          >
            登录
          </button>
          <button
            type="button"
            className={["segmented__item", mode === "register" ? "isActive" : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setMode("register")}
            aria-selected={mode === "register"}
            disabled={loading}
          >
            注册
          </button>
        </div>

        <div className="form">
          <label className="field">
            <span className="label">邮箱</span>
            <input
              ref={emailRef}
              className="input"
              value={email}
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </label>

          {mode === "register" && (
            <label className="field">
              <span className="label">昵称</span>
              <input
                className="input"
                value={displayName}
                autoComplete="nickname"
                placeholder="你的昵称"
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
              />
            </label>
          )}

          <label className="field">
            <span className="label">密码</span>
            <input
              className="input"
              type="password"
              value={password}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="至少 8 位"
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onSubmit();
              }}
            />
          </label>

          {error && <div className="errorNote">{error}</div>}

          <div className="modalActions">
            <MagneticButton
              onClick={() => void onSubmit()}
              ariaLabel={loading ? "处理中" : title}
              className={loading ? "isLoading" : ""}
              disabled={loading}
            >
              {loading ? "处理中…" : title}
            </MagneticButton>
            <button type="button" className="textButton" onClick={onClose} disabled={loading}>
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
