import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth";
import { MagneticButton } from "./MagneticButton";
import { WeatherWidget } from "./WeatherWidget";
import { UserDropdown } from "./UserDropdown";

type NavItem = { label: string; to: string };

const items: NavItem[] = [
  { label: "首页", to: "/" },
  { label: "仪表盘", to: "/dashboard" },
  { label: "归档", to: "/archive" },
  { label: "关于", to: "/about" },
];

export function AnchorNav() {
  const { pathname } = useLocation();
  const { isAuthed } = useAuth();

  return (
    <nav className="anchorNav" aria-label="页面导航">
      <div className="anchorNav__glass">
        <div className="anchorNav__items">
          {items.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              className={[
                "anchorNav__item",
                pathname === it.to ? "anchorNav__item--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {it.label}
            </Link>
          ))}
        </div>
        <div className="anchorNav__actions">
          <WeatherWidget />
          {isAuthed ? (
            <UserDropdown />
          ) : (
            <MagneticButton to="/login" ariaLabel="登录或注册">
              登录
            </MagneticButton>
          )}
        </div>
      </div>
    </nav>
  );
}
