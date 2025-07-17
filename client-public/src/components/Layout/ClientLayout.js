import React, { useState, useEffect } from "react";
import { Layout, Menu, Space, Spin, Alert, Drawer } from "antd";
import { Link, useLocation } from "react-router-dom";
import {
  TrophyOutlined,
  TeamOutlined,
  GroupOutlined,
  CalendarOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  MenuOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import axios from "axios";
import LanguageSwitcher from "../LanguageSwitcher";

const { Header, Sider } = Layout;

const ClientLayout = ({ children }) => {
  const { t } = useTranslation(['public', 'common']);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch the active tournament for public display
  useEffect(() => {
    fetchActiveTournament();
  }, []);

  const fetchActiveTournament = async () => {
    try {
      setLoading(true);
      // First try to get the tournament marked as public/active for display
      const response = await axios.get("/api/tournaments/public");

      if (response.data.success && response.data.data) {
        setTournament(response.data.data);
      } else {
        // Fallback: get the first active tournament
        const fallbackResponse = await axios.get("/api/tournaments?status=active&limit=1");
        if (fallbackResponse.data.success && fallbackResponse.data.data.tournaments.length > 0) {
          setTournament(fallbackResponse.data.data.tournaments[0]);
        } else {
          setError(t('public:layout.noActiveTournament'));
        }
      }
    } catch (error) {
      console.error("Error fetching tournament:", error);
      setError(t('public:layout.tournamentLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      key: "/leaderboard",
      icon: <BarChartOutlined />,
      label: (
        <Link to="/leaderboard" onClick={() => setMobileDrawerOpen(false)}>
          {t('public:navigation.leaderboard')}
        </Link>
      ),
    },
    {
      key: "/teams",
      icon: <TeamOutlined />,
      label: (
        <Link to="/teams" onClick={() => setMobileDrawerOpen(false)}>
          {t('public:navigation.teams')}
        </Link>
      ),
    },
    {
      key: "/groups",
      icon: <GroupOutlined />,
      label: (
        <Link to="/groups" onClick={() => setMobileDrawerOpen(false)}>
          {t('public:navigation.groups')}
        </Link>
      ),
    },
    {
      key: "/matches",
      icon: <CalendarOutlined />,
      label: (
        <Link to="/matches" onClick={() => setMobileDrawerOpen(false)}>
          {t('public:navigation.matches')}
        </Link>
      ),
    },
    {
      key: "/bracket",
      icon: <ThunderboltOutlined />,
      label: (
        <Link to="/bracket" onClick={() => setMobileDrawerOpen(false)}>
          {t('public:navigation.bracket')}
        </Link>
      ),
    },
    {
      key: "/best-teams",
      icon: <BarChartOutlined />,
      label: (
        <Link to="/best-teams" onClick={() => setMobileDrawerOpen(false)}>
          {t('public:navigation.bestTeams')}
        </Link>
      ),
    },
  ];

  const renderSidebarContent = () => (
    <>
      <div className="p-4 border-b border-gray-200 text-center">
        <div className="flex flex-col items-center gap-2">
          <TrophyOutlined className="text-3xl text-yellow-500" />
          {(!collapsed || isMobile) && (
            <>
              <h4 className="m-0 text-base text-gray-800 font-semibold">
                {tournament?.tournament_name || t('public:layout.title')}
              </h4>
              <span className="text-xs text-gray-500">
                {tournament?.tournament_type === "group" && t('public:tournamentTypes.group')}
                {tournament?.tournament_type === "knockout" && t('public:tournamentTypes.knockout')}
                {tournament?.tournament_type === "mixed" && t('public:tournamentTypes.mixed')}
              </span>
            </>
          )}
        </div>
      </div>

      <Menu mode="inline" selectedKeys={[location.pathname]} items={menuItems} className="border-r-0" />
    </>
  );

  if (loading) {
    return (
      <Layout className="min-h-screen">
        <div className="flex justify-center items-center h-screen flex-col">
          <Spin size="large" />
          <span className="mt-4 text-gray-600">{t('public:layout.loadingTournament')}</span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout className="min-h-screen">
        <div className="flex justify-center items-center h-screen px-6">
          <Alert 
            message={t('public:layout.loadFailed')} 
            description={error} 
            type="error" 
            showIcon 
            className="max-w-md"
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout className="min-h-screen">
      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          title={null}
          placement="left"
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          bodyStyle={{ padding: 0 }}
          width={250}
          className="md:hidden"
        >
          {renderSidebarContent()}
        </Drawer>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <div
          className="fixed left-0 top-0 h-screen overflow-hidden transition-all duration-300 ease-out z-50"
          style={{
            width: sidebarHidden ? 0 : collapsed ? 80 : 250,
          }}
        >
          <Sider
            trigger={null}
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            theme="light"
            width={250}
            className="h-screen fixed left-0 top-0 z-10 transition-transform duration-300 ease-out shadow-lg"
            style={{
              transform: sidebarHidden ? "translateX(-100%)" : "translateX(0)",
            }}
          >
            {renderSidebarContent()}
          </Sider>
        </div>
      )}

      <Layout 
        className="min-h-screen transition-all duration-300 ease-out"
        style={{ marginLeft: isMobile ? 0 : collapsed ? 80 : 250 }}
      >
        <Header className="bg-white border-b border-gray-200 flex items-center justify-between sticky top-0 z-40 shadow-sm transition-all duration-300 ease-out"
          style={{
            padding: isMobile ? "0 16px" : "0 24px",
            height: isMobile ? 56 : 64,
          }}
        >
          <div className="flex items-center">
            {isMobile ? (
              <MenuOutlined
                className="mobile-menu-trigger mr-4 text-lg cursor-pointer text-gray-600 hover:text-blue-600 transition-colors duration-200"
                onClick={() => setMobileDrawerOpen(true)}
              />
            ) : (
              <div
                onClick={() => setCollapsed(!collapsed)}
                className="mr-4 text-lg cursor-pointer p-1 rounded flex items-center justify-center w-8 h-8 hover:bg-gray-100 hover:scale-110 transition-all duration-300 ease-out"
                title={collapsed ? t('public:layout.expandSidebar') : t('public:layout.collapseSidebar')}
              >
                <div
                  className="transition-transform duration-200 ease-in-out"
                  style={{
                    transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                </div>
              </div>
            )}
            <h3
              className="m-0 text-gray-800 font-bold"
              style={{
                fontSize: isMobile ? 16 : 24,
              }}
            >
              {isMobile ? t('public:layout.title') : tournament?.tournament_name || t('public:layout.tournamentName')}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher size="small" />
            <span 
              className="text-gray-500"
              style={{ fontSize: isMobile ? 12 : 14 }}
            >
              {t('public:layout.subtitle')}
            </span>
          </div>
        </Header>
        {children}
      </Layout>
    </Layout>
  );
};

export default ClientLayout;
