import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Tag,
  Spin,
  Alert,
  Statistic,
  Table,
  Button,
  Progress
} from 'antd';
import { 
  TeamOutlined,
  TrophyOutlined,
  CalendarOutlined,
  ArrowLeftOutlined,
  UsergroupAddOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;

const ClientGroupDetail = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const { t } = useTranslation(['group', 'common', 'match']);
  const [tournament, setTournament] = useState(null);

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
  const [group, setGroup] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGroupDetail();
  }, [groupId]);

  const fetchGroupDetail = async () => {
    try {
      setLoading(true);
      
      // Get active tournament first
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
        setError(t('common:messages.noTournamentFound', { defaultValue: '找不到可顯示的錦標賽' }));
        return;
      }

      setTournament(tournamentData);

      // Fetch group detail
      const groupResponse = await axios.get(`/api/groups/${groupId}`);
      if (groupResponse.data.success) {
        const groupData = groupResponse.data.data;
        setGroup(groupData.group);
        setTeams(groupData.teams || []);
        setMatches(groupData.matches || []);
        
        // Debug: Log the standings data to see the actual structure
        console.log('Standings data from API:', groupData.standings);
        setStandings(groupData.standings || []);
      }

    } catch (error) {
      console.error('Error fetching group detail:', error);
      setError(t('group:messages.loadingGroupDetail', { defaultValue: '載入小組詳情失敗' }));
    } finally {
      setLoading(false);
    }
  };

  const getMatchResult = (match, teamId) => {
    if (match.match_status !== 'completed') return null;
    
    const isTeam1 = match.team1_id === teamId;
    const teamScore = isTeam1 ? match.team1_score : match.team2_score;
    const opponentScore = isTeam1 ? match.team2_score : match.team1_score;
    
    if (teamScore > opponentScore) return 'win';
    if (teamScore === opponentScore) return 'draw';
    return 'loss';
  };

  const getMatchStatusTag = (status) => {
    const statusMap = {
      'pending': { color: 'default', text: t('match:status.pending') },
      'in_progress': { color: 'processing', text: t('match:status.inProgress') },
      'completed': { color: 'success', text: t('match:status.completed') },
      'cancelled': { color: 'error', text: t('match:status.cancelled') }
    };
    
    const statusInfo = statusMap[status] || { color: 'default', text: status };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
  };

  const getResultTag = (result) => {
    const resultMap = {
      'win': { color: 'success', text: t('match:result.win') },
      'draw': { color: 'warning', text: t('match:result.draw') },
      'loss': { color: 'error', text: t('match:result.loss') }
    };
    
    if (!result) return null;
    const resultInfo = resultMap[result];
    return <Tag color={resultInfo.color}>{resultInfo.text}</Tag>;
  };

  // Standings table columns
  const standingsColumns = [
    {
      title: t('group:standings.position'),
      key: 'rank',
      align: 'center',
      width: 60,
      render: (_, record, index) => (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
          index < 2 
            ? 'bg-warning-500 text-white shadow-md' 
            : 'bg-gray-300 text-gray-600'
        } transition-all duration-200`}>
          {index + 1}
        </div>
      ),
    },
    {
      title: t('group:standings.team'),
      dataIndex: 'team_name',
      key: 'team_name',
      render: (name, record) => (
        <div className="flex items-center space-x-3">
          <div 
            className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0"
            style={{ backgroundColor: record.team_color || '#1890ff' }}
          />
          <Text 
            strong 
            className="text-primary-600 cursor-pointer hover:text-primary-700 hover:underline transition-colors duration-200 font-semibold"
            onClick={() => navigate(`/teams/${record.team_id}`)}
          >
            {getDisplayTeamName(name)}
          </Text>
        </div>
      ),
    },
    {
      title: t('group:standings.played'),
      dataIndex: 'matches_played',
      key: 'matches_played',
      align: 'center',
      width: 50,
      render: (value, record) => {
        // Try different possible field names
        const played = value || record.played || record.games_played || 0;
        return <Text>{played}</Text>;
      },
    },
    {
      title: t('group:standings.won'),
      dataIndex: 'wins',
      key: 'wins',
      align: 'center',
      width: 50,
      render: (value, record) => {
        const wins = value || record.won || 0;
        return <Text>{wins}</Text>;
      },
    },
    {
      title: t('group:standings.drawn'),
      dataIndex: 'draws',
      key: 'draws',
      align: 'center',
      width: 50,
      render: (value, record) => {
        const draws = value || record.drawn || record.ties || 0;
        return <Text>{draws}</Text>;
      },
    },
    {
      title: t('group:standings.lost'),
      dataIndex: 'losses',
      key: 'losses',
      align: 'center',
      width: 50,
      render: (value, record) => {
        const losses = value || record.lost || 0;
        return <Text>{losses}</Text>;
      },
    },
    {
      title: t('group:standings.goalsFor'),
      dataIndex: 'goals_for',
      key: 'goals_for',
      align: 'center',
      width: 60,
      render: (value, record) => {
        const goalsFor = value || record.goals_scored || record.gf || 0;
        return <Text>{goalsFor}</Text>;
      },
    },
    {
      title: t('group:standings.goalsAgainst'),
      dataIndex: 'goals_against',
      key: 'goals_against',
      align: 'center',
      width: 60,
      render: (value, record) => {
        const goalsAgainst = value || record.goals_conceded || record.ga || 0;
        return <Text>{goalsAgainst}</Text>;
      },
    },
    {
      title: t('group:standings.goalDifference'),
      key: 'goal_difference',
      align: 'center',
      width: 80,
      render: (_, record) => {
        const goalsFor = record.goals_for || record.goals_scored || record.gf || 0;
        const goalsAgainst = record.goals_against || record.goals_conceded || record.ga || 0;
        const diff = goalsFor - goalsAgainst;
        return (
          <Text className={`font-semibold ${
            diff > 0 ? 'text-success-600' : 
            diff < 0 ? 'text-error-500' : 
            'text-gray-600'
          }`}>
            {diff > 0 ? '+' : ''}{diff}
          </Text>
        );
      },
    },
    {
      title: t('group:standings.points'),
      dataIndex: 'points',
      key: 'points',
      align: 'center',
      width: 60,
      render: (points, record) => {
        const pts = points || record.pts || 0;
        return <Text strong style={{ color: '#1890ff' }}>{pts}</Text>;
      },
    },
  ];

  // Matches table columns
  const matchesColumns = [
    {
      title: t('match:match.number'),
      dataIndex: 'match_number',
      key: 'match_number',
      width: 80,
      align: 'center',
      render: (matchNumber, record) => (
        <Text 
          strong 
          style={{ 
            color: '#1890ff', 
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
          onClick={() => navigate(`/matches/${record.match_id}`)}
        >
          {matchNumber}
        </Text>
      ),
    },
    {
      title: t('match:match.teams'),
      key: 'teams',
      render: (_, record) => (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Text strong className="text-gray-800">{getDisplayTeamName(record.team1_name)}</Text>
            <Text type="secondary" className="text-gray-500">vs</Text>
            <Text strong className="text-gray-800">{getDisplayTeamName(record.team2_name)}</Text>
          </div>
          {record.match_status === 'completed' && (
            <Text className="text-lg font-bold text-primary-600">
              {record.team1_score || 0} - {record.team2_score || 0}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: t('match:match.time'),
      dataIndex: 'match_date',
      key: 'match_date',
      render: (date) => date ? moment(date).format('MM/DD HH:mm') : '-',
    },
    {
      title: t('match:match.status'),
      dataIndex: 'match_status',
      key: 'match_status',
      align: 'center',
      render: (status) => getMatchStatusTag(status),
    },
    {
      title: t('common:actions.actions'),
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Button 
          type="link" 
          size="small"
          onClick={() => navigate(`/matches/${record.match_id}`)}
        >
          {t('common:actions.viewDetails')}
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <Spin size="large" />
        <div className="mt-4">
          <Text className="text-gray-600 animate-pulse">{t('group:messages.loadingGroupDetail')}</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-fade-in">
          <Alert
            message={t('common:messages.loadFailed')}
            description={error}
            type="error"
            showIcon
            className="border-0 bg-transparent"
            action={
              <Button 
                size="small" 
                onClick={fetchGroupDetail}
                className="bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700"
              >
                {t('common:actions.reload')}
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 animate-fade-in">
          <Alert
            message={t('group:messages.groupNotFound')}
            description={t('group:messages.groupNotFoundDesc')}
            type="warning"
            showIcon
            className="border-0 bg-transparent"
          />
        </div>
      </div>
    );
  }

  const completedMatches = matches.filter(m => m.match_status === 'completed').length;
  const totalMatches = matches.length;
  const matchProgress = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      {/* Back Button */}
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/groups')}
        className="mb-6 hover:bg-primary-50 hover:border-primary-300 transition-colors duration-200"
      >
        {t('common:actions.backToGroupList')}
      </Button>

      {/* Group Header */}
      <Card className="mb-8 shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-primary-500">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="space-y-2">
            <Title level={2} className="m-0 flex items-center text-gray-800">
              <UsergroupAddOutlined className="mr-3 text-primary-600" />
              <span className="bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                {getDisplayGroupName(group.group_name)}
              </span>
            </Title>
            {tournament && (
              <Text type="secondary" className="text-gray-600 text-base">
                {tournament.tournament_name}
              </Text>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Tag 
              color="blue" 
              className="text-sm px-3 py-1 font-medium bg-blue-50 border-blue-200 text-blue-700"
            >
              {teams.length} / {group.max_teams} {t('group:group.teams')}
            </Tag>
            <Tag 
              color={matchProgress === 100 ? 'success' : 'processing'}
              className={`text-sm px-3 py-1 font-medium ${
                matchProgress === 100 
                  ? 'bg-success-50 border-success-200 text-success-700' 
                  : 'bg-warning-50 border-warning-200 text-warning-700'
              }`}
            >
              {t('group:group.progress')} {matchProgress}%
            </Tag>
          </div>
        </div>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-primary-500">
          <Statistic
            title={t('group:stats.participatingTeams')}
            value={teams.length}
            prefix={<TeamOutlined className="text-primary-600" />}
            suffix={`/ ${group.max_teams}`}
            valueStyle={{ color: '#2563eb', fontWeight: 'bold' }}
          />
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-warning-500">
          <Statistic
            title={t('common:stats.totalMatches')}
            value={totalMatches}
            prefix={<CalendarOutlined className="text-warning-600" />}
            valueStyle={{ color: '#d97706', fontWeight: 'bold' }}
          />
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-success-500">
          <Statistic
            title={t('common:stats.completedMatches')}
            value={completedMatches}
            prefix={<CheckCircleOutlined className="text-success-600" />}
            valueStyle={{ color: '#16a34a', fontWeight: 'bold' }}
          />
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-gray-400">
          <div className="text-center">
            <Text type="secondary" className="block mb-2 text-gray-600 font-medium">
              {t('group:group.progress')}
            </Text>
            <Progress 
              type="circle" 
              percent={matchProgress} 
              size={80}
              strokeColor={matchProgress === 100 ? '#16a34a' : '#2563eb'}
              className="animate-bounce-gentle"
            />
          </div>
        </Card>
      </div>

      {/* Group Standings */}
      <Card className="mb-8 shadow-md hover:shadow-lg transition-shadow duration-300 border-t-4 border-warning-500">
        <Title level={3} className="flex items-center text-gray-800 mb-6">
          <TrophyOutlined className="mr-3 text-warning-600" />
          <span className="font-semibold">{t('group:group.standings')}</span>
        </Title>
        <Table
          columns={standingsColumns}
          dataSource={standings}
          rowKey="team_id"
          pagination={false}
          size="small"
          className="overflow-x-auto"
          locale={{
            emptyText: (
              <div className="text-center py-16">
                <TrophyOutlined className="text-6xl text-gray-300 mb-4" />
                <div className="mt-4">
                  <Text type="secondary" className="text-gray-500">
                    {t('group:messages.noStandingsData')}
                  </Text>
                </div>
              </div>
            )
          }}
        />
      </Card>

      {/* Group Matches */}
      <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-t-4 border-primary-500">
        <Title level={3} className="flex items-center text-gray-800 mb-6">
          <PlayCircleOutlined className="mr-3 text-primary-600" />
          <span className="font-semibold">{t('group:group.matches')}</span>
        </Title>
        <Table
          columns={matchesColumns}
          dataSource={matches}
          rowKey="match_id"
          pagination={{
            pageSize: 20,
            pageSizeOptions: ['10', '20', '50', '100'],
            defaultPageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              t('match:pagination.showTotal', { 
                start: range[0], 
                end: range[1], 
                total: total,
                defaultValue: `第 ${range[0]}-${range[1]} 項，共 ${total} 場比賽`
              }),
          }}
          className="overflow-x-auto"
          locale={{
            emptyText: (
              <div className="text-center py-16">
                <CalendarOutlined className="text-6xl text-gray-300 mb-4" />
                <div className="mt-4">
                  <Text type="secondary" className="text-gray-500">
                    {t('group:messages.noMatchesInGroup')}
                  </Text>
                </div>
              </div>
            )
          }}
        />
      </Card>
    </div>
  );
};

export default ClientGroupDetail;