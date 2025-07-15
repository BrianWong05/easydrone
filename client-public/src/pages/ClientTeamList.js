import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Table, 
  Space, 
  Avatar, 
  Tag,
  Spin,
  Alert,
  Statistic,
  Row,
  Col
} from 'antd';
import { 
  TeamOutlined,
  UserOutlined,
  TrophyOutlined,
  CalendarOutlined,
  FireOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const { Title, Text } = Typography;

const ClientTeamList = () => {
  const { t } = useTranslation(['team', 'common', 'public', 'match']);
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);

  // 清理隊伍名稱顯示（移除 _{tournament_id} 後綴）
  const getDisplayTeamName = (teamName) => {
    if (!teamName) return '';
    // 檢查是否包含下劃線，如果是則移除最後一個下劃線及其後的內容
    const lastUnderscoreIndex = teamName.lastIndexOf('_');
    if (lastUnderscoreIndex !== -1) {
      const beforeUnderscore = teamName.substring(0, lastUnderscoreIndex);
      const afterUnderscore = teamName.substring(lastUnderscoreIndex + 1);
      // 如果下劃線後面是純數字，則認為是tournament_id，需要移除
      if (/^\d+$/.test(afterUnderscore)) {
        return beforeUnderscore;
      }
    }
    return teamName;
  };

  // 清理小組名稱顯示（移除 _{tournament_id} 後綴）
  const getDisplayGroupName = (groupName) => {
    if (!groupName) return '';
    const lastUnderscoreIndex = groupName.lastIndexOf('_');
    if (lastUnderscoreIndex !== -1) {
      const beforeUnderscore = groupName.substring(0, lastUnderscoreIndex);
      const afterUnderscore = groupName.substring(lastUnderscoreIndex + 1);
      if (/^\d+$/.test(afterUnderscore)) {
        return beforeUnderscore;
      }
    }
    return groupName;
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalTeams: 0,
    totalAthletes: 0,
    totalGroups: 0
  });

  useEffect(() => {
    fetchTeamsData();
  }, []);

  const fetchTeamsData = async () => {
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
        setError(t('public:layout.noActiveTournament'));
        return;
      }

      setTournament(tournamentData);
      const tournamentId = tournamentData.tournament_id;

      // Fetch teams data
      const teamsResponse = await axios.get(`/api/tournaments/${tournamentId}/teams`);
      if (teamsResponse.data.success) {
        const teamsData = teamsResponse.data.data;
        const teamsList = Array.isArray(teamsData) ? teamsData : (teamsData.teams || []);
        setTeams(teamsList);
        
        // Calculate statistics
        const totalAthletes = teamsList.reduce((sum, team) => sum + (team.athlete_count || 0), 0);
        const uniqueGroups = new Set(teamsList.map(team => team.group_id).filter(Boolean));
        
        setStats({
          totalTeams: teamsList.length,
          totalAthletes,
          totalGroups: uniqueGroups.size
        });
      }

    } catch (error) {
      console.error('Error fetching teams data:', error);
      setError(t('team:messages.loadingTeams'));
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: t('team:team.name'),
      dataIndex: 'team_name',
      key: 'team_name',
      render: (name, record) => (
        <Space>
          <Avatar 
            size="large"
            style={{ 
              backgroundColor: record.team_color || '#1890ff',
              border: `2px solid ${record.team_color || '#1890ff'}`,
              color: '#fff'
            }} 
            icon={<TeamOutlined />} 
          />
          <div>
            <Text 
              strong 
              style={{ 
                fontSize: 16, 
                color: record.team_color || '#1890ff',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
              onClick={() => navigate(`/teams/${record.team_id}`)}
            >
              {getDisplayTeamName(name)}
            </Text>
            {record.group_name && (
              <div>
                <Tag color="blue" style={{ marginTop: 4 }}>
                  {t('team:team.group')} {getDisplayGroupName(record.group_name)}
                </Tag>
              </div>
            )}
          </div>
        </Space>
      )
    },
    {
      title: t('team:team.members'),
      dataIndex: 'athlete_count',
      key: 'athlete_count',
      width: 120,
      align: 'center',
      render: (count) => (
        <Space>
          <UserOutlined style={{ color: '#1890ff' }} />
          <Text strong style={{ fontSize: 16 }}>
            {count || 0}
          </Text>
        </Space>
      )
    },
    {
      title: t('match:match.matchNumber'),
      key: 'matches',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space>
          <CalendarOutlined style={{ color: '#52c41a' }} />
          <Text>{record.total_matches || 0}</Text>
        </Space>
      )
    },
    {
      title: t('team:team.wins'),
      dataIndex: 'wins',
      key: 'wins',
      width: 80,
      align: 'center',
      render: (wins) => (
        <Text strong style={{ color: '#52c41a' }}>
          {wins || 0}
        </Text>
      )
    },
    {
      title: t('team:team.goalsFor'),
      dataIndex: 'goals_for',
      key: 'goals_for',
      width: 80,
      align: 'center',
      render: (goals) => (
        <Space>
          <FireOutlined style={{ color: '#fa8c16' }} />
          <Text strong>{goals || 0}</Text>
        </Space>
      )
    },
    {
      title: t('team:team.points'),
      dataIndex: 'points',
      key: 'points',
      width: 80,
      align: 'center',
      render: (points) => (
        <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
          {points || 0}
        </Text>
      ),
      sorter: (a, b) => (b.points || 0) - (a.points || 0)
    },
    {
      title: t('common:buttons.view'),
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Space>
          <Text 
            style={{ 
              color: '#1890ff', 
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
            onClick={() => navigate(`/teams/${record.team_id}`)}
          >
            {t('common:buttons.view')}
          </Text>
        </Space>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>{t('team:messages.loadingTeams')}</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message={t('common:messages.error')}
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
                <TeamOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                <div>
                  <Title level={2} style={{ margin: 0 }}>
                    {tournament?.tournament_name} {t('public:navigation.teams')}
                  </Title>
                  <Text type="secondary">
                    {t('team:messages.viewAllTeamsInfo', { defaultValue: '查看所有參賽隊伍的詳細資訊' })}
                  </Text>
                </div>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Statistics */}
        <Card title={t('team:messages.teamStatistics', { defaultValue: '隊伍統計' })}>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title={t('team:team.totalTeams')}
                value={stats.totalTeams}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title={t('athlete:athlete.totalAthletes')}
                value={stats.totalAthletes}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title={t('group:messages.totalGroups', { defaultValue: '分組數量' })}
                value={stats.totalGroups}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Col>
          </Row>
        </Card>

        {/* Teams Table */}
        <Card title={t('team:team.list')}>
          <Table
            columns={columns}
            dataSource={teams}
            rowKey="team_id"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => t('common:pagination.total', { start: range[0], end: range[1], total }) + ` ${t('team:messages.teamsCount', { defaultValue: '支隊伍' })}`,
              pageSizeOptions: ['10', '20', '50', '100'],
              defaultPageSize: 20
            }}
            locale={{
              emptyText: (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <TeamOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                  <div>
                    <Text type="secondary" style={{ fontSize: 16 }}>{t('team:messages.noTeamData')}</Text>
                  </div>
                </div>
              )
            }}
            scroll={{ x: 800 }}
          />
        </Card>
      </Space>
    </div>
  );
};

export default ClientTeamList;