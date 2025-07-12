import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, Space, Table, Tag, Progress, List, Avatar } from 'antd';
import {
  TeamOutlined,
  TrophyOutlined,
  CalendarOutlined,
  UserOutlined,
  RiseOutlined,
  FallOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    teams: 0,
    tournaments: 0,
    matches: 0,
    athletes: 0,
  });
  const [recentMatches, setRecentMatches] = useState([]);
  const [topTeams, setTopTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Custom sorting function for match numbers (same as MatchList)
  const sortMatchNumber = (a, b) => {
    const aNumber = a.match_number || '';
    const bNumber = b.match_number || '';
    
    // Extract first character (group letter)
    const aGroup = aNumber.charAt(0);
    const bGroup = bNumber.charAt(0);
    
    // Extract last 2 characters as integer (match number)
    const aMatch = parseInt(aNumber.slice(-2)) || 0;
    const bMatch = parseInt(bNumber.slice(-2)) || 0;
    
    // First sort by match number (01, 02, 03...)
    if (aMatch !== bMatch) {
      return aMatch - bMatch;
    }
    
    // Then sort by group letter (A, B, C...)
    return aGroup.localeCompare(bGroup);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('📊 開始獲取儀表板數據...');
        
        // 獲取統計數據 - 分別處理每個API調用
        const apiCalls = [
          { name: 'teams', url: '/api/teams' },
          { name: 'matches', url: '/api/matches?page=1&limit=1000' }, // 獲取所有比賽
          { name: 'athletes', url: '/api/athletes' },
          { name: 'tournaments', url: '/api/tournaments' }
        ];

        const results = {};
        
        for (const api of apiCalls) {
          try {
            console.log(`📡 調用 ${api.name} API: ${api.url}`);
            const response = await axios.get(api.url);
            console.log(`✅ ${api.name} API 響應:`, response.data);
            results[api.name] = response.data;
          } catch (error) {
            console.error(`❌ ${api.name} API 失敗:`, error.response?.status, error.response?.data || error.message);
            results[api.name] = { success: false, data: {} };
          }
        }

        // 設置統計數據
        const newStats = {
          teams: results.teams?.success ? (results.teams.data?.pagination?.total || results.teams.data?.teams?.length || 0) : 0,
          matches: results.matches?.success ? (results.matches.data?.pagination?.total || results.matches.data?.matches?.length || 0) : 0,
          athletes: results.athletes?.success ? (results.athletes.data?.pagination?.total || results.athletes.data?.athletes?.length || 0) : 0,
          tournaments: results.tournaments?.success ? (results.tournaments.data?.pagination?.total || results.tournaments.data?.tournaments?.length || 0) : 0,
        };
        
        console.log('📊 統計數據:', newStats);
        setStats(newStats);

        // 獲取最近比賽並應用自定義排序
        const recentMatchesData = results.matches?.success ? (results.matches.data?.matches || []) : [];
        console.log('⚽ 原始比賽數據:', recentMatchesData);
        console.log('⚽ 比賽數量:', recentMatchesData.length);
        
        const formattedMatches = recentMatchesData.map(match => ({
          id: match.match_id,
          team1: match.team1_name || '未知隊伍',
          team2: match.team2_name || '未知隊伍',
          score1: match.team1_score || 0,
          score2: match.team2_score || 0,
          status: match.match_status || 'pending',
          date: match.match_date,
          group: match.group_name || '淘汰賽',
          match_number: match.match_number || '', // 添加 match_number 用於排序
        }))
        .sort(sortMatchNumber); // 應用自定義排序
        
        console.log('⚽ 排序後的比賽:', formattedMatches.map(m => m.match_number));
        
        const topMatches = formattedMatches.slice(0, 5); // 排序後取前5場
        console.log('⚽ 最終顯示的比賽:', topMatches.map(m => m.match_number));
        
        setRecentMatches(topMatches);

        // 獲取小組積分榜前4名
        try {
          console.log('📈 獲取積分榜數據...');
          const statsRes = await axios.get('/api/stats/groups');
          console.log('📈 積分榜 API 響應:', statsRes.data);
          
          const allStandings = statsRes.data.data?.standings || [];
          const topTeams = allStandings
            .sort((a, b) => (b.points || 0) - (a.points || 0))
            .slice(0, 4)
            .map((team, index) => ({
              rank: index + 1,
              name: team.team_name || '未知隊伍',
              points: team.points || 0,
              played: team.played || 0,
              won: team.won || 0,
              drawn: team.drawn || 0,
              lost: team.lost || 0,
              trend: (team.points || 0) > 6 ? 'up' : (team.points || 0) > 3 ? 'stable' : 'down',
            }));
          
          console.log('🏆 頂級隊伍:', topTeams);
          setTopTeams(topTeams);
        } catch (statsError) {
          console.error('❌ 獲取積分榜失敗:', statsError.response?.status, statsError.response?.data || statsError.message);
          setTopTeams([]);
        }

        console.log('✅ 儀表板數據獲取完成');
        setLoading(false);
      } catch (error) {
        console.error('❌ 獲取儀表板數據失敗:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const matchColumns = [
    {
      title: '比賽編號',
      dataIndex: 'match_number',
      key: 'match_number',
      width: 100,
      render: (text, record) => (
        <Text 
          strong 
          style={{ 
            color: '#1890ff', 
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
          onClick={() => navigate(`/matches/${record.id}`)}
        >
          {text}
        </Text>
      ),
    },
    {
      title: '對戰隊伍',
      key: 'match',
      render: (_, record) => (
        <div 
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(`/matches/${record.id}`)}
        >
          <Text strong style={{ color: '#1890ff' }}>{record.team1}</Text>
          <Text style={{ margin: '0 8px' }}>vs</Text>
          <Text strong style={{ color: '#1890ff' }}>{record.team2}</Text>
        </div>
      ),
    },
    {
      title: '比分',
      key: 'score',
      render: (_, record) => (
        <Text strong style={{ fontSize: '16px' }}>
          {record.status === 'completed' ? `${record.score1} - ${record.score2}` : 'vs'}
        </Text>
      ),
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'completed' ? 'green' : status === 'active' ? 'blue' : 'orange'}>
          {status === 'completed' ? '已完成' : status === 'active' ? '進行中' : '待開始'}
        </Tag>
      ),
    },
    {
      title: '時間',
      dataIndex: 'date',
      key: 'date',
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>儀表板</Title>
          <Text type="secondary">無人機足球比賽管理系統概覽</Text>
        </div>
        
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="隊伍總數"
                value={stats.teams}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#3f8600' }}
                suffix="支"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="錦標賽"
                value={stats.tournaments}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#cf1322' }}
                suffix="場"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="比賽場次"
                value={stats.matches}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#1890ff' }}
                suffix="場"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="運動員"
                value={stats.athletes}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#722ed1' }}
                suffix="人"
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card title="最近比賽" extra={<ClockCircleOutlined />}>
              <Table
                columns={matchColumns}
                dataSource={recentMatches}
                loading={loading}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title="積分榜前四名" extra={<TrophyOutlined />}>
              <List
                loading={loading}
                dataSource={topTeams}
                renderItem={(team) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          style={{ 
                            backgroundColor: team.rank === 1 ? '#faad14' : 
                                           team.rank === 2 ? '#c0c0c0' : 
                                           team.rank === 3 ? '#cd7f32' : '#f0f0f0',
                            color: '#fff'
                          }}
                        >
                          {team.rank}
                        </Avatar>
                      }
                      title={
                        <Space>
                          <Text strong>{team.name}</Text>
                          {team.trend === 'up' ? 
                            <RiseOutlined style={{ color: '#52c41a' }} /> : 
                            <FallOutlined style={{ color: '#ff4d4f' }} />
                          }
                        </Space>
                      }
                      description={`${team.points}分 | ${team.won}勝${team.drawn}平${team.lost}負`}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="比賽進度">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text>小組賽進度</Text>
                  <Progress percent={75} status="active" />
                </div>
                <div>
                  <Text>淘汰賽進度</Text>
                  <Progress percent={30} />
                </div>
                <div>
                  <Text>總體進度</Text>
                  <Progress percent={60} strokeColor="#52c41a" />
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="系統狀態">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>數據庫連接</Text>
                  <Tag color="green">正常</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>API服務</Text>
                  <Tag color="green">運行中</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>即時更新</Text>
                  <Tag color="blue">已啟用</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>系統版本</Text>
                  <Tag color="purple">v1.0.0</Tag>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
};

export default Dashboard;