import React, { useState, useEffect } from "react";
import { Layout, Menu, Button, Avatar, Dropdown, Space, Breadcrumb } from "antd";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
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
  ArrowLeftOutlined,
  HomeOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { useAuthStore } from "../../stores/authStore";

const { Header, Sider } = Layout;

const TournamentLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [tournament, setTournament] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { logout, user } = useAuthStore();

  // Fetch tournament data
  useEffect(() => {
    // Only fetch if id exists and is a number (not 'create' or other strings)
    if (id && !isNaN(id)) {
      fetchTournament();
    }
  }, [id]);

  const fetchTournament = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${id}`);
      if (response.data.success) {
        // Handle both possible data structures
        const tournamentData = response.data.data.tournament || response.data.data;
        setTournament(tournamentData);
        console.log("🏆 Tournament data loaded for breadcrumb:", tournamentData);
      }
    } catch (error) {
      console.error("Error fetching tournament:", error);
    }
  };

  // Tournament-specific menu items
  const tournamentMenuItems = [
    {
      key: `/tournaments/${id}`,
      icon: <TrophyOutlined />,
      label: <Link to={`/tournaments/${id}`}>錦標賽概覽</Link>,
    },
    {
      key: `/tournaments/${id}/teams`,
      icon: <TeamOutlined />,
      label: "隊伍管理",
      children: [
        {
          key: `/tournaments/${id}/teams`,
          label: <Link to={`/tournaments/${id}/teams`}>隊伍列表</Link>,
        },
        {
          key: `/tournaments/${id}/teams/create`,
          label: <Link to={`/tournaments/${id}/teams/create`}>新增隊伍</Link>,
        },
      ],
    },
    {
      key: `/tournaments/${id}/groups`,
      icon: <GroupOutlined />,
      label: "小組管理",
      children: [
        {
          key: `/tournaments/${id}/groups`,
          label: <Link to={`/tournaments/${id}/groups`}>小組列表</Link>,
        },
        {
          key: `/tournaments/${id}/groups/create`,
          label: <Link to={`/tournaments/${id}/groups/create`}>新增小組</Link>,
        },
      ],
    },
    {
      key: `/tournaments/${id}/matches`,
      icon: <CalendarOutlined />,
      label: "比賽管理",
      children: [
        {
          key: `/tournaments/${id}/matches`,
          label: <Link to={`/tournaments/${id}/matches`}>比賽列表</Link>,
        },
        {
          key: `/tournaments/${id}/matches/create`,
          label: <Link to={`/tournaments/${id}/matches/create`}>新增比賽</Link>,
        },
        {
          key: `/tournaments/${id}/matches/generate`,
          label: <Link to={`/tournaments/${id}/matches/generate`}>生成比賽</Link>,
        },
      ],
    },
    {
      key: `/tournaments/${id}/athletes`,
      icon: <UserOutlined />,
      label: "運動員管理",
      children: [
        {
          key: `/tournaments/${id}/athletes`,
          label: <Link to={`/tournaments/${id}/athletes`}>運動員列表</Link>,
        },
        {
          key: `/tournaments/${id}/athletes/create`,
          label: <Link to={`/tournaments/${id}/athletes/create`}>新增運動員</Link>,
        },
      ],
    },
    {
      key: `/tournaments/${id}/leaderboard`,
      icon: <BarChartOutlined />,
      label: "積分榜",
      children: [
        {
          key: `/tournaments/${id}/leaderboard/groups`,
          label: <Link to={`/tournaments/${id}/leaderboard/groups`}>小組積分榜</Link>,
        },
        {
          key: `/tournaments/${id}/leaderboard/overall`,
          label: <Link to={`/tournaments/${id}/leaderboard/overall`}>總積分榜</Link>,
        },
        {
          key: `/tournaments/${id}/leaderboard/stats`,
          label: <Link to={`/tournaments/${id}/leaderboard/stats`}>統計數據</Link>,
        },
      ],
    },
    {
      key: `/tournaments/${id}/bracket`,
      icon: <ThunderboltOutlined />,
      label: <Link to={`/tournaments/${id}/bracket`}>淘汰賽對戰表</Link>,
    },
  ];

  // Get selected keys based on current path
  const getSelectedKeys = () => {
    const path = location.pathname;
    return [path];
  };

  // Get open keys for submenu
  const getOpenKeys = () => {
    const path = location.pathname;
    const openKeys = [];

    if (path.includes("/teams")) openKeys.push(`/tournaments/${id}/teams`);
    if (path.includes("/groups")) openKeys.push(`/tournaments/${id}/groups`);
    if (path.includes("/matches")) openKeys.push(`/tournaments/${id}/matches`);
    if (path.includes("/athletes")) openKeys.push(`/tournaments/${id}/athletes`);
    if (path.includes("/leaderboard")) openKeys.push(`/tournaments/${id}/leaderboard`);

    return openKeys;
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
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
          zIndex: 1001,
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

        {/* Back to tournaments button */}
        <div style={{ padding: "0 16px", marginBottom: 16 }}>
          <Button
            type="ghost"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/")}
            style={{
              width: "100%",
              color: "white",
              borderColor: "rgba(255, 255, 255, 0.3)",
              fontSize: collapsed ? 12 : 14,
            }}
          >
            {!collapsed && "返回錦標賽列表"}
          </Button>
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={tournamentMenuItems}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 200, minHeight: "100vh" }}>
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
          <div style={{ display: "flex", alignItems: "center" }}>
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

            {/* Breadcrumb */}
            <Breadcrumb style={{ marginLeft: 16 }}>
              <Breadcrumb.Item>
                <Link to="/">
                  <HomeOutlined /> 首頁
                </Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <Link to="/">錦標賽</Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <Link to={`/tournaments/${id}`}>{tournament ? tournament.tournament_name : "載入中..."}</Link>
              </Breadcrumb.Item>
            </Breadcrumb>
          </div>

          <Space>
            <span style={{ color: "#666" }}>{tournament ? `${tournament.tournament_name} 管理` : "錦標賽管理"}</span>
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

export default TournamentLayout;
