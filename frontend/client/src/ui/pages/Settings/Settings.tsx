import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../auth/auth";
import { apiJson } from "../../lib/api";
import "./Settings.css";
import { MagneticButton } from "../../components/MagneticButton";

export default function Settings() {
  const { state, updateProfile } = useAuth();
  
  const [username, setUsername] = useState("");
  const [description, setDescription] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.user) {
      setUsername(state.user.displayName || "");
      // Assume user might have a description field in a real app
      setDescription((state.user as any).description || "");
      setAvatarPreview((state.user as any).avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix");
    }
  }, [state?.user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setErrorMsg("仅支持 JPG/PNG 格式图片");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("图片大小不能超过 2MB");
      return;
    }

    // Read and compress image (simulated here with canvas)
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        
        // Compress to 800x800 max
        if (width > 800 || height > 800) {
          if (width > height) {
            height = Math.round((height * 800) / width);
            width = 800;
          } else {
            width = Math.round((width * 800) / height);
            height = 800;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        const compressedDataUrl = canvas.toDataURL(file.type, 0.9);
        setAvatarPreview(compressedDataUrl);
        setErrorMsg("");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg("用户名不能为空");
      return;
    }
    if (username.length > 30) {
      setErrorMsg("用户名不能超过 30 个字符");
      return;
    }
    if (description.length > 200) {
      setErrorMsg("个人描述不能超过 200 个字符");
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");
    setIsSubmitting(true);

    try {
      const res = await apiJson<{ user: any }>("/api/v1/users/me", {
        method: "PUT",
        body: JSON.stringify({
          displayName: username.trim(),
          avatarUrl: avatarPreview,
        }),
        token: state?.accessToken,
      });

      // Update global context with returned data
      if (updateProfile) {
        updateProfile({
          displayName: res.user.display_name ?? username,
          avatarUrl: res.user.avatar_url ?? avatarPreview,
        } as any);
      }

      setSuccessMsg("个人资料保存成功");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "保存失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="settingsPage reveal">
      <div className="glassCard settingsCard">
        <h1 className="settingsTitle">个人设置</h1>
        
        {errorMsg && <div className="errorNote">{errorMsg}</div>}
        {successMsg && <div className="successNote">{successMsg}</div>}

        <form className="settingsForm" onSubmit={handleSubmit}>
          <div className="avatarUploadSection">
            <div className="avatarPreviewWrap" onClick={() => fileInputRef.current?.click()}>
              <img src={avatarPreview} alt="Avatar Preview" className="avatarPreviewImg" />
              <div className="avatarOverlay">
                <span>更换头像</span>
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hiddenInput" 
              accept="image/jpeg, image/png"
              onChange={handleAvatarChange}
            />
            <div className="avatarHint">支持 JPG/PNG 格式，大小不超过 2MB</div>
          </div>

          <div className="field">
            <label className="label">用户名 (Max 30)</label>
            <input 
              className="input" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="输入用户名..." 
              maxLength={30}
            />
          </div>

          <div className="field">
            <label className="label">个人描述 (Max 200)</label>
            <textarea 
              className="textarea" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="一句话介绍自己..." 
              rows={4}
              maxLength={200}
            />
          </div>

          <div className="settingsActions">
            <MagneticButton 
              disabled={isSubmitting} 
              ariaLabel="保存设置"
            >
              <span className="magneticButton__inner">
                {isSubmitting ? "保存中..." : "保存设置"}
              </span>
            </MagneticButton>
          </div>
        </form>
      </div>
    </div>
  );
}