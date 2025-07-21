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
  LockOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useTranslation } from 'react-i18next';
import { useAuthStore } from "../../stores/authStore";
import LanguageSwitcher from "../LanguageSwitcher";

const { Header, Sider } = Layout;

const MainLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();
  const { t } = useTranslation();

  // Always show sidebar for admin layout
  const shouldHideSidebar = false;
  // 移除認證相關功能

  // Menu items with i18n - simplified to only tournaments and athletes
  const menuItems = [
    {
      key: "/tournaments",
      icon: <TrophyOutlined />,
      label: t('navigation.tournaments'),
      children: [
        {
          key: "/",
          label: <Link to="/">{t('navigation.tournamentList')}</Link>,
        },
        {
          key: "/tournaments/create",
          label: <Link to="/tournaments/create">{t('navigation.addTournament')}</Link>,
        },
      ],
    },
    {
      key: "/athletes",
      icon: <UserOutlined />,
      label: t('navigation.athletes'),
      children: [
        {
          key: "/global-athletes",
          label: <Link to="/global-athletes">{t('navigation.globalAthletes')}</Link>,
        },
      ],
    },
  ];

  // 移除用戶下拉菜單

  // 獲取當前選中的菜單項
  const getSelectedKeys = () => {
    const path = location.pathname;
    
    // Handle root path
    if (path === "/") return ["/"];
    
    // Handle global athletes
    if (path.startsWith("/global-athletes")) return ["/global-athletes"];
    
    // Handle tournament creation
    if (path.startsWith("/tournaments/create")) return ["/tournaments/create"];
    
    // Handle tournament detail pages (should highlight tournament list)
    if (path.startsWith("/tournaments/") && path !== "/tournaments/create") return ["/"];
    
    return [];
  };

  // 獲取展開的菜單項
  const getOpenKeys = () => {
    const path = location.pathname;
    const openKeys = [];

    // Always expand tournaments section for tournament-related pages
    if (path === "/" || path.startsWith("/tournaments")) {
      openKeys.push("/tournaments");
    }
    
    // Always expand athletes section for athlete-related pages
    if (path.startsWith("/global-athletes")) {
      openKeys.push("/athletes");
    }

    return openKeys;
  };

  return (
    <Layout className="min-h-screen">
      {!shouldHideSidebar && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          className="overflow-auto h-screen fixed left-0 top-0 bottom-0 z-[2]"
        >
          <div
            className={`h-16 m-4 bg-white bg-opacity-30 rounded-lg flex items-center justify-center text-white font-bold ${
              collapsed ? "text-sm" : "text-base"
            }`}
          >
            {collapsed ? "DS" : t('system.title').split('管理系統')[0]}
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
      <Layout 
        className="min-h-screen"
        style={{ marginLeft: shouldHideSidebar ? 0 : collapsed ? 80 : 200 }}
      >
        <Header className="px-6 bg-white flex items-center justify-between shadow-sm sticky top-0 z-[1000]">
          {!shouldHideSidebar && (
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="text-base w-16 h-16"
            />
          )}

          <div className="flex items-center justify-between w-full">
            <span className="text-gray-600">{t('system.title')}</span>
            <Space>
              <LanguageSwitcher size="small" />
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'profile',
                      icon: <UserOutlined />,
                      label: t('user.profile'),
                    },
                    {
                      key: 'change-password',
                      icon: <LockOutlined />,
                      label: t('user.changePassword'),
                      onClick: () => {
                        navigate('/change-password');
                      },
                    },
                    {
                      type: 'divider',
                    },
                    {
                      key: 'logout',
                      icon: <LogoutOutlined />,
                      label: t('user.logout'),
                      onClick: () => {
                        logout();
                        navigate('/login');
                      },
                    },
                  ],
                }}
                placement="bottomRight"
              >
                <Button type="text" className="h-auto py-2 px-3">
                  <Space>
                    <Avatar size="small" icon={<UserOutlined />} />
                    <span>{user?.username || t('user.admin')}</span>
                  </Space>
                </Button>
              </Dropdown>
            </Space>
          </div>
        </Header>
        {children}
      </Layout>
    </Layout>
  );
};

export default MainLayout;
