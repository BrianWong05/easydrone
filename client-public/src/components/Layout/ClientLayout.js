import React, { useState, useEffect } from "react";
import { Layout, Menu, Typography, Space, Spin, Alert } from "antd";
import { Link, useLocation } from "react-router-dom";
import {
  TrophyOutlined,
  TeamOutlined,
  GroupOutlined,
  CalendarOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import axios from "axios";

const { Header, Sider } = Layout;
const { Title, Text } = Typography;

const ClientLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();

  // Fetch the active tournament for public display
  useEffect(() => {
    fetchActiveTournament();
  }, []);

  const fetchActiveTournament = async () => {
    try {
      setLoading(true);
      // First try to get the tournament marked as public/active for display
      const response = await axios.get('/api/tournaments/public');
      
      if (response.data.success && response.data.data) {
        setTournament(response.data.data);
      } else {
        // Fallback: get the first active tournament
        const fallbackResponse = await axios.get('/api/tournaments?status=active&limit=1');
        if (fallbackResponse.data.success && fallbackResponse.data.data.tournaments.length > 0) {
          setTournament(fallbackResponse.data.data.tournaments[0]);
        } else {
          setError('目前沒有可顯示的錦標賽');
        }
      }
    } catch (error) {
      console.error('Error fetching tournament:', error);
      setError('載入錦標賽資料失敗');
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      key: '/leaderboard',
      icon: <BarChartOutlined />,
      label: <Link to="/leaderboard">積分榜</Link>,
    },
    {
      key: '/teams',
      icon: <TeamOutlined />,
      label: <Link to="/teams">隊伍</Link>,
    },
    {
      key: '/groups',
      icon: <GroupOutlined />,
      label: <Link to="/groups">小組</Link>,
    },
    {
      key: '/matches',
      icon: <CalendarOutlined />,
      label: <Link to="/matches">比賽</Link>,
    },
    {
      key: '/bracket',
      icon: <ThunderboltOutlined />,
      label: <Link to="/bracket">淘汰賽對戰表</Link>,
    },
  ];

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column'
        }}>
          <Spin size="large" />
          <Text style={{ marginTop: 16 }}>載入錦標賽資料中...</Text>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          padding: '0 24px'
        }}>
          <Alert
            message="載入失敗"
            description={error}
            type="error"
            showIcon
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        theme="light"
        width={250}
      >
        <div style={{ 
          padding: '16px', 
          borderBottom: '1px solid #f0f0f0',
          textAlign: 'center'
        }}>
          <Space direction="vertical" size="small">
            <TrophyOutlined style={{ fontSize: 32, color: '#faad14' }} />
            {!collapsed && (
              <>
                <Title level={4} style={{ margin: 0, fontSize: 16 }}>
                  {tournament?.tournament_name || '錦標賽'}
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {tournament?.tournament_type === 'group' && '小組賽'}
                  {tournament?.tournament_type === 'knockout' && '淘汰賽'}
                  {tournament?.tournament_type === 'mixed' && '混合賽制'}
                </Text>
              </>
            )}
          </Space>
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ borderRight: 0 }}
        />
      </Sider>
      
      <Layout>
        <Header style={{ 
          background: '#fff', 
          padding: '0 24px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Title level={3} style={{ margin: 0 }}>
            {tournament?.tournament_name || '無人機足球錦標賽'}
          </Title>
          <Space>
            <Text type="secondary">公開賽事資訊</Text>
          </Space>
        </Header>
        {children}
      </Layout>
    </Layout>
  );
};

export default ClientLayout;