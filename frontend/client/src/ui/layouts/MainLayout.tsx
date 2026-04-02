import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Avatar,
  Button,
  Drawer,
  Dropdown,
  Input,
  Layout,
  Menu,
  Space,
  Typography,
  Grid,
} from "antd";
import type { MenuProps } from "antd";
import {
  DashboardOutlined,
  HomeOutlined,
  LoginOutlined,
  LogoutOutlined,
  ProfileOutlined,
  SearchOutlined,
  UserOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { useAuth } from "../auth/auth";

const { Header, Content } = Layout;
const { useBreakpoint } = Grid;

export function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { isAuthed, state, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const selectedKey = useMemo(() => {
    if (location.pathname.startsWith("/archive")) return "archive";
    if (location.pathname.startsWith("/about")) return "about";
    if (location.pathname.startsWith("/dashboard")) return "dashboard";
    return "home";
  }, [location.pathname]);

  const navItems: MenuProps["items"] = [
    {
      key: "home",
      icon: <HomeOutlined />,
      label: <Link to="/">首页</Link>,
    },
    {
      key: "archive",
      icon: <ProfileOutlined />,
      label: <Link to="/archive">归档</Link>,
    },
    {
      key: "about",
      label: <Link to="/about">关于</Link>,
    },
    {
      key: "dashboard",
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">仪表盘</Link>,
    },
  ];

  const userItems: MenuProps["items"] = isAuthed
    ? [
        {
          key: "editor",
          label: "写文章",
          onClick: () => navigate("/editor"),
        },
        {
          key: "settings",
          label: "个人设置",
          onClick: () => navigate("/settings"),
        },
        {
          key: "logout",
          icon: <LogoutOutlined />,
          label: "退出登录",
          onClick: () => {
            logout();
            navigate("/");
          },
        },
      ]
    : [
        {
          key: "login",
          icon: <LoginOutlined />,
          label: "登录 / 注册",
          onClick: () => navigate("/login"),
        },
      ];

  useEffect(() => {
    window.scrollTo(0, 0);
    setMenuOpen(false);
  }, [location.pathname]);

  function submitSearch() {
    const next = searchValue.trim();
    navigate(next ? `/?q=${encodeURIComponent(next)}` : "/");
  }

  return (
    <Layout className="blogShell">
      <Header className="blogHeader">
        <div className="blogHeaderInner">
          <Link to="/" className="blogBrandLink">
            <Typography.Title level={4} className="blogBrand">
              Tiiny Blog
            </Typography.Title>
          </Link>

          {screens.md ? (
            <Menu
              mode="horizontal"
              selectedKeys={[selectedKey]}
              items={navItems}
              className="blogNavMenu"
            />
          ) : (
            <Button icon={<MenuOutlined />} onClick={() => setMenuOpen(true)}>
              菜单
            </Button>
          )}

          <Space size={10} className="blogHeaderActions">
            {screens.lg && (
              <Input
                placeholder="搜索文章"
                prefix={<SearchOutlined />}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onPressEnter={submitSearch}
                className="blogHeaderSearch"
              />
            )}
            <Button type="primary" onClick={() => navigate("/editor")}>发布文章</Button>
            <Dropdown menu={{ items: userItems }} trigger={["click"]}>
              <Button type="text" className="blogUserButton">
                <Space>
                  <Avatar size={28} icon={<UserOutlined />} />
                  <span>{state?.user?.displayName ?? "访客"}</span>
                </Space>
              </Button>
            </Dropdown>
          </Space>
        </div>
      </Header>

      <Content className="blogContent">
        <div className="blogContentInner">
          <Outlet />
        </div>
      </Content>

      <Drawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="导航"
        placement="left"
        width={280}
      >
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <Input.Search
            placeholder="搜索文章"
            allowClear
            enterButton="搜索"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            onSearch={() => {
              submitSearch();
              setMenuOpen(false);
            }}
          />
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={navItems}
            onClick={() => setMenuOpen(false)}
          />
          <Button block type="primary" onClick={() => {
            setMenuOpen(false);
            navigate("/editor");
          }}>
            发布文章
          </Button>
        </Space>
      </Drawer>
    </Layout>
  );
}
