import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Table, 
  Tag, 
  Space, 
  Statistic, 
  Row, 
  Col,
  Spin,
  Alert,
  Tabs,
  Avatar
} from 'antd';
import { 
  TrophyOutlined, 
  TeamOutlined,
  CalendarOutlined,
  FireOutlined,
  StarOutlined,
  RiseOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const ClientLeaderboard = () => {
  const [tournament, setTournament] = useState(null);
  const [overallLeaderboard, setOverallLeaderboard] = useState([]);
  const [groupLeaderboards, setGroupLeaderboards] = useState([]);
  const [stats, setStats] = useState({
    totalTeams: 0,
    totalMatches: 0,
    completedMatches: 0,
    totalGoals: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      
      // Get active tournament
      const tournamentResponse = await axios.get('/api/tournaments/public');
      let tournamentData = null;
      
      if (tournamentResponse.data.success && tournamentResponse.data.data) {
        tournamentData = tournamentResponse.data.data;
      } else {
        // Fallback to first active tournament
        const fallbackResponse = await axios.get('/api/tournaments?status=active&limit=1');
        if (fallbackResponse.data.success && fallbackResponse.data.data.tournaments.length > 0) {
          tournamentData = fallbackResponse.data.data.tournaments[0];
        }
      }

      if (!tournamentData) {
        setError('找不到可顯示的錦標賽');
        return;
      }

      setTournament(tournamentData);
      const tournamentId = tournamentData.tournament_id;

      // Fetch overall leaderboard
      const overallResponse = await axios.get(`/api/tournaments/${tournamentId}/stats/overall-leaderboard`);
      if (overallResponse.data.success) {
        setOverallLeaderboard(overallResponse.data.data.leaderboard || []);
      }

      // Fetch group leaderboards  
      const groupsResponse = await axios.get(`/api/stats/group-standings`);
      if (groupsResponse.data.success) {
        setGroupLeaderboards(groupsResponse.data.data.standings || []);
      }

      // Calculate statistics
      const teamsResponse = await axios.get(`/api/tournaments/${tournamentId}/teams`);
      const matchesResponse = await axios.get(`/api/tournaments/${tournamentId}/matches`);
      
      let totalTeams = 0;
      let totalMatches = 0;
      let completedMatches = 0;
      let totalGoals = 0;

      if (teamsResponse.data.success) {
        const teamsData = teamsResponse.data.data;
        const teams = Array.isArray(teamsData) ? teamsData : (teamsData.teams || []);
        totalTeams = teams.length;
      }

      if (matchesResponse.data.success) {
        const matchesData = matchesResponse.data.data;
        const matches = Array.isArray(matchesData) ? matchesData : (matchesData.matches || []);
        totalMatches = matches.length;
        completedMatches = matches.filter(m => m.match_status === 'completed').length;
        totalGoals = matches.reduce((sum, match) => {
          if (match.match_status === 'completed') {
            return sum + (match.team1_score || 0) + (match.team2_score || 0);
          }
          return sum;
        }, 0);
      }

      setStats({
        totalTeams,
        totalMatches,
        completedMatches,
        totalGoals
      });

    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      setError('載入積分榜資料失敗');
    } finally {
      setLoading(false);
    }
  };

  const overallColumns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (rank) => {
        let color = '#666';
        let icon = null;
        
        if (rank === 1) {
          color = '#faad14';
          icon = <TrophyOutlined style={{ color }} />;
        } else if (rank === 2) {
          color = '#a0a0a0';
          icon = <StarOutlined style={{ color }} />;
        } else if (rank === 3) {
          color = '#cd7f32';
          icon = <FireOutlined style={{ color }} />;
        }
        
        return (
          <Space>
            {icon}
            <Text strong style={{ color, fontSize: 16 }}>
              {rank}
            </Text>
          </Space>
        );
      }
    },
    {
      title: '隊伍',
      dataIndex: 'team_name',
      key: 'team_name',
      render: (name, record) => (
        <Space>
          <Avatar 
            style={{ backgroundColor: '#1890ff' }} 
            icon={<TeamOutlined />} 
          />
          <div>
            <Text strong style={{ fontSize: 16 }}>{name}</Text>
            {record.group_name && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {record.group_name}
                </Text>
              </div>
            )}
          </div>
        </Space>
      )
    },
    {
      title: '積分',
      dataIndex: 'points',
      key: 'points',
      width: 100,
      render: (points) => (
        <Text strong style={{ fontSize: 18, color: '#52c41a' }}>
          {points || 0}
        </Text>
      ),
      sorter: (a, b) => (b.points || 0) - (a.points || 0)
    },
    {
      title: '比賽',
      children: [
        {
          title: '場次',
          dataIndex: 'matches_played',
          key: 'matches_played',
          width: 60,
          align: 'center'
        },
        {
          title: '勝',
          dataIndex: 'wins',
          key: 'wins',
          width: 50,
          align: 'center',
          render: (wins) => <Text style={{ color: '#52c41a' }}>{wins || 0}</Text>
        },
        {
          title: '平',
          dataIndex: 'draws',
          key: 'draws',
          width: 50,
          align: 'center',
          render: (draws) => <Text style={{ color: '#faad14' }}>{draws || 0}</Text>
        },
        {
          title: '負',
          dataIndex: 'losses',
          key: 'losses',
          width: 50,
          align: 'center',
          render: (losses) => <Text style={{ color: '#ff4d4f' }}>{losses || 0}</Text>
        }
      ]
    },
    {
      title: '進球',
      children: [
        {
          title: '進',
          dataIndex: 'goals_for',
          key: 'goals_for',
          width: 50,
          align: 'center',
          render: (goals) => <Text style={{ color: '#52c41a' }}>{goals || 0}</Text>
        },
        {
          title: '失',
          dataIndex: 'goals_against',
          key: 'goals_against',
          width: 50,
          align: 'center',
          render: (goals) => <Text style={{ color: '#ff4d4f' }}>{goals || 0}</Text>
        },
        {
          title: '差',
          dataIndex: 'goal_difference',
          key: 'goal_difference',
          width: 60,
          align: 'center',
          render: (diff) => {
            const color = diff > 0 ? '#52c41a' : diff < 0 ? '#ff4d4f' : '#666';
            return <Text style={{ color }}>{diff > 0 ? '+' : ''}{diff || 0}</Text>;
          }
        }
      ]
    }
  ];

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>載入積分榜資料中...</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="載入失敗"
          description={error}
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Tournament Header */}
        <Card>
          <Row align="middle" justify="space-between">
            <Col>
              <Space align="center">
                <TrophyOutlined style={{ fontSize: 32, color: '#faad14' }} />
                <div>
                  <Title level={2} style={{ margin: 0 }}>
                    {tournament?.tournament_name} 積分榜
                  </Title>
                  <Space>
                    <Tag color="blue">
                      {tournament?.tournament_type === 'group' && '小組賽'}
                      {tournament?.tournament_type === 'knockout' && '淘汰賽'}
                      {tournament?.tournament_type === 'mixed' && '混合賽制'}
                    </Tag>
                    <Text type="secondary">
                      最後更新: {moment().format('YYYY-MM-DD HH:mm')}
                    </Text>
                  </Space>
                </div>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Statistics */}
        <Card title="賽事統計">
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="參賽隊伍"
                value={stats.totalTeams}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="總比賽場次"
                value={stats.totalMatches}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="已完成比賽"
                value={stats.completedMatches}
                prefix={<RiseOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="總進球數"
                value={stats.totalGoals}
                prefix={<FireOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Col>
          </Row>
        </Card>

        {/* Leaderboards */}
        <Card>
          <Tabs defaultActiveKey="overall" size="large">
            <TabPane tab="總積分榜" key="overall">
              <Table
                columns={overallColumns}
                dataSource={overallLeaderboard}
                rowKey="team_id"
                pagination={false}
                locale={{
                  emptyText: (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <TrophyOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                      <div>
                        <Text type="secondary" style={{ fontSize: 16 }}>暫無積分榜資料</Text>
                      </div>
                    </div>
                  )
                }}
                scroll={{ x: 800 }}
              />
            </TabPane>
            
            {groupLeaderboards.map((group) => (
              <TabPane tab={group.group_name} key={group.group_id}>
                <Table
                  columns={overallColumns.filter(col => col.key !== 'group_name')}
                  dataSource={group.teams || []}
                  rowKey="team_id"
                  pagination={false}
                  locale={{
                    emptyText: (
                      <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <TeamOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                        <div>
                          <Text type="secondary" style={{ fontSize: 16 }}>
                            {group.group_name} 暫無隊伍資料
                          </Text>
                        </div>
                      </div>
                    )
                  }}
                  scroll={{ x: 700 }}
                />
              </TabPane>
            ))}
          </Tabs>
        </Card>
      </Space>
    </div>
  );
};

export default ClientLeaderboard;