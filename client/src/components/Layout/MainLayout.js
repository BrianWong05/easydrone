import React, { useState } from "react";
import { Layout, Menu, Button, Avatar, Dropdown, Space } from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  DashboardOutlined,
  TeamOutlined,
  GroupOutlined,
  TrophyOutlined,
  UserOutlined,
  BarChartOutlined,
  CalendarOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "../../stores/authStore";

const { Header, Sider } = Layout;

const MainLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();

  // Check if current page is dashboard or any non-tournament page to hide sidebar
  // const shouldHideSidebar = location.pathname === "/" || !location.pathname.startsWith("/tournaments");
  const shouldHideSidebar = true; // Always show sidebar for admin layout
  // 移除認證相關功能

  // 菜單項目
  const menuItems = [
    {
      key: "/",
      icon: <DashboardOutlined />,
      label: <Link to="/">儀表板</Link>,
    },
    {
      key: "/teams",
      icon: <TeamOutlined />,
      label: "隊伍管理",
      children: [
        {
          key: "/teams",
          label: <Link to="/teams">隊伍列表</Link>,
        },
        {
          key: "/teams/create",
          label: <Link to="/teams/create">新增隊伍</Link>,
        },
      ],
    },
    {
      key: "/groups",
      icon: <GroupOutlined />,
      label: "小組管理",
      children: [
        {
          key: "/groups",
          label: <Link to="/groups">小組列表</Link>,
        },
        {
          key: "/groups/create",
          label: <Link to="/groups/create">新增小組</Link>,
        },
        {
          key: "/groups/leaderboard",
          label: <Link to="/groups/leaderboard">小組排行榜</Link>,
        },
      ],
    },
    {
      key: "/matches",
      icon: <CalendarOutlined />,
      label: "比賽管理",
      children: [
        {
          key: "/matches",
          label: <Link to="/matches">比賽列表</Link>,
        },
        {
          key: "/matches/create",
          label: <Link to="/matches/create">新增比賽</Link>,
        },
      ],
    },
    {
      key: "/athletes",
      icon: <UserOutlined />,
      label: "運動員管理",
      children: [
        {
          key: "/athletes",
          label: <Link to="/athletes">運動員列表</Link>,
        },
        {
          key: "/athletes/create",
          label: <Link to="/athletes/create">新增運動員</Link>,
        },
      ],
    },
    {
      key: "/tournaments",
      icon: <TrophyOutlined />,
      label: "錦標賽管理",
      children: [
        {
          key: "/tournaments",
          label: <Link to="/tournaments">錦標賽列表</Link>,
        },
        {
          key: "/tournaments/create",
          label: <Link to="/tournaments/create">新增錦標賽</Link>,
        },
      ],
    },
    {
      key: "/stats",
      icon: <BarChartOutlined />,
      label: "統計報表",
      children: [
        {
          key: "/stats",
          label: <Link to="/stats">統計概覽</Link>,
        },
        {
          key: "/stats/groups",
          label: <Link to="/stats/groups">小組積分</Link>,
        },
      ],
    },
  ];

  // 移除用戶下拉菜單

  // 獲取當前選中的菜單項
  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path === "/") return ["/"];

    // 找到匹配的菜單項
    for (const item of menuItems) {
      if (item.children) {
        for (const child of item.children) {
          if (path.startsWith(child.key)) {
            return [child.key];
          }
        }
      } else if (path.startsWith(item.key)) {
        return [item.key];
      }
    }
    return [];
  };

  // 獲取展開的菜單項
  const getOpenKeys = () => {
    const path = location.pathname;
    const openKeys = [];

    for (const item of menuItems) {
      if (item.children) {
        for (const child of item.children) {
          if (path.startsWith(child.key)) {
            openKeys.push(item.key);
            break;
          }
        }
      }
    }
    return openKeys;
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {!shouldHideSidebar && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          style={{
            overflow: "auto",
            height: "100vh",
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 2,
          }}
        >
          <div
            className="logo"
            style={{
              height: 64,
              margin: 16,
              background: "rgba(255, 255, 255, 0.3)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "bold",
              fontSize: collapsed ? 14 : 16,
            }}
          >
            {collapsed ? "DS" : "無人機足球"}
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={getSelectedKeys()}
            defaultOpenKeys={getOpenKeys()}
            items={menuItems}
          />
        </Sider>
      )}
      <Layout style={{ marginLeft: shouldHideSidebar ? 0 : collapsed ? 80 : 200, minHeight: "100vh" }}>
        <Header
          style={{
            padding: "0 24px",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 4px rgba(0,21,41,.08)",
            position: "sticky",
            top: 0,
            zIndex: 1000,
          }}
        >
          {!shouldHideSidebar && (
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: "16px",
                width: 64,
                height: 64,
              }}
            />
          )}

          <Space>
            <span style={{ color: "#666" }}>無人機足球管理系統</span>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'profile',
                    icon: <UserOutlined />,
                    label: '個人資料',
                  },
                  {
                    type: 'divider',
                  },
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    label: '登出',
                    onClick: () => {
                      logout();
                      navigate('/login');
                    },
                  },
                ],
              }}
              placement="bottomRight"
            >
              <Button type="text" style={{ height: 'auto', padding: '8px 12px' }}>
                <Space>
                  <Avatar size="small" icon={<UserOutlined />} />
                  <span>{user?.username || 'Admin'}</span>
                </Space>
              </Button>
            </Dropdown>
          </Space>
        </Header>
        {children}
      </Layout>
    </Layout>
  );
};

export default MainLayout;
