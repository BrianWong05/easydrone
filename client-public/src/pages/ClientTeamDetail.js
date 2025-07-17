import React, { useState, useEffect } from 'react';
import { 
  Card, 
 
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
            <span className="font-bold">{record.name}</span>
            <div>
              <span className="text-gray-500" style={{ fontSize: 12 }}>
                #{record.jersey_number}
              </span>
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
      <div className="p-6 text-center bg-gray-50 min-h-screen">
        <Spin size="large" />
        <div className="mt-4">
          <span className="text-gray-600">{t('team:messages.loadingTeamDetail', { defaultValue: '載入隊伍詳情中...' })}</span>
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

  if (!team) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <Alert
          message={t('team:messages.teamNotFound', { defaultValue: '隊伍不存在' })}
          description={t('team:messages.teamNotFoundDesc', { defaultValue: '找不到指定的隊伍資訊' })}
          type="warning"
          showIcon
          className="bg-white shadow-sm"
        />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen max-w-7xl mx-auto">
      <div className="flex flex-col gap-6">
        {/* Back Button and Header */}
        <Card className="bg-white shadow-sm border-l-4 border-l-blue-500">
          <div className="flex flex-col gap-4">
            <span 
              className="text-blue-600 cursor-pointer hover:text-blue-800 transition-colors duration-200"
              onClick={() => navigate('/teams')}
            >
              <ArrowLeftOutlined className="mr-2" /> 返回隊伍列表
            </span>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar 
                  size={64}
                  style={{ 
                    backgroundColor: team.team_color || '#1890ff',
                    border: `3px solid ${team.team_color || '#1890ff'}`,
                    color: '#fff'
                  }} 
                  icon={<TeamOutlined />} 
                  className="shadow-lg"
                />
                <div className="flex flex-col gap-2">
                  <h2 
                    level={2} 
                    className="m-0 font-bold"
                    style={{ color: team.team_color || '#000' }}
                  >
                    {getDisplayTeamName(team.team_name)}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    {team.group_name && (
                      <Tag color="blue" className="text-sm px-3 py-1">
                        {getDisplayGroupName(team.group_name)}
                      </Tag>
                    )}
                    <span className="text-gray-500" className="text-gray-600">
                      {tournament?.tournament_name}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Team Statistics */}
        <Card 
          title={
            <div className="flex items-center gap-2">
              <TrophyOutlined className="text-blue-500" />
              <span className="text-gray-800 font-semibold">{t('team:messages.teamStatistics')}</span>
            </div>
          }
          className="bg-white shadow-sm"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-blue-50 border-blue-200">
              <Statistic
                title={<span className="text-gray-600 text-sm">{t('team:team.matchesPlayed')}</span>}
                value={stats.totalMatches}
                prefix={<CalendarOutlined className="text-blue-500" />}
                valueStyle={{ color: '#1890ff', fontSize: '20px', fontWeight: 'bold' }}
              />
            </Card>
            <Card className="bg-yellow-50 border-yellow-200">
              <Statistic
                title={<span className="text-gray-600 text-sm">{t('team:team.points')}</span>}
                value={stats.points}
                prefix={<TrophyOutlined className="text-yellow-500" />}
                valueStyle={{ color: '#faad14', fontSize: '20px', fontWeight: 'bold' }}
              />
            </Card>
            <Card className="bg-green-50 border-green-200">
              <Statistic
                title={<span className="text-gray-600 text-sm">{t('team:team.goalsFor')}</span>}
                value={stats.goalsFor}
                prefix={<FireOutlined className="text-green-500" />}
                valueStyle={{ color: '#52c41a', fontSize: '20px', fontWeight: 'bold' }}
              />
            </Card>
            <Card className="bg-red-50 border-red-200">
              <Statistic
                title={<span className="text-gray-600 text-sm">{t('team:team.goalsAgainst')}</span>}
                value={stats.goalsAgainst}
                prefix={<ThunderboltOutlined className="text-red-500" />}
                valueStyle={{ color: '#ff4d4f', fontSize: '20px', fontWeight: 'bold' }}
              />
            </Card>
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-green-50 border-green-200">
                <Statistic
                  title={<span className="text-gray-600 text-sm">{t('team:team.wins')}</span>}
                  value={stats.wins}
                  valueStyle={{ color: '#52c41a', fontSize: '18px', fontWeight: 'bold' }}
                />
              </Card>
              <Card className="bg-yellow-50 border-yellow-200">
                <Statistic
                  title={<span className="text-gray-600 text-sm">{t('team:team.draws')}</span>}
                  value={stats.draws}
                  valueStyle={{ color: '#faad14', fontSize: '18px', fontWeight: 'bold' }}
                />
              </Card>
              <Card className="bg-red-50 border-red-200">
                <Statistic
                  title={<span className="text-gray-600 text-sm">{t('team:team.losses')}</span>}
                  value={stats.losses}
                  valueStyle={{ color: '#ff4d4f', fontSize: '18px', fontWeight: 'bold' }}
                />
              </Card>
            </div>
          </div>
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
                <span>{team.description}</span>
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
                <div className="text-center py-10">
                  <UserOutlined className="text-5xl text-gray-300 mb-4" />
                  <div>
                    <span className="text-gray-500" className="text-base text-gray-500">{t('athlete:messages.noAthleteData')}</span>
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
                <div className="text-center py-10">
                  <CalendarOutlined className="text-5xl text-gray-300 mb-4" />
                  <div>
                    <span className="text-gray-500" className="text-base text-gray-500">{t('team:messages.noMatchHistory')}</span>
                  </div>
                </div>
              )
            }}
            renderItem={(match) => {
              // Safety check to ensure match object has required properties
              if (!match || !match.team1_id || !match.team2_id) {
                return null;
              }
              
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
                        <span 
                          strong 
                          style={{ 
                            color: '#1890ff', 
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                          onClick={() => match.match_id && navigate(`/matches/${match.match_id}`)}
                        >
                          {getDisplayTeamName(team.team_name)} vs {getDisplayTeamName(opponent)}
                        </span>
                        {match.match_status === 'completed' && (
                          <span>
                            {teamScore} - {opponentScore}
                          </span>
                        )}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size="small">
                        <span className="text-gray-500">
                          {moment(match.match_date).format('YYYY-MM-DD HH:mm')}
                        </span>
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
      </div>
    </div>
  );
};

export default ClientTeamDetail;