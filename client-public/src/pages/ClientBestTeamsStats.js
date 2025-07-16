import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Table, 
  Spin, 
  Alert,
  Row,
  Col,
  Statistic
} from 'antd';
import { 
  TrophyOutlined, 
  FireOutlined,
  SafetyOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const { Title, Text } = Typography;

const ClientBestTeamsStats = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['stats', 'common']);
  const [loading, setLoading] = useState(true);
  const [bestTeamsData, setBestTeamsData] = useState(null);
  const [error, setError] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);

  // Helper function to clean team names
  const getDisplayTeamName = (teamName) => {
    if (!teamName) return '';
    const lastUnderscoreIndex = teamName.lastIndexOf('_');
    if (lastUnderscoreIndex !== -1) {
      const beforeUnderscore = teamName.substring(0, lastUnderscoreIndex);
      const afterUnderscore = teamName.substring(lastUnderscoreIndex + 1);
      if (/^\d+$/.test(afterUnderscore)) {
        return beforeUnderscore;
      }
    }
    return teamName;
  };

  // Helper function to clean group names
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

  useEffect(() => {
    fetchTournaments();
    
    // Set up periodic refresh to check for tournament changes
    const interval = setInterval(() => {
      fetchTournaments();
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchBestTeamsStats();
    }
  }, [selectedTournament]);

  const fetchTournaments = async () => {
    try {
      const response = await axios.get('/api/tournaments/public');
      if (response.data.success && response.data.data) {
        setTournaments([response.data.data]);
        // Only update selected tournament if it's different or not set
        if (!selectedTournament || selectedTournament !== response.data.data.tournament_id) {
          setSelectedTournament(response.data.data.tournament_id);
        }
      }
    } catch (error) {
      console.error('獲取錦標賽失敗:', error);
      setError(t('messages.loadingError', { ns: 'common' }));
    }
  };

  const fetchBestTeamsStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the latest best teams stats for the selected tournament
      const params = selectedTournament ? { tournament_id: selectedTournament } : {};
      const response = await axios.get('/api/stats/best-teams-public', { params });
      
      if (response.data.success) {
        setBestTeamsData(response.data.data);
      } else {
        setError(response.data.message || t('messages.noData'));
        setBestTeamsData(null);
      }
    } catch (error) {
      console.error('獲取最佳球隊統計失敗:', error);
      setError(t('messages.loadingError', { ns: 'common' }));
      setBestTeamsData(null);
    } finally {
      setLoading(false);
    }
  };

  const attackTeamsColumns = [
    {
      title: t('rankings.position'),
      key: 'rank',
      render: (_, record, index) => (
        <div style={{ textAlign: 'center' }}>
          <span style={{ 
            fontSize: index === 0 ? '18px' : '16px',
            fontWeight: 'bold',
            color: index === 0 ? '#faad14' : index === 1 ? '#52c41a' : index === 2 ? '#1890ff' : '#666'
          }}>
            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
          </span>
        </div>
      ),
      width: 80,
    },
    {
      title: t('rankings.team'),
      key: 'team',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div 
            style={{ 
              width: 16, 
              height: 16, 
              backgroundColor: record.team_color, 
              marginRight: 8,
              border: '1px solid #d9d9d9',
              borderRadius: '2px'
            }} 
          />
          <div>
            <div 
              style={{ 
                fontWeight: 'bold',
                color: '#1890ff',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
              onClick={() => navigate(`/teams/${record.team_id}`)}
            >
              {getDisplayTeamName(record.team_name)}
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.group_name ? `${t('common:group')} ${getDisplayGroupName(record.group_name)}` : t('common:noGroup')}
            </Text>
          </div>
        </div>
      ),
      width: 200,
    },
    {
      title: t('metrics.matchesPlayed'),
      dataIndex: 'matches_played',
      key: 'matches_played',
      width: 100,
      align: 'center',
    },
    {
      title: t('metrics.goalsScored'),
      dataIndex: 'goals_for',
      key: 'goals_for',
      width: 100,
      align: 'center',
      render: (goals) => <span className="font-bold text-success-600">{goals}</span>
    },
    {
      title: t('metrics.averageGoals'),
      dataIndex: 'avg_goals_for',
      key: 'avg_goals_for',
      width: 100,
      align: 'center',
      render: (avg) => <span style={{ fontWeight: 'bold' }}>{avg}</span>
    },
    {
      title: t('rankings.goalsAgainst'),
      dataIndex: 'goals_against',
      key: 'goals_against',
      width: 80,
      align: 'center',
    },
  ];

  const defenseTeamsColumns = [
    {
      title: t('rankings.position'),
      key: 'rank',
      render: (_, record, index) => (
        <div className="text-center">
          <span className={`font-bold ${
            index === 0 ? 'text-lg text-warning-500' : 
            index === 1 ? 'text-base text-success-500' : 
            index === 2 ? 'text-base text-primary-500' : 
            'text-base text-gray-600'
          }`}>
            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
          </span>
        </div>
      ),
      width: 80,
    },
    {
      title: t('rankings.team'),
      key: 'team',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div 
            style={{ 
              width: 16, 
              height: 16, 
              backgroundColor: record.team_color, 
              marginRight: 8,
              border: '1px solid #d9d9d9',
              borderRadius: '2px'
            }} 
          />
          <div>
            <div 
              style={{ 
                fontWeight: 'bold',
                color: '#1890ff',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
              onClick={() => navigate(`/teams/${record.team_id}`)}
            >
              {getDisplayTeamName(record.team_name)}
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.group_name ? `${t('common:group')} ${getDisplayGroupName(record.group_name)}` : t('common:noGroup')}
            </Text>
          </div>
        </div>
      ),
      width: 200,
    },
    {
      title: t('metrics.matchesPlayed'),
      dataIndex: 'matches_played',
      key: 'matches_played',
      width: 100,
      align: 'center',
    },
    {
      title: t('rankings.goalsAgainst'),
      dataIndex: 'goals_against',
      key: 'goals_against',
      width: 100,
      align: 'center',
      render: (goals) => <span className="font-bold text-error-500">{goals}</span>
    },
    {
      title: t('metrics.averageGoalsAgainst'),
      dataIndex: 'avg_goals_against',
      key: 'avg_goals_against',
      width: 100,
      align: 'center',
      render: (avg) => <span className="font-bold text-gray-800">{avg}</span>
    },
    {
      title: t('rankings.goalsFor'),
      dataIndex: 'goals_for',
      key: 'goals_for',
      width: 80,
      align: 'center',
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <Spin size="large" />
        <p className="mt-4 text-gray-600 animate-pulse">{t('messages.loadingStats')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 animate-fade-in">
          <Alert
            message={t('messages.noData')}
            description={error}
            type="info"
            showIcon
            className="border-0 bg-transparent"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-8">
        <Title level={2} className="flex items-center text-gray-800">
          <BarChartOutlined className="mr-3 text-primary-600" /> 
          <span className="bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
            {t('stats.bestTeams')}
          </span>
        </Title>
      </div>

      {bestTeamsData && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-primary-500">
              <Statistic
                title={t('metrics.totalMatches')}
                value={bestTeamsData.summary?.total_matches_analyzed || 0}
                prefix={<BarChartOutlined className="text-primary-600" />}
                valueStyle={{ color: '#1f2937', fontWeight: 'bold' }}
              />
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-warning-500">
              <Statistic
                title={t('metrics.totalTeams')}
                value={bestTeamsData.summary?.teams_analyzed || 0}
                prefix={<TrophyOutlined className="text-warning-600" />}
                valueStyle={{ color: '#1f2937', fontWeight: 'bold' }}
              />
            </Card>
            
            <Card className="bg-gradient-to-br from-success-50 to-success-100 hover:shadow-lg transition-all duration-300 border-l-4 border-success-500">
              <Statistic
                title={t('stats.bestAttackTeam')}
                value={getDisplayTeamName(bestTeamsData.best_attack_team?.team_name)}
                suffix={`${bestTeamsData.best_attack_team?.goals_for || 0} ${t('common:goals')}`}
                prefix={<FireOutlined className="text-success-600" />}
                valueStyle={{ color: '#16a34a', fontSize: '16px', fontWeight: 'bold' }}
              />
            </Card>
            
            <Card className="bg-gradient-to-br from-primary-50 to-primary-100 hover:shadow-lg transition-all duration-300 border-l-4 border-primary-500">
              <Statistic
                title={t('stats.bestDefenseTeam')}
                value={getDisplayTeamName(bestTeamsData.best_defense_team?.team_name)}
                suffix={`${t('common:conceded')} ${bestTeamsData.best_defense_team?.goals_against || 0} ${t('common:goals')}`}
                prefix={<SafetyOutlined className="text-primary-600" />}
                valueStyle={{ color: '#2563eb', fontSize: '16px', fontWeight: 'bold' }}
              />
            </Card>
          </div>

          {/* Top Attack Teams */}
          <Card 
            title={
              <div className="flex items-center space-x-2">
                <FireOutlined className="text-success-600" />
                <span className="font-semibold text-gray-800">{t('stats.bestAttackTeamsRanking')}</span>
              </div>
            }
            className="mb-6 shadow-md hover:shadow-lg transition-shadow duration-300 border-t-4 border-success-500"
          >
            <Table
              columns={attackTeamsColumns}
              dataSource={bestTeamsData.top_attack_teams || []}
              rowKey="team_id"
              pagination={false}
              size="small"
              locale={{ emptyText: t('messages.noData') }}
              className="overflow-x-auto"
            />
          </Card>

          {/* Top Defense Teams */}
          <Card 
            title={
              <div className="flex items-center space-x-2">
                <SafetyOutlined className="text-primary-600" />
                <span className="font-semibold text-gray-800">{t('stats.bestDefenseTeamsRanking')}</span>
              </div>
            }
            className="mb-6 shadow-md hover:shadow-lg transition-shadow duration-300 border-t-4 border-primary-500"
          >
            <Table
              columns={defenseTeamsColumns}
              dataSource={bestTeamsData.top_defense_teams || []}
              rowKey="team_id"
              pagination={false}
              size="small"
              locale={{ emptyText: t('messages.noData') }}
              className="overflow-x-auto"
            />
          </Card>

          {/* Analysis Info */}
          <Card 
            title={
              <div className="flex items-center space-x-2">
                <BarChartOutlined className="text-gray-600" />
                <span className="font-semibold text-gray-800">{t('stats.analysisInfo')}</span>
              </div>
            }
            size="small" 
            className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 shadow-sm"
          >
            <div className="text-xs text-gray-600 space-y-2">
              <p className="flex flex-col sm:flex-row">
                <strong className="text-gray-700 mb-1 sm:mb-0 sm:mr-2">{t('stats.analysisDescription')}:</strong> 
                <span>{t('stats.rankingMethodDescription')}</span>
              </p>
              <p className="flex flex-col sm:flex-row">
                <strong className="text-gray-700 mb-1 sm:mb-0 sm:mr-2">{t('stats.dataUpdate')}:</strong> 
                <span>{t('stats.dataUpdateDescription')}</span>
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default ClientBestTeamsStats;