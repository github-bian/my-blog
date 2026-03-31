import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth";
import "./UserDropdown.css";

export function UserDropdown() {
  const { state, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => setIsOpen(!isOpen);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent, action?: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (action) action();
      else toggleDropdown();
    } else if (e.key === "Escape") {
      setIsOpen(false);
      // Return focus to trigger
      (dropdownRef.current?.querySelector(".navUser") as HTMLElement)?.focus();
    } else if (e.key === "Tab" && isOpen && menuRef.current) {
      // Basic focus trapping or cycling can be added here if needed
      // Currently letting native tab cycle through the tabindex=0 items
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const items = Array.from(menuRef.current?.querySelectorAll(".dropdownItem") || []) as HTMLElement[];
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);
      let nextIndex = 0;
      if (e.key === "ArrowDown") {
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      }
      items[nextIndex]?.focus();
    }
  };

  const username = state?.user?.displayName ?? "User";
  const avatarUrl = (state?.user as any)?.avatarUrl ?? "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"; // 默认头像

  return (
    <div className="userDropdownContainer" ref={dropdownRef}>
      <div
        className="navUser"
        aria-label="当前登录用户菜单"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        role="button"
        tabIndex={0}
        onClick={toggleDropdown}
        onKeyDown={(e) => handleKeyDown(e)}
      >
        <img
          src={avatarUrl}
          alt={username}
          className="navAvatarImg"
          aria-hidden="true"
        />
        <span className="navUserName">{username}</span>
      </div>

      {isOpen && (
        <div className="dropdownMenu fadeIn" role="menu" ref={menuRef}>
          <button
            className="dropdownItem"
            role="menuitem"
            tabIndex={0}
            onClick={() => {
              navigate("/settings");
              setIsOpen(false);
            }}
            onKeyDown={(e) => handleKeyDown(e, () => {
              navigate("/settings");
              setIsOpen(false);
            })}
          >
            <svg className="dropdownIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            个人设置
          </button>
          <button
            className="dropdownItem"
            role="menuitem"
            tabIndex={0}
            onClick={() => {
              navigate("/editor");
              setIsOpen(false);
            }}
            onKeyDown={(e) => handleKeyDown(e, () => {
              navigate("/editor");
              setIsOpen(false);
            })}
          >
            <svg className="dropdownIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            发布文章
          </button>
          <button
            className="dropdownItem"
            role="menuitem"
            tabIndex={0}
            onClick={() => {
              navigate("/user/drafts");
              setIsOpen(false);
            }}
            onKeyDown={(e) => handleKeyDown(e, () => {
              navigate("/user/drafts");
              setIsOpen(false);
            })}
          >
            <svg className="dropdownIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            我的草稿
          </button>
          <div style={{ height: '1px', background: 'var(--glassBorder)', margin: '4px 0' }} />
          <button
            className="dropdownItem dropdownItem--danger"
            role="menuitem"
            tabIndex={0}
            onClick={() => {
              logout();
              navigate("/login");
              setIsOpen(false);
            }}
            onKeyDown={(e) => handleKeyDown(e, () => {
              logout();
              navigate("/login");
              setIsOpen(false);
            })}
          >
            <svg className="dropdownIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}