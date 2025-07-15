import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Space, 
  Avatar, 
  Tag,
  Spin,
  Alert,
  Statistic,
  Row,
  Col,
  Table,
  Descriptions,
  Divider,
  List
} from 'antd';
import { 
  TeamOutlined,
  UserOutlined,
  TrophyOutlined,
  CalendarOutlined,
  FireOutlined,
  ArrowLeftOutlined,
  StarOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;

const ClientTeamDetail = () => {
  const { t } = useTranslation(['team', 'common', 'public', 'match', 'athlete']);
  const navigate = useNavigate();
  const { teamId } = useParams();
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

  // 清理小組名稱顯示（移除 _{tournament_id} 後綴）並翻譯
  const getDisplayGroupName = (groupName) => {
    if (!groupName) return '';
    const lastUnderscoreIndex = groupName.lastIndexOf('_');
    let cleanName = groupName;
    if (lastUnderscoreIndex !== -1) {
      const beforeUnderscore = groupName.substring(0, lastUnderscoreIndex);
      const afterUnderscore = groupName.substring(lastUnderscoreIndex + 1);
      if (/^\d+$/.test(afterUnderscore)) {
        cleanName = beforeUnderscore;
      }
    }
    
    // 翻譯小組名稱：將 "小組A" 轉換為 "Group A"
    if (cleanName.startsWith('小組')) {
      const groupLetter = cleanName.replace('小組', '');
      return `${t('common:group')} ${groupLetter}`;
    }
    
    return cleanName;
  };

  const [team, setTeam] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState({
    totalMatches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTeamDetail();
  }, [teamId]);

  const calculateTeamStats = (matches) => {
    let totalMatches = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    let points = 0;

    matches.forEach(match => {
      if (match.match_status === 'completed') {
        totalMatches++;
        
        const isTeam1 = match.team1_id === parseInt(teamId);
        const teamScore = isTeam1 ? match.team1_score : match.team2_score;
        const opponentScore = isTeam1 ? match.team2_score : match.team1_score;
        
        goalsFor += teamScore || 0;
        goalsAgainst += opponentScore || 0;
        
        if (teamScore > opponentScore) {
          wins++;
          points += 3;
        } else if (teamScore === opponentScore) {
          draws++;
          points += 1;
        } else {
          losses++;
        }
      }
    });

    return {
      totalMatches,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      points
    };
  };

  const fetchTeamDetail = async () => {
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

      // Fetch team details using direct team endpoint
      const teamResponse = await axios.get(`/api/teams/${teamId}`);
      if (teamResponse.data.success) {
        const teamData = teamResponse.data.data;
        // Handle nested team structure from API
        const team = teamData.team || teamData;
        setTeam(team);
        
        // Calculate team statistics from matches data (will be calculated from actual matches)
        const teamStats = {
          totalMatches: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0
        };
        setStats(teamStats);
      }

      // Set athletes from team data (already included in team response)
      if (teamResponse.data.success && teamResponse.data.data.athletes) {
        setAthletes(teamResponse.data.data.athletes);
      }

      // Set matches from team data and calculate statistics
      if (teamResponse.data.success && teamResponse.data.data.matches) {
        const teamMatches = teamResponse.data.data.matches;
        setMatches(teamMatches);
        
        // Calculate team statistics from actual match data
        const calculatedStats = calculateTeamStats(teamMatches);
        setStats(calculatedStats);
      }

    } catch (error) {
      console.error('Error fetching team detail:', error);
      setError(t('team:messages.loadingTeams'));
    } finally {
      setLoading(false);
    }
  };

  const getMatchResult = (match) => {
    if (match.match_status !== 'completed') return t('match:results.pending');
    
    const isTeam1 = match.team1_id === parseInt(teamId);
    const teamScore = isTeam1 ? match.team1_score : match.team2_score;
    const opponentScore = isTeam1 ? match.team2_score : match.team1_score;
    
    if (teamScore > opponentScore) return t('match:results.win');
    if (teamScore < opponentScore) return t('match:results.loss');
    return t('match:results.draw');
  };

  const getMatchResultColor = (result) => {
    switch (result) {
      case t('match:results.win'): return '#52c41a';
      case t('match:results.loss'): return '#ff4d4f';
      case t('match:results.draw'): return '#faad14';
      default: return '#666';
    }
  };

  const athleteColumns = [
    {
      title: t('athlete:athlete.name'),
      key: 'athlete',
      render: (_, record) => (
        <Space>
          <Avatar 
            style={{ 
              backgroundColor: team?.team_color || '#1890ff',
              color: '#fff'
            }} 
            icon={<UserOutlined />} 
          />
          <div>
            <Text strong>{record.name}</Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                #{record.jersey_number}
              </Text>
            </div>
          </div>
        </Space>
      )
    },
    {
      title: t('athlete:athlete.position'),
      dataIndex: 'position',
      key: 'position',
      render: (position) => {
        const positionMap = {
          'attacker': { text: t('athlete:positions.attacker'), color: 'red' },
          'defender': { text: t('athlete:positions.defender'), color: 'blue' },
          'substitute': { text: t('athlete:positions.substitute'), color: 'orange' }
        };
        const pos = positionMap[position] || { text: position, color: 'default' };
        return <Tag color={pos.color}>{pos.text}</Tag>;
      }
    },
    {
      title: t('athlete:athlete.status'),
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? t('athlete:status.active') : t('athlete:status.inactive')}
        </Tag>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>{t('team:messages.loadingTeamDetail', { defaultValue: '載入隊伍詳情中...' })}</Text>
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

  if (!team) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message={t('team:messages.teamNotFound', { defaultValue: '隊伍不存在' })}
          description={t('team:messages.teamNotFoundDesc', { defaultValue: '找不到指定的隊伍資訊' })}
          type="warning"
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Back Button and Header */}
        <Card>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text 
              style={{ color: '#1890ff', cursor: 'pointer' }}
              onClick={() => navigate('/teams')}
            >
              <ArrowLeftOutlined /> 返回隊伍列表
            </Text>
            
            <Row align="middle" justify="space-between">
              <Col>
                <Space align="center">
                  <Avatar 
                    size={64}
                    style={{ 
                      backgroundColor: team.team_color || '#1890ff',
                      border: `3px solid ${team.team_color || '#1890ff'}`,
                      color: '#fff'
                    }} 
                    icon={<TeamOutlined />} 
                  />
                  <div>
                    <Title level={2} style={{ margin: 0, color: team.team_color || '#000' }}>
                      {getDisplayTeamName(team.team_name)}
                    </Title>
                    <Space>
                      {team.group_name && (
                        <Tag color="blue" style={{ fontSize: 14 }}>
                          {getDisplayGroupName(team.group_name)}
                        </Tag>
                      )}
                      <Text type="secondary">
                        {tournament?.tournament_name}
                      </Text>
                    </Space>
                  </div>
                </Space>
              </Col>
            </Row>
          </Space>
        </Card>

        {/* Team Statistics */}
        <Card title={t('team:messages.teamStatistics')}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title={t('team:team.matchesPlayed')}
                value={stats.totalMatches}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={t('team:team.points')}
                value={stats.points}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={t('team:team.goalsFor')}
                value={stats.goalsFor}
                prefix={<FireOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={t('team:team.goalsAgainst')}
                value={stats.goalsAgainst}
                prefix={<ThunderboltOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Col>
          </Row>
          
          <Divider />
          
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title={t('team:team.wins')}
                value={stats.wins}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title={t('team:team.draws')}
                value={stats.draws}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title={t('team:team.losses')}
                value={stats.losses}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Col>
          </Row>
        </Card>

        {/* Team Information */}
        <Card title={t('team:team.detail')}>
          <Descriptions column={2} bordered>
            <Descriptions.Item label={t('team:team.name')}>{getDisplayTeamName(team.team_name)}</Descriptions.Item>
            <Descriptions.Item label={t('team:labels.teamColor', { defaultValue: '隊伍顏色' })}>
              <Space>
                <div 
                  style={{ 
                    width: 20, 
                    height: 20, 
                    backgroundColor: team.team_color,
                    border: '1px solid #d9d9d9',
                    borderRadius: 4
                  }} 
                />
                {team.team_color}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label={t('team:team.group')}>
              {team.group_name ? `${t('team:team.group')} ${getDisplayGroupName(team.group_name)}` : t('team:messages.noGroupAssigned')}
            </Descriptions.Item>
            <Descriptions.Item label={t('team:team.memberCount')}>{athletes.length} {t('team:labels.people', { defaultValue: '人' })}</Descriptions.Item>
            <Descriptions.Item label={t('team:labels.createdTime', { defaultValue: '創建時間' })}>
              {moment(team.created_at).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label={t('team:labels.lastUpdated', { defaultValue: '最後更新' })}>
              {moment(team.updated_at).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
            {team.description && (
              <Descriptions.Item label={t('team:team.description')} span={2}>
                <Text>{team.description}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* Team Members */}
        <Card title={`${t('team:team.members')} (${athletes.length})`}>
          <Table
            columns={athleteColumns}
            dataSource={athletes}
            rowKey="athlete_id"
            pagination={false}
            locale={{
              emptyText: (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <UserOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                  <div>
                    <Text type="secondary" style={{ fontSize: 16 }}>{t('athlete:messages.noAthleteData')}</Text>
                  </div>
                </div>
              )
            }}
          />
        </Card>

        {/* Recent Matches */}
        <Card title={`${t('match:match.recent')} (${matches.length})`}>
          <List
            dataSource={matches.slice(0, 10)}
            locale={{
              emptyText: (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <CalendarOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                  <div>
                    <Text type="secondary" style={{ fontSize: 16 }}>{t('team:messages.noMatchHistory')}</Text>
                  </div>
                </div>
              )
            }}
            renderItem={(match) => {
              const isTeam1 = match.team1_id === parseInt(teamId);
              const opponent = isTeam1 ? match.team2_name : match.team1_name;
              const teamScore = isTeam1 ? match.team1_score : match.team2_score;
              const opponentScore = isTeam1 ? match.team2_score : match.team1_score;
              const result = getMatchResult(match);
              
              return (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        style={{ 
                          backgroundColor: getMatchResultColor(result),
                          color: '#fff'
                        }}
                      >
                        {result}
                      </Avatar>
                    }
                    title={
                      <Space>
                        <Text 
                          strong 
                          style={{ 
                            color: '#1890ff', 
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                          onClick={() => navigate(`/matches/${match.match_id}`)}
                        >
                          {getDisplayTeamName(team.team_name)} vs {getDisplayTeamName(opponent)}
                        </Text>
                        {match.match_status === 'completed' && (
                          <Text>
                            {teamScore} - {opponentScore}
                          </Text>
                        )}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size="small">
                        <Text type="secondary">
                          {moment(match.match_date).format('YYYY-MM-DD HH:mm')}
                        </Text>
                        {match.group_name && (
                          <Tag color="blue" size="small">
                            {t('team:team.group')} {getDisplayGroupName(match.group_name)}
                          </Tag>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              );
            }}
          />
        </Card>
      </Space>
    </div>
  );
};

export default ClientTeamDetail;