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

  // Check if current page is dashboard or any non-tournament page to hide sidebar
  // const shouldHideSidebar = location.pathname === "/" || !location.pathname.startsWith("/tournaments");
  const shouldHideSidebar = true; // Always show sidebar for admin layout
  // 移除認證相關功能

  // Menu items with i18n
  const menuItems = [
    {
      key: "/",
      icon: <DashboardOutlined />,
      label: <Link to="/">{t('navigation.dashboard')}</Link>,
    },
    {
      key: "/teams",
      icon: <TeamOutlined />,
      label: t('navigation.teams'),
      children: [
        {
          key: "/teams",
          label: <Link to="/teams">{t('navigation.teamList')}</Link>,
        },
        {
          key: "/teams/create",
          label: <Link to="/teams/create">{t('navigation.addTeam')}</Link>,
        },
      ],
    },
    {
      key: "/groups",
      icon: <GroupOutlined />,
      label: t('navigation.groups'),
      children: [
        {
          key: "/groups",
          label: <Link to="/groups">{t('navigation.groupList')}</Link>,
        },
        {
          key: "/groups/create",
          label: <Link to="/groups/create">{t('navigation.addGroup')}</Link>,
        },
        {
          key: "/groups/leaderboard",
          label: <Link to="/groups/leaderboard">{t('navigation.groupStandings')}</Link>,
        },
      ],
    },
    {
      key: "/matches",
      icon: <CalendarOutlined />,
      label: t('navigation.matches'),
      children: [
        {
          key: "/matches",
          label: <Link to="/matches">{t('navigation.matchList')}</Link>,
        },
        {
          key: "/matches/create",
          label: <Link to="/matches/create">{t('navigation.addMatch')}</Link>,
        },
      ],
    },
    {
      key: "/athletes",
      icon: <UserOutlined />,
      label: t('navigation.athletes'),
      children: [
        {
          key: "/athletes",
          label: <Link to="/athletes">{t('navigation.athleteList')}</Link>,
        },
        {
          key: "/athletes/create",
          label: <Link to="/athletes/create">{t('navigation.addAthlete')}</Link>,
        },
      ],
    },
    {
      key: "/tournaments",
      icon: <TrophyOutlined />,
      label: t('navigation.tournaments'),
      children: [
        {
          key: "/tournaments",
          label: <Link to="/tournaments">{t('navigation.tournamentList')}</Link>,
        },
        {
          key: "/tournaments/create",
          label: <Link to="/tournaments/create">{t('navigation.addTournament')}</Link>,
        },
      ],
    },
    {
      key: "/stats",
      icon: <BarChartOutlined />,
      label: t('navigation.stats'),
      children: [
        {
          key: "/stats",
          label: <Link to="/stats">{t('navigation.statsOverview')}</Link>,
        },
        {
          key: "/stats/group-standings",
          label: <Link to="/stats/group-standings">{t('navigation.groupStandings')}</Link>,
        },
        {
          key: "/stats/overall-leaderboard",
          label: <Link to="/stats/overall-leaderboard">{t('navigation.overallLeaderboard')}</Link>,
        },
        {
          key: "/stats/best-teams",
          label: <Link to="/stats/best-teams">{t('navigation.bestTeamsStats')}</Link>,
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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ color: "#666" }}>{t('system.title')}</span>
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
                <Button type="text" style={{ height: 'auto', padding: '8px 12px' }}>
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
