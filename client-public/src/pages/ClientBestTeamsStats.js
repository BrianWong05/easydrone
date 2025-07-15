import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Table, 
  Space, 
  Spin, 
  Alert,
  Row,
  Col,
  Statistic,
  Tag
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
      render: (goals) => <span style={{ fontWeight: 'bold', color: '#52c41a' }}>{goals}</span>
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
      title: t('rankings.goalsAgainst'),
      dataIndex: 'goals_against',
      key: 'goals_against',
      width: 100,
      align: 'center',
      render: (goals) => <span style={{ fontWeight: 'bold', color: '#ff4d4f' }}>{goals}</span>
    },
    {
      title: t('metrics.averageGoalsAgainst'),
      dataIndex: 'avg_goals_against',
      key: 'avg_goals_against',
      width: 100,
      align: 'center',
      render: (avg) => <span style={{ fontWeight: 'bold' }}>{avg}</span>
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
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>{t('messages.loadingStats')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message={t('messages.noData')}
          description={error}
          type="info"
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <BarChartOutlined /> {t('stats.bestTeams')}
        </Title>
        
      </div>

      {bestTeamsData && (
        <>
          {/* Summary */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t('metrics.totalMatches')}
                  value={bestTeamsData.summary?.total_matches_analyzed || 0}
                  prefix={<BarChartOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t('metrics.totalTeams')}
                  value={bestTeamsData.summary?.teams_analyzed || 0}
                  prefix={<TrophyOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card style={{ backgroundColor: '#f6ffed' }}>
                <Statistic
                  title={t('stats.bestAttackTeam')}
                  value={getDisplayTeamName(bestTeamsData.best_attack_team?.team_name)}
                  suffix={`${bestTeamsData.best_attack_team?.goals_for || 0} ${t('common:goals')}`}
                  prefix={<FireOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a', fontSize: '16px' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card style={{ backgroundColor: '#e6f7ff' }}>
                <Statistic
                  title={t('stats.bestDefenseTeam')}
                  value={getDisplayTeamName(bestTeamsData.best_defense_team?.team_name)}
                  suffix={`${t('common:conceded')} ${bestTeamsData.best_defense_team?.goals_against || 0} ${t('common:goals')}`}
                  prefix={<SafetyOutlined style={{ color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff', fontSize: '16px' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Top Attack Teams */}
          <Card 
            title={<><FireOutlined style={{ color: '#52c41a' }} /> {t('stats.bestAttackTeamsRanking')}</>} 
            style={{ marginBottom: '24px' }}
          >
            <Table
              columns={attackTeamsColumns}
              dataSource={bestTeamsData.top_attack_teams || []}
              rowKey="team_id"
              pagination={false}
              size="small"
              locale={{ emptyText: t('messages.noData') }}
            />
          </Card>

          {/* Top Defense Teams */}
          <Card 
            title={<><SafetyOutlined style={{ color: '#1890ff' }} /> {t('stats.bestDefenseTeamsRanking')}</>}
            style={{ marginBottom: '24px' }}
          >
            <Table
              columns={defenseTeamsColumns}
              dataSource={bestTeamsData.top_defense_teams || []}
              rowKey="team_id"
              pagination={false}
              size="small"
              locale={{ emptyText: t('messages.noData') }}
            />
          </Card>

          {/* Analysis Info */}
          <Card title={t('stats.analysisInfo')} size="small">
            <div style={{ fontSize: '12px', color: '#666' }}>
              <p><strong>{t('stats.analysisDescription')}:</strong> {t('stats.rankingMethodDescription')}</p>
              <p><strong>{t('stats.dataUpdate')}:</strong> {t('stats.dataUpdateDescription')}</p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default ClientBestTeamsStats;