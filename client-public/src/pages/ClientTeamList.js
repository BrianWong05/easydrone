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
        <div className="flex items-center gap-3">
          <Avatar 
            size="large"
            style={{ 
              backgroundColor: record.team_color || '#1890ff',
              border: `2px solid ${record.team_color || '#1890ff'}`,
              color: '#fff'
            }} 
            icon={<TeamOutlined />} 
            className="shadow-md"
          />
          <div className="flex flex-col gap-1">
            <Text 
              strong 
              className="text-base cursor-pointer underline hover:opacity-80 transition-opacity duration-200"
              style={{ color: record.team_color || '#1890ff' }}
              onClick={() => navigate(`/teams/${record.team_id}`)}
            >
              {getDisplayTeamName(name)}
            </Text>
            {record.group_name && (
              <div>
                <Tag color="blue" className="mt-1 text-xs">
                  {t('team:team.group')} {getDisplayGroupName(record.group_name)}
                </Tag>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      title: t('team:team.members'),
      dataIndex: 'athlete_count',
      key: 'athlete_count',
      width: 120,
      align: 'center',
      render: (count) => (
        <div className="flex items-center gap-2 justify-center">
          <UserOutlined className="text-blue-600" />
          <Text strong className="text-base">
            {count || 0}
          </Text>
        </div>
      )
    },
    {
      title: t('match:match.matchNumber'),
      key: 'matches',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <div className="flex items-center gap-2 justify-center">
          <CalendarOutlined className="text-green-500" />
          <Text className="text-gray-700">{record.total_matches || 0}</Text>
        </div>
      )
    },
    {
      title: t('team:team.wins'),
      dataIndex: 'wins',
      key: 'wins',
      width: 80,
      align: 'center',
      render: (wins) => (
        <Text strong className="text-green-600 text-base">
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
        <div className="flex items-center gap-2 justify-center">
          <FireOutlined className="text-orange-500" />
          <Text strong className="text-gray-700">{goals || 0}</Text>
        </div>
      )
    },
    {
      title: t('team:team.points'),
      dataIndex: 'points',
      key: 'points',
      width: 80,
      align: 'center',
      render: (points) => (
        <Text strong className="text-base text-blue-600 font-bold">
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
        <Text 
          className="text-blue-600 cursor-pointer underline hover:text-blue-800 transition-colors duration-200"
          onClick={() => navigate(`/teams/${record.team_id}`)}
        >
          {t('common:buttons.view')}
        </Text>
      )
    }
  ];

  if (loading) {
    return (
      <div className="p-6 text-center bg-gray-50 min-h-screen">
        <Spin size="large" />
        <div className="mt-4">
          <Text className="text-gray-600">{t('team:messages.loadingTeams')}</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <Alert
          message={t('common:messages.error')}
          description={error}
          type="error"
          showIcon
          className="bg-white shadow-sm"
        />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen max-w-7xl mx-auto">
      <div className="flex flex-col gap-6">
        {/* Tournament Header */}
        <Card className="bg-white shadow-sm border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <TeamOutlined className="text-3xl text-blue-600" />
              <div className="flex flex-col gap-1">
                <Title level={2} className="m-0 text-gray-800 font-bold">
                  {tournament?.tournament_name} {t('public:navigation.teams')}
                </Title>
                <Text type="secondary" className="text-gray-600">
                  {t('team:messages.viewAllTeamsInfo', { defaultValue: '查看所有參賽隊伍的詳細資訊' })}
                </Text>
              </div>
            </div>
          </div>
        </Card>

        {/* Statistics */}
        <Card 
          title={
            <div className="flex items-center gap-2">
              <TrophyOutlined className="text-blue-500" />
              <span className="text-gray-800 font-semibold">{t('team:messages.teamStatistics', { defaultValue: '隊伍統計' })}</span>
            </div>
          }
          className="bg-white shadow-sm"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <Statistic
                title={<span className="text-gray-600 text-sm">{t('team:team.totalTeams')}</span>}
                value={stats.totalTeams}
                prefix={<TeamOutlined className="text-blue-500" />}
                valueStyle={{ color: '#1890ff', fontSize: '20px', fontWeight: 'bold' }}
              />
            </Card>
            <Card className="bg-green-50 border-green-200">
              <Statistic
                title={<span className="text-gray-600 text-sm">{t('athlete:athlete.totalAthletes')}</span>}
                value={stats.totalAthletes}
                prefix={<UserOutlined className="text-green-500" />}
                valueStyle={{ color: '#52c41a', fontSize: '20px', fontWeight: 'bold' }}
              />
            </Card>
            <Card className="bg-orange-50 border-orange-200">
              <Statistic
                title={<span className="text-gray-600 text-sm">{t('group:messages.totalGroups', { defaultValue: '分組數量' })}</span>}
                value={stats.totalGroups}
                prefix={<TrophyOutlined className="text-orange-500" />}
                valueStyle={{ color: '#fa8c16', fontSize: '20px', fontWeight: 'bold' }}
              />
            </Card>
          </div>
        </Card>

        {/* Teams Table */}
        <Card 
          title={
            <div className="flex items-center gap-2">
              <TeamOutlined className="text-blue-500" />
              <span className="text-gray-800 font-semibold">{t('team:team.list')}</span>
            </div>
          }
          className="bg-white shadow-sm"
        >
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
                <div className="text-center py-10">
                  <TeamOutlined className="text-5xl text-gray-300 mb-4" />
                  <div>
                    <Text type="secondary" className="text-base text-gray-500">{t('team:messages.noTeamData')}</Text>
                  </div>
                </div>
              )
            }}
            scroll={{ x: 800 }}
            className="overflow-x-auto"
          />
        </Card>
      </div>
    </div>
  );
};

export default ClientTeamList;