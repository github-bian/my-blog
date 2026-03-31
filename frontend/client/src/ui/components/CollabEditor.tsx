/**
 * CollabEditor – TipTap 协作编辑器
 *
 * 通过 Yjs + y-websocket 实现多人实时共同编辑。
 * 每位协作者拥有独立的光标颜色与头像（通过 Awareness 协议广播）。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Markdown } from "tiptap-markdown";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { common, createLowlight } from "lowlight";

import "./CollabEditor.css";

const lowlight = createLowlight(common);

/* ------------------------------------------------------------------ */
/*  随机柔和色，用于区分不同协作者的光标                                     */
/* ------------------------------------------------------------------ */
const CURSOR_COLORS = [
  "#f472b6", "#818cf8", "#34d399", "#fbbf24", "#f87171",
  "#a78bfa", "#38bdf8", "#fb923c", "#4ade80", "#e879f9",
];

function pickColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

/* ------------------------------------------------------------------ */
/*  类型                                                                */
/* ------------------------------------------------------------------ */
export type CollabUser = {
  id: number;
  name: string;
  avatarUrl?: string | null;
};

type Props = {
  /** WebSocket 协作房间名，如 "post-42" 或 "new-xxx" */
  roomName: string;
  /** 当前用户信息 */
  user: CollabUser;
  /** 已有文章的初始 Markdown 内容（仅首位进入房间时生效） */
  initialContent?: string;
  /** 内容变更回调（可用于 debounced save / 字数统计等） */
  onChange?: (markdown: string) => void;
  /** WS 协作服务器地址（默认走 Vite proxy） */
  wsUrl?: string;
};

/* ------------------------------------------------------------------ */
/*  协作者头像条                                                         */
/* ------------------------------------------------------------------ */
type Peer = { id: number; name: string; avatarUrl?: string | null; color: string };

