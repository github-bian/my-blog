/**
 * CollabEditor – TipTap 编辑器
 *
 * 富文本编辑，支持 Markdown 语法。
 */

import { useCallback, useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Markdown } from "tiptap-markdown";
import { common, createLowlight } from "lowlight";

import "./CollabEditor.css";

const lowlight = createLowlight(common);

/* ------------------------------------------------------------------ */
/*  类型                                                                */
/* ------------------------------------------------------------------ */
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
  initialContent,
  onChange,
}: Props) {
  const initialContentSet = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({ lowlight }),
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
  });

  // 注入初始内容
  useEffect(() => {
    if (!editor || !initialContent || initialContentSet.current) return;
    editor.commands.setContent(initialContent);
    initialContentSet.current = true;
  }, [editor, initialContent]);

  /** 获取当前编辑器的 Markdown 内容 */
  const getMarkdown = useCallback((): string => {
    if (!editor) return "";
    const mdStore = (editor.storage as Record<string, any>)["markdown"];
    return mdStore?.getMarkdown?.() ?? editor.getHTML();
  }, [editor]);

  // 暴露 getMarkdown 到 DOM
  useEffect(() => {
    const el = document.getElementById("collab-editor-root");
    if (el) (el as any).__getMarkdown = getMarkdown;
  }, [getMarkdown]);

  return (
    <div id="collab-editor-root" className="collabEditor">
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
