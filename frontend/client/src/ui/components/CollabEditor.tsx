import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MarkdownArticle } from "./MarkdownArticle";
import "./CollabEditor.css";

export type CollabUser = {
  id: number;
  name: string;
  avatarUrl?: string | null;
};

type Props = {
  roomName: string;
  user: CollabUser;
  initialContent?: string;
  onChange?: (markdown: string) => void;
  wsUrl?: string;
};
export default function CollabEditor({
  roomName,
  user,
  wsUrl,
  initialContent,
  onChange,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const [markdown, setMarkdown] = useState(initialContent ?? "");
  const [previewMode, setPreviewMode] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "reconnecting" | "offline" | "unavailable"
  >("connecting");

  const wsEndpoint = useMemo(() => {
    if (wsUrl) return wsUrl;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/collab?room=${encodeURIComponent(roomName)}`;
  }, [wsUrl, roomName]);

  useEffect(() => {
    setMarkdown(initialContent ?? "");
  }, [initialContent]);

  useEffect(() => {
    onChange?.(markdown);
  }, [markdown, onChange]);

  const getMarkdown = useCallback((): string => {
    return markdown;
  }, [markdown]);

  useEffect(() => {
    const el = document.getElementById("collab-editor-root");
    if (el) (el as any).__getMarkdown = getMarkdown;
    return () => {
      if (el) delete (el as any).__getMarkdown;
    };
  }, [getMarkdown]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) {
      setConnectionStatus("offline");
      socketRef.current?.close();
      socketRef.current = null;
      return;
    }

    let stopped = false;

    const connect = (isRetry = false) => {
      if (stopped) return;
      setConnectionStatus(isRetry ? "reconnecting" : "connecting");

      try {
        const socket = new WebSocket(wsEndpoint);
        socketRef.current = socket;

        socket.onopen = () => {
          if (stopped) return;
          setConnectionStatus("connected");
        };

        socket.onerror = () => {
          if (stopped) return;
          setConnectionStatus("unavailable");
        };

        socket.onclose = () => {
          if (stopped) return;
          if (!navigator.onLine) {
            setConnectionStatus("offline");
            return;
          }

          setConnectionStatus("reconnecting");
          reconnectTimerRef.current = window.setTimeout(() => connect(true), 2200);
        };
      } catch {
        setConnectionStatus("unavailable");
        reconnectTimerRef.current = window.setTimeout(() => connect(true), 2200);
      }
    };

    connect(false);

    return () => {
      stopped = true;
      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [isOnline, wsEndpoint]);

  const toolbarGroups = useMemo(
    () => [
      {
        key: "headings",
        items: [
          { label: "H1", action: () => prefixCurrentLine("# ") },
          { label: "H2", action: () => prefixCurrentLine("## ") },
          { label: "H3", action: () => prefixCurrentLine("### ") },
        ],
      },
      {
        key: "inline",
        items: [
          { label: "B", action: () => wrapSelection("**", "**", "粗体") },
          { label: "I", action: () => wrapSelection("*", "*", "斜体") },
          { label: "代码", action: () => wrapSelection("`", "`", "code") },
          { label: "引用", action: () => prefixCurrentLine("> ") },
        ],
      },
      {
        key: "blocks",
        items: [
          { label: "无序", action: () => prefixCurrentLine("- ") },
          { label: "有序", action: () => prefixCurrentLine("1. ") },
          { label: "链接", action: () => wrapSelection("[", "](https://)", "链接文本") },
          { label: "图片", action: () => wrapSelection("![", "](https://)", "图片描述") },
          { label: "代码块", action: () => wrapSelection("```\n", "\n```", "在这里输入代码") },
          { label: "分割线", action: () => insertAtCursor("\n\n---\n\n") },
        ],
      },
    ],
    [],
  );

  function updateBySelection(nextValue: string, start: number, end: number) {
    setMarkdown(nextValue);
    window.requestAnimationFrame(() => {
      const input = textareaRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(start, end);
    });
  }

  function wrapSelection(prefix: string, suffix: string, placeholder: string) {
    const input = textareaRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = markdown.slice(start, end) || placeholder;
    const next = `${markdown.slice(0, start)}${prefix}${selected}${suffix}${markdown.slice(end)}`;
    const cursorStart = start + prefix.length;
    const cursorEnd = cursorStart + selected.length;
    updateBySelection(next, cursorStart, cursorEnd);
  }

  function prefixCurrentLine(prefix: string) {
    const input = textareaRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const lineStart = markdown.lastIndexOf("\n", start - 1) + 1;
    const lineEnd = markdown.indexOf("\n", end);
    const actualLineEnd = lineEnd === -1 ? markdown.length : lineEnd;
    const selectedBlock = markdown.slice(lineStart, actualLineEnd);
    const nextBlock = selectedBlock
      .split("\n")
      .map((line) => `${prefix}${line}`)
      .join("\n");
    const next = `${markdown.slice(0, lineStart)}${nextBlock}${markdown.slice(actualLineEnd)}`;
    updateBySelection(next, lineStart, lineStart + nextBlock.length);
  }

  function insertAtCursor(text: string) {
    const input = textareaRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const next = `${markdown.slice(0, start)}${text}${markdown.slice(end)}`;
    const cursor = start + text.length;
    updateBySelection(next, cursor, cursor);
  }

  return (
    <div id="collab-editor-root" className="collabEditor">
      <div className="collabEditor__meta">
        <div>
          <div className="collabEditor__eyebrow">Writing Workspace</div>
          <div className="collabEditor__room">房间：{roomName}</div>
        </div>
        <div className="collabEditor__presence">
          <span className={["collabEditor__presenceDot", `is-${connectionStatus}`].join(" ")} />
          <span>{user.name}</span>
          <span className={["collabEditor__status", `is-${connectionStatus}`].join(" ")}>
            {connectionStatus === "connected" && "协作已连接"}
            {connectionStatus === "connecting" && "连接中"}
            {connectionStatus === "reconnecting" && "重连中"}
            {connectionStatus === "offline" && "网络离线"}
            {connectionStatus === "unavailable" && "协作服务不可用"}
          </span>
        </div>
      </div>

      <div className="collabToolbar">
        <div className="collabToolbar__left">
          {toolbarGroups.map((group) => (
            <div key={group.key} className="collabToolbar__group">
              {group.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="collabToolbar__btn"
                  onClick={item.action}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="collabToolbar__modeSwitch" role="tablist" aria-label="编辑器模式">
          <button
            type="button"
            className={["collabToolbar__toggle", !previewMode ? "is-active" : ""].filter(Boolean).join(" ")}
            role="tab"
            aria-selected={!previewMode}
            onClick={() => setPreviewMode(false)}
          >
            编辑
          </button>
          <button
            type="button"
            className={["collabToolbar__toggle", previewMode ? "is-active" : ""].filter(Boolean).join(" ")}
            role="tab"
            aria-selected={previewMode}
            onClick={() => setPreviewMode(true)}
          >
            预览 Markdown
          </button>
        </div>
      </div>

      {previewMode ? (
        <div className="collabEditor__preview">
          <MarkdownArticle content={markdown} className="collabEditor__previewMarkdown" />
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          className="collabEditor__textarea"
          value={markdown}
          onChange={(event) => setMarkdown(event.target.value)}
          placeholder="使用 Markdown 输入文章内容，例如：# 标题、- 列表、```代码```"
        />
      )}
    </div>
  );
}

/** 从 DOM 获取编辑器内容（供父组件提交时调用） */
export function getEditorMarkdown(): string {
  const el = document.getElementById("collab-editor-root");
  return (el as any)?.__getMarkdown?.() ?? "";
}