function CollabAvatars({ peers, currentUser }: { peers: Peer[]; currentUser: CollabUser }) {
  // 去掉自己，最多显示 6 个协作者
  const others = peers.filter((p) => p.id !== currentUser.id).slice(0, 6);

  if (others.length === 0) return null;

  return (
    <div className="collabAvatars">
      {others.map((peer) => (
        <div key={peer.id} className="collabAvatar" title={peer.name} style={{ borderColor: peer.color }}>
          {peer.avatarUrl ? (
            <img src={peer.avatarUrl} alt={peer.name} className="collabAvatar__img" />
          ) : (
            <span className="collabAvatar__initial">{peer.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
      ))}
      <span className="collabAvatars__count">{others.length} 人在线协作</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  工具栏                                                              */
/* ------------------------------------------------------------------ */
function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  const items = [
    { label: "H1", action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive("heading", { level: 1 }) },
    { label: "H2", action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }) },
    { label: "H3", action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive("heading", { level: 3 }) },
    { type: "divider" as const },
    { label: "B", action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), style: { fontWeight: 700 } },
    { label: "I", action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), style: { fontStyle: "italic" as const } },
    { label: "U", action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive("underline"), style: { textDecoration: "underline" } },
    { label: "S", action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike"), style: { textDecoration: "line-through" } },
    { label: "Hi", action: () => editor.chain().focus().toggleHighlight().run(), active: editor.isActive("highlight") },
    { type: "divider" as const },
    { label: "• List", action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList") },
    { label: "1. List", action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList") },
    { label: "☑ Task", action: () => editor.chain().focus().toggleTaskList().run(), active: editor.isActive("taskList") },
    { type: "divider" as const },
    { label: "引用", action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote") },
    { label: "代码", action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive("codeBlock") },
    { label: "—", action: () => editor.chain().focus().setHorizontalRule().run(), active: false },
    { type: "divider" as const },
    { label: "🔗", action: () => { const url = window.prompt("输入链接 URL"); if (url) editor.chain().focus().setLink({ href: url }).run(); }, active: editor.isActive("link") },
    { label: "🖼", action: () => { const url = window.prompt("输入图片 URL"); if (url) editor.chain().focus().setImage({ src: url }).run(); }, active: false },
  ];

  return (
    <div className="collabToolbar">
      {items.map((item, idx) =>
        "type" in item && item.type === "divider" ? (
          <span key={idx} className="collabToolbar__divider" />
        ) : (
          <button
            key={idx}
            type="button"
            className={`collabToolbar__btn ${("active" in item && item.active) ? "is-active" : ""}`}
            onClick={"action" in item ? item.action : undefined}
            style={"style" in item ? item.style : undefined}
          >
            {"label" in item ? item.label : ""}
          </button>
        ),
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  主编辑器组件                                                        */
/* ------------------------------------------------------------------ */
export default function CollabEditor({
  roomName,
  user,
  initialContent,
  onChange,
  wsUrl = `ws://${window.location.host}/collab`,
}: Props) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [connected, setConnected] = useState(false);
  const initialContentSet = useRef(false);

  // 保持 Yjs 文档和 Provider 在组件生命周期内稳定
  const { ydoc, provider } = useMemo(() => {
    const doc = new Y.Doc();
    const prov = new WebsocketProvider(wsUrl, roomName, doc);
    return { ydoc: doc, provider: prov };
    // roomName / wsUrl 变化时需要重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, wsUrl]);

  // 清理
  useEffect(() => {
    return () => {
      provider.disconnect();
      ydoc.destroy();
    };
  }, [provider, ydoc]);

  // 连接状态
  useEffect(() => {
    const onStatus = ({ status }: { status: string }) => setConnected(status === "connected");
    provider.on("status", onStatus);
    return () => { provider.off("status", onStatus); };
  }, [provider]);

  // Awareness – 广播自己的信息 & 收集他人信息
  useEffect(() => {
    const color = pickColor(user.name);
    provider.awareness.setLocalStateField("user", {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl ?? null,
      color,
    });

    const updatePeers = () => {
      const states = Array.from(provider.awareness.getStates().values());
      const list: Peer[] = states
        .filter((s: any) => s.user)
        .map((s: any) => ({
          id: s.user.id,
          name: s.user.name,
          avatarUrl: s.user.avatarUrl,
          color: s.user.color ?? color,
        }));
      setPeers(list);
    };

    provider.awareness.on("change", updatePeers);
    updatePeers();
    return () => { provider.awareness.off("change", updatePeers); };
  }, [provider, user]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        undoRedo: false, // 禁用内置 UndoRedo，由 Yjs CRDT 接管版本
        codeBlock: false, // 用 CodeBlockLowlight 替换
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider,
        user: {
          name: user.name,
          color: pickColor(user.name),
        },
      }),
      Placeholder.configure({
        placeholder: "开始输入文章内容…",
      }),
      Image,
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight,
      Underline,
      Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    editorProps: {
      attributes: {
        class: "collabEditorContent",
      },
    },
    onUpdate: ({ editor: e }) => {
      if (onChange) {
        const mdStore = (e.storage as Record<string, any>)["markdown"];
        const md: string = mdStore?.getMarkdown?.() ?? e.getHTML();
        onChange(md);
      }
    },
  }, [ydoc, provider]);

  // 在 provider 同步完成后注入初始内容（仅第一位加入且文档为空时）
  useEffect(() => {
    if (!editor || !initialContent || initialContentSet.current) return;

    const trySet = () => {
      const fragment = ydoc.getXmlFragment("default");
      if (fragment.length === 0 && initialContent.trim()) {
        editor.commands.setContent(initialContent);
      }
      initialContentSet.current = true;
    };

    if (provider.synced) {
      trySet();
    } else {
      provider.once("sync", trySet);
    }
  }, [editor, initialContent, provider, ydoc]);

  /** 获取当前编辑器的 Markdown 内容 */
  const getMarkdown = useCallback((): string => {
    if (!editor) return "";
    const mdStore = (editor.storage as Record<string, any>)["markdown"];
    return mdStore?.getMarkdown?.() ?? editor.getHTML();
  }, [editor]);

  // 暴露到父组件：通过 ref 或直接导出 getMarkdown
  // 这里我们用一个 attached property 的方式
  useEffect(() => {
    const el = document.getElementById("collab-editor-root");
    if (el) (el as any).__getMarkdown = getMarkdown;
  }, [getMarkdown]);

  return (
    <div id="collab-editor-root" className="collabEditor">
      <div className="collabEditor__topBar">
        <div className="collabEditor__status">
          <span className={`collabEditor__dot ${connected ? "is-connected" : ""}`} />
          <span>{connected ? "已连接协作服务" : "正在连接…"}</span>
        </div>
        <CollabAvatars peers={peers} currentUser={user} />
      </div>
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} className="collabEditor__body" />
    </div>
  );
}

/** 从 DOM 获取编辑器内容（供父组件提交时调用） */
export function getEditorMarkdown(): string {
  const el = document.getElementById("collab-editor-root");
  return (el as any)?.__getMarkdown?.() ?? "";
}
