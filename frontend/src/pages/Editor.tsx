import '@wangeditor/editor/dist/css/style.css'
import React, { useState, useEffect } from 'react';
import { Editor as WangEditor, Toolbar } from '@wangeditor/editor-for-react';
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import axios from 'axios';
import { motion } from 'framer-motion';

const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [editor, setEditor] = useState<IDomEditor | null>(null);
  const [html, setHtml] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (id) {
      axios.get(`http://localhost:5000/api/articles/${id}`)
        .then(res => {
          setTitle(res.data.title);
          setHtml(res.data.content);
        })
        .catch(console.error);
    }
  }, [id]);

  const toolbarConfig: Partial<IToolbarConfig> = {};
  const editorConfig: Partial<IEditorConfig> = {
    placeholder: '请输入内容...',
  };

  useEffect(() => {
    return () => {
      if (editor == null) return;
      editor.destroy();
      setEditor(null);
    };
  }, [editor]);

  const handleSave = async () => {
    if (!title.trim() || !html.trim()) {
      alert('标题和内容不能为空');
      return;
    }

    try {
      if (id) {
        await axios.put(`http://localhost:5000/api/articles/${id}`, {
          title,
          content: html
        }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post('http://localhost:5000/api/articles', {
          title,
          content: html
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      navigate('/articles');
    } catch (err) {
      console.error(err);
      alert('保存失败');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-5xl mx-auto glass-panel p-6"
    >
      <div className="mb-6 flex justify-between items-center">
        <input 
          type="text" 
          placeholder="文章标题"
          className="text-3xl bg-transparent border-none outline-none text-white w-full placeholder-gray-500 font-bold"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button onClick={handleSave} className="glass-btn whitespace-nowrap ml-4">
          {id ? '更新文章' : '发布文章'}
        </button>
      </div>

      <div className="border border-white/20 rounded-lg overflow-hidden bg-white z-10 relative text-black">
        <Toolbar
          editor={editor}
          defaultConfig={toolbarConfig}
          mode="default"
          style={{ borderBottom: '1px solid #ccc' }}
        />
        <WangEditor
          defaultConfig={editorConfig}
          value={html}
          onCreated={setEditor}
          onChange={editor => setHtml(editor.getHtml())}
          mode="default"
          style={{ height: '500px', overflowY: 'hidden' }}
        />
      </div>
    </motion.div>
  );
};

export default Editor;
