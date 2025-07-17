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
  LockOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ArrowLeftOutlined,
  HomeOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useTranslation } from 'react-i18next';
import axios from "axios";
import { useAuthStore } from "../../stores/authStore";
import LanguageSwitcher from "../LanguageSwitcher";

const { Header, Sider } = Layout;

const TournamentLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [tournament, setTournament] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { logout, user } = useAuthStore();
  const { t } = useTranslation(['tournament', 'common']);

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
      label: <Link to={`/tournaments/${id}`}>{t('tournament:navigation.overview')}</Link>,
    },
    {
      key: `/tournaments/${id}/teams`,
      icon: <TeamOutlined />,
      label: t('tournament:navigation.teamManagement'),
      children: [
        {
          key: `/tournaments/${id}/teams`,
          label: <Link to={`/tournaments/${id}/teams`}>{t('common:navigation.teamList')}</Link>,
        },
        {
          key: `/tournaments/${id}/teams/create`,
          label: <Link to={`/tournaments/${id}/teams/create`}>{t('common:navigation.addTeam')}</Link>,
        },
      ],
    },
    {
      key: `/tournaments/${id}/groups`,
      icon: <GroupOutlined />,
      label: t('tournament:navigation.groupManagement'),
      children: [
        {
          key: `/tournaments/${id}/groups`,
          label: <Link to={`/tournaments/${id}/groups`}>{t('common:navigation.groupList')}</Link>,
        },
        {
          key: `/tournaments/${id}/groups/create`,
          label: <Link to={`/tournaments/${id}/groups/create`}>{t('common:navigation.addGroup')}</Link>,
        },
      ],
    },
    {
      key: `/tournaments/${id}/matches`,
      icon: <CalendarOutlined />,
      label: t('tournament:navigation.matchManagement'),
      children: [
        {
          key: `/tournaments/${id}/matches`,
          label: <Link to={`/tournaments/${id}/matches`}>{t('common:navigation.matchList')}</Link>,
        },
        {
          key: `/tournaments/${id}/matches/create`,
          label: <Link to={`/tournaments/${id}/matches/create`}>{t('common:navigation.addMatch')}</Link>,
        },
        {
          key: `/tournaments/${id}/matches/generate`,
          label: <Link to={`/tournaments/${id}/matches/generate`}>{t('common:navigation.generateMatches')}</Link>,
        },
      ],
    },
    {
      key: `/tournaments/${id}/athletes`,
      icon: <UserOutlined />,
      label: t('tournament:navigation.athleteManagement'),
      children: [
        {
          key: `/tournaments/${id}/athletes`,
          label: <Link to={`/tournaments/${id}/athletes`}>{t('common:navigation.athleteList')}</Link>,
        },
        {
          key: `/tournaments/${id}/athletes/create`,
          label: <Link to={`/tournaments/${id}/athletes/create`}>{t('common:navigation.addAthlete')}</Link>,
        },
      ],
    },
    {
      key: `/tournaments/${id}/leaderboard`,
      icon: <BarChartOutlined />,
      label: t('tournament:navigation.leaderboard'),
      children: [
        {
          key: `/tournaments/${id}/leaderboard/groups`,
          label: <Link to={`/tournaments/${id}/leaderboard/groups`}>{t('tournament:navigation.groupLeaderboard')}</Link>,
        },
        {
          key: `/tournaments/${id}/leaderboard/overall`,
          label: <Link to={`/tournaments/${id}/leaderboard/overall`}>{t('tournament:navigation.overallLeaderboard')}</Link>,
        },
        {
          key: `/tournaments/${id}/leaderboard/stats`,
          label: <span className="text-gray-400 cursor-not-allowed">{t('tournament:navigation.statisticsData')}</span>,
          disabled: true,
        },
        {
          key: `/tournaments/${id}/leaderboard/best-teams`,
          label: <Link to={`/tournaments/${id}/leaderboard/best-teams`}>{t('tournament:navigation.bestTeamsStats')}</Link>,
        },
      ],
    },
    {
      key: `/tournaments/${id}/bracket`,
      icon: <ThunderboltOutlined />,
      label: <Link to={`/tournaments/${id}/bracket`}>{t('tournament:navigation.knockoutBracket')}</Link>,
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
    <Layout className="min-h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={250}
        className="overflow-auto h-screen fixed left-0 top-0 bottom-0 z-[1001]"
      >
        <div
          className={`h-16 m-4 bg-white bg-opacity-30 rounded-lg flex items-center justify-center text-white font-bold ${
            collapsed ? "text-sm" : "text-base"
          }`}
        >
          {collapsed ? "DS" : t('common:system.title')}
        </div>

        {/* Back to tournaments button */}
        <div className="px-4 mb-4">
          <Button
            type="ghost"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/")}
            className={`w-full text-white border-white border-opacity-30 ${
              collapsed ? "text-xs" : "text-sm"
            }`}
          >
            {!collapsed && t('common:navigation.backToTournamentList')}
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

      <Layout 
        className="min-h-screen"
        style={{ marginLeft: collapsed ? 80 : 250 }}
      >
        <Header className="px-6 bg-white flex items-center justify-between shadow-sm sticky top-0 z-[1000]">
          <div className="flex items-center">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="text-base w-16 h-16"
            />

            {/* Breadcrumb */}
            <Breadcrumb className="ml-4">
              <Breadcrumb.Item>
                <Link to="/">
                  <HomeOutlined /> {t('common:navigation.dashboard')}
                </Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <Link to="/">{t('common:navigation.tournaments')}</Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <Link to={`/tournaments/${id}`}>{tournament ? tournament.tournament_name : t('common:messages.loading')}</Link>
              </Breadcrumb.Item>
            </Breadcrumb>
          </div>

          <Space>
            <span className="text-gray-600">{tournament ? `${tournament.tournament_name} ${t('tournament:navigation.management')}` : t('common:navigation.tournaments')}</span>
            <LanguageSwitcher size="small" />
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'profile',
                    icon: <UserOutlined />,
                    label: t('common:user.profile'),
                  },
                  {
                    key: 'change-password',
                    icon: <LockOutlined />,
                    label: t('common:user.changePassword'),
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
                    label: t('common:user.logout'),
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
                  <span>{user?.username || t('common:user.admin')}</span>
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
