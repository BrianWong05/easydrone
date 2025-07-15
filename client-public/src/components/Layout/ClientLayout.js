import React, { useState, useEffect } from "react";
import { Layout, Menu, Typography, Space, Spin, Alert, Drawer } from "antd";
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
import axios from "axios";

const { Header, Sider } = Layout;
const { Title, Text } = Typography;

const ClientLayout = ({ children }) => {
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
          setError("目前沒有可顯示的錦標賽");
        }
      }
    } catch (error) {
      console.error("Error fetching tournament:", error);
      setError("載入錦標賽資料失敗");
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
          積分榜
        </Link>
      ),
    },
    {
      key: "/teams",
      icon: <TeamOutlined />,
      label: (
        <Link to="/teams" onClick={() => setMobileDrawerOpen(false)}>
          隊伍
        </Link>
      ),
    },
    {
      key: "/groups",
      icon: <GroupOutlined />,
      label: (
        <Link to="/groups" onClick={() => setMobileDrawerOpen(false)}>
          小組
        </Link>
      ),
    },
    {
      key: "/matches",
      icon: <CalendarOutlined />,
      label: (
        <Link to="/matches" onClick={() => setMobileDrawerOpen(false)}>
          比賽
        </Link>
      ),
    },
    {
      key: "/bracket",
      icon: <ThunderboltOutlined />,
      label: (
        <Link to="/bracket" onClick={() => setMobileDrawerOpen(false)}>
          淘汰賽對戰表
        </Link>
      ),
    },
    {
      key: "/best-teams",
      icon: <BarChartOutlined />,
      label: (
        <Link to="/best-teams" onClick={() => setMobileDrawerOpen(false)}>
          最佳球隊統計
        </Link>
      ),
    },
  ];

  const renderSidebarContent = () => (
    <>
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #f0f0f0",
          textAlign: "center",
        }}
      >
        <Space direction="vertical" size="small">
          <TrophyOutlined style={{ fontSize: 32, color: "#faad14" }} />
          {(!collapsed || isMobile) && (
            <>
              <Title level={4} style={{ margin: 0, fontSize: 16 }}>
                {tournament?.tournament_name || "錦標賽"}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tournament?.tournament_type === "group" && "小組賽"}
                {tournament?.tournament_type === "knockout" && "淘汰賽"}
                {tournament?.tournament_type === "mixed" && "混合賽制"}
              </Text>
            </>
          )}
        </Space>
      </div>

      <Menu mode="inline" selectedKeys={[location.pathname]} items={menuItems} style={{ borderRight: 0 }} />
    </>
  );

  if (loading) {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            flexDirection: "column",
          }}
        >
          <Spin size="large" />
          <Text style={{ marginTop: 16 }}>載入錦標賽資料中...</Text>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            padding: "0 24px",
          }}
        >
          <Alert message="載入失敗" description={error} type="error" showIcon />
        </div>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          title={null}
          placement="left"
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          bodyStyle={{ padding: 0 }}
          width={250}
        >
          {renderSidebarContent()}
        </Drawer>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <div
          style={{
            width: sidebarHidden ? 0 : collapsed ? 80 : 250,
            transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            overflow: "hidden",
            position: "fixed",
            left: 0,
            top: 0,
            zIndex: 1001,
            height: "100vh",
          }}
        >
          <Sider
            trigger={null}
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            theme="light"
            width={250}
            style={{
              height: "100vh",
              position: "fixed",
              left: 0,
              top: 0,
              zIndex: 1,
              transform: sidebarHidden ? "translateX(-100%)" : "translateX(0)",
              transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {renderSidebarContent()}
          </Sider>
        </div>
      )}

      <Layout style={{ marginLeft: isMobile ? 0 : collapsed ? 80 : 250, minHeight: "100vh" }}>
        <Header
          style={{
            background: "#fff",
            padding: isMobile ? "0 16px" : "0 24px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: isMobile ? 56 : 64,
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            position: "sticky",
            top: 0,
            zIndex: 99,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            {isMobile ? (
              <MenuOutlined
                className="mobile-menu-trigger"
                onClick={() => setMobileDrawerOpen(true)}
                style={{ marginRight: 16, fontSize: 18, cursor: "pointer" }}
              />
            ) : (
              <div
                onClick={() => setCollapsed(!collapsed)}
                style={{
                  marginRight: 16,
                  fontSize: 18,
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  transform: "scale(1)",
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f5f5f5";
                  e.currentTarget.style.transform = "scale(1.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.transform = "scale(1)";
                }}
                title={collapsed ? "展開側邊欄" : "收合側邊欄"}
              >
                <div
                  style={{
                    transition: "transform 0.2s ease-in-out",
                    transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                </div>
              </div>
            )}
            <Title
              level={3}
              style={{
                margin: 0,
                fontSize: isMobile ? 16 : 24,
              }}
            >
              {isMobile ? "錦標賽" : tournament?.tournament_name || "無人機足球錦標賽"}
            </Title>
          </div>
          <Space>
            <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>
              公開賽事資訊
            </Text>
          </Space>
        </Header>
        {children}
      </Layout>
    </Layout>
  );
};

export default ClientLayout;
