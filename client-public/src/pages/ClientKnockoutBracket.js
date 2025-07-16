import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Tag,
  Spin,
  Alert,
  Button,
  Statistic,
  Progress,
  Empty,
  Space,
  Row,
  Col
} from 'antd';
import { 
  TrophyOutlined,
  CalendarOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  CrownOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;

const ClientKnockoutBracket = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['tournament', 'match', 'common']);
  
  // 清理隊伍名稱顯示（移除 _{tournament_id} 後綴）
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

  const [tournament, setTournament] = useState(null);
  const [brackets, setBrackets] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalMatches: 0,
    completedMatches: 0,
    totalRounds: 0,
    champion: null
  });

  useEffect(() => {
    fetchKnockoutData();
  }, []);

  const fetchKnockoutData = async () => {
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
        setError(t('common:messages.noTournamentFound', { defaultValue: '找不到可顯示的錦標賽' }));
        return;
      }

      setTournament(tournamentData);
      const tournamentId = tournamentData.tournament_id;

      // Fetch knockout bracket data
      try {
        const bracketResponse = await axios.get(`/api/tournaments/${tournamentId}/bracket`);
        if (bracketResponse.data.success) {
          const bracketData = bracketResponse.data.data.rounds || {};
          setBrackets(bracketData);
          
          // Calculate statistics
          let totalMatches = 0;
          let completedMatches = 0;
          let champion = null;
          let maxRoundNumber = 0;
          
          // First pass: find the maximum round number (final round)
          Object.keys(bracketData).forEach(roundKey => {
            const roundNumber = parseInt(roundKey);
            if (roundNumber > maxRoundNumber) {
              maxRoundNumber = roundNumber;
            }
          });
          
          Object.values(bracketData).forEach(roundMatches => {
            roundMatches.forEach(match => {
              totalMatches++;
              if (match.match_status === 'completed') {
                completedMatches++;
                
                // Check if this is the final match (highest round number AND tournament_stage is 'final')
                if (match.round_number === maxRoundNumber && match.tournament_stage === 'final' && match.winner_name) {
                  champion = {
                    name: getDisplayTeamName(match.winner_name),
                    color: match.winner_id === match.team1_id ? match.team1_color : match.team2_color
                  };
                }
              }
            });
          });
          
          setStats({
            totalMatches,
            completedMatches,
            totalRounds: Object.keys(bracketData).length,
            champion
          });
        }
      } catch (bracketError) {
        console.log('No knockout bracket data available');
        setBrackets({});
      }

    } catch (error) {
      console.error('Error fetching knockout data:', error);
      setError(t('tournament:messages.loadingKnockoutData'));
    } finally {
      setLoading(false);
    }
  };

  const getMatchStatusTag = (status) => {
    const statusMap = {
      'pending': { color: 'default', text: t('match:status.pending'), icon: <ClockCircleOutlined /> },
      'active': { color: 'processing', text: t('match:status.inProgress'), icon: <PlayCircleOutlined /> },
      'in_progress': { color: 'processing', text: t('match:status.inProgress'), icon: <PlayCircleOutlined /> },
      'completed': { color: 'success', text: t('match:status.completed'), icon: <CheckCircleOutlined /> },
      'cancelled': { color: 'error', text: t('match:status.cancelled'), icon: <ClockCircleOutlined /> }
    };
    
    const statusInfo = statusMap[status] || { color: 'default', text: status, icon: <ClockCircleOutlined /> };
    return (
      <Tag color={statusInfo.color} icon={statusInfo.icon} size="small">
        {statusInfo.text}
      </Tag>
    );
  };

  const getRoundName = (roundNumber, totalRounds) => {
    const remainingRounds = totalRounds - roundNumber + 1;
    switch (remainingRounds) {
      case 1:
        return t('tournament:rounds.final');
      case 2:
        return t('tournament:rounds.semifinal');
      case 3:
        return t('tournament:rounds.quarterfinal');
      case 4:
        return t('tournament:rounds.round16');
      default:
        return t('tournament:rounds.roundNumber', { number: roundNumber });
    }
  };

  const getMatchDisplayName = (match) => {
    if (match.tournament_stage === 'third_place') {
      return `🥉 ${t('tournament:rounds.thirdPlace')}`;
    }
    return match.match_number;
  };

  const getTeamDisplayName = (match, teamKey) => {
    const teamName = match[`${teamKey}_name`];
    if (teamName) return getDisplayTeamName(teamName);
    
    // 特殊處理：季軍賽顯示準決賽敗者
    if (match.tournament_stage === 'third_place') {
      // 找到所有準決賽比賽
      const semiMatches = [];
      Object.values(brackets).forEach(roundMatches => {
        roundMatches.forEach(m => {
          if (m.tournament_stage === 'semi_final') {
            semiMatches.push(m);
          }
        });
      });

      // 按比賽編號排序
      semiMatches.sort((a, b) => a.match_number.localeCompare(b.match_number));

      if (semiMatches.length >= 2) {
        if (teamKey === "team1") {
          return `${semiMatches[0].match_number}${t('match:result.loser')}`;
        } else {
          return `${semiMatches[1].match_number}${t('match:result.loser')}`;
        }
      }
      return t('match:status.pending');
    }
    
    // Show match winner reference for teams that haven't advanced yet
    const teamId = match[`${teamKey}_id`];
    if (!teamId) {
      // Find the source match for this team position
      const sourceMatch = findSourceMatch(match, teamKey);
      if (sourceMatch) {
        return `${sourceMatch}${t('match:result.winner')}`;
      }
      // If no source match found, show a generic placeholder based on round
      const currentRound = match.round_number;
      if (currentRound === 1) {
        return t('match:status.pending'); // First round teams are manually assigned
      }
      return t('tournament:roundWinner', { round: currentRound-1 });
    }
    
    return t('tournament:teamNumber', { id: teamId });
  };

  // Helper function to find the source match for a team position
  const findSourceMatch = (match, teamKey) => {
    if (!brackets || Object.keys(brackets).length === 0) return null;
    
    const currentRound = match.round_number;
    const currentPosition = match.position_in_round;
    
    // Skip if this is the first round (no source matches)
    if (currentRound <= 1) return null;
    
    // For team1, it comes from position (currentPosition * 2 - 1) in previous round
    // For team2, it comes from position (currentPosition * 2) in previous round
    const sourcePosition = teamKey === 'team1' ? 
      (currentPosition * 2 - 1) : 
      (currentPosition * 2);
    
    try {
      // Find matches in the previous round
      const previousRoundMatches = brackets[currentRound - 1];
      if (!previousRoundMatches) return null;
      
      const sourceMatch = previousRoundMatches.find(m => 
        m && m.position_in_round === sourcePosition
      );
      
      return sourceMatch ? sourceMatch.match_number : null;
    } catch (error) {
      console.error('Error finding source match:', error);
      return null;
    }
  };

  const renderMatchCard = (match) => {
    const isCompleted = match.match_status === 'completed';
    const team1Name = getTeamDisplayName(match, 'team1');
    const team2Name = getTeamDisplayName(match, 'team2');
    const isTeam1Winner = match.winner_id === match.team1_id;
    const isTeam2Winner = match.winner_id === match.team2_id;
    const isThirdPlace = match.tournament_stage === 'third_place';

    return (
      <Card 
        key={match.match_id}
        size="small" 
        className={`mb-4 min-w-[280px] cursor-pointer transition-all duration-300 hover:shadow-lg ${
          isThirdPlace 
            ? 'border-2 border-warning-500 bg-warning-50' 
            : isCompleted 
              ? 'border-2 border-success-500 bg-success-50' 
              : 'border border-gray-300 bg-white hover:border-primary-300'
        }`}
        onClick={() => navigate(`/matches/${match.match_id}`)}
      >
        <div className="space-y-3 w-full">
          {/* Match Header */}
          <div className="flex justify-between items-center">
            <Text strong className={`text-xs font-semibold ${
              isThirdPlace ? 'text-warning-600' : 'text-gray-700'
            }`}>
              {getMatchDisplayName(match)}
            </Text>
            <div>
              {getMatchStatusTag(match.match_status)}
            </div>
          </div>

          {/* Teams and Score */}
          <div>
            {/* Team 1 */}
            <Row justify="space-between" align="middle" style={{ marginBottom: 4 }}>
              <Col flex="auto">
                <Space>
                  <div 
                    style={{ 
                      width: 12, 
                      height: 12, 
                      backgroundColor: match.team1_color || '#1890ff',
                      borderRadius: '50%'
                    }}
                  />
                  <Text 
                    strong={isTeam1Winner} 
                    style={{ 
                      color: isTeam1Winner ? '#52c41a' : 'inherit',
                      fontSize: '14px'
                    }}
                  >
                    {team1Name}
                  </Text>
                  {isTeam1Winner && <TrophyOutlined style={{ color: '#faad14' }} />}
                </Space>
              </Col>
              <Col>
                <Text 
                  strong 
                  style={{ 
                    fontSize: '16px',
                    color: isCompleted ? '#1890ff' : '#d9d9d9'
                  }}
                >
                  {isCompleted ? (match.team1_score || 0) : '-'}
                </Text>
              </Col>
            </Row>

            {/* Team 2 */}
            <Row justify="space-between" align="middle">
              <Col flex="auto">
                <Space>
                  <div 
                    style={{ 
                      width: 12, 
                      height: 12, 
                      backgroundColor: match.team2_color || '#52c41a',
                      borderRadius: '50%'
                    }}
                  />
                  <Text 
                    strong={isTeam2Winner} 
                    style={{ 
                      color: isTeam2Winner ? '#52c41a' : 'inherit',
                      fontSize: '14px'
                    }}
                  >
                    {team2Name}
                  </Text>
                  {isTeam2Winner && <TrophyOutlined style={{ color: '#faad14' }} />}
                </Space>
              </Col>
              <Col>
                <Text 
                  strong 
                  style={{ 
                    fontSize: '16px',
                    color: isCompleted ? '#1890ff' : '#d9d9d9'
                  }}
                >
                  {isCompleted ? (match.team2_score || 0) : '-'}
                </Text>
              </Col>
            </Row>
          </div>

          {/* Match Date */}
          {match.match_date && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {moment(match.match_date).format('MM/DD HH:mm')}
            </Text>
          )}
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <Spin size="large" />
        <div className="mt-4">
          <Text className="text-gray-600 animate-pulse">{t('tournament:messages.loadingKnockoutData')}</Text>
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
                onClick={fetchKnockoutData}
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

  const hasKnockoutData = Object.keys(brackets).length > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      {/* Tournament Header */}
      {tournament && (
        <Card className="mb-8 shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-warning-500">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <Title level={2} className="m-0 flex items-center text-gray-800">
                <TrophyOutlined className="mr-3 text-warning-600" />
                <span className="bg-gradient-to-r from-warning-600 to-warning-700 bg-clip-text text-transparent">
                  {tournament.tournament_name}
                </span>
              </Title>
              <Text type="secondary" className="text-gray-600 text-base">
                {t('tournament:bracket.title')}
              </Text>
            </div>
            <div className="flex flex-wrap gap-3">
              <Tag 
                color="purple" 
                className="text-sm px-3 py-1 font-medium bg-purple-50 border-purple-200 text-purple-700"
              >
                {t('tournament:bracket.knockout')}
              </Tag>
              {stats.champion && (
                <Tag 
                  color="gold" 
                  icon={<CrownOutlined />} 
                  className="text-sm px-3 py-1 font-medium bg-yellow-50 border-yellow-200 text-yellow-700"
                >
                  {t('tournament:champion.title')}: {stats.champion.name}
                </Tag>
              )}
            </div>
          </div>
        </Card>
      )}

      {hasKnockoutData ? (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-primary-500">
              <Statistic
                title={t('common:stats.totalMatches')}
                value={stats.totalMatches}
                prefix={<CalendarOutlined className="text-primary-600" />}
                valueStyle={{ color: '#2563eb', fontWeight: 'bold' }}
              />
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-success-500">
              <Statistic
                title={t('common:stats.completedMatches')}
                value={stats.completedMatches}
                prefix={<CheckCircleOutlined className="text-success-600" />}
                valueStyle={{ color: '#16a34a', fontWeight: 'bold' }}
              />
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-warning-500">
              <Statistic
                title={t('tournament:stats.totalRounds')}
                value={stats.totalRounds}
                prefix={<ThunderboltOutlined className="text-warning-600" />}
                valueStyle={{ color: '#d97706', fontWeight: 'bold' }}
              />
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-gray-400">
              <div className="text-center">
                <Text type="secondary" className="block mb-2 text-gray-600 font-medium">
                  {t('tournament:stats.progress')}
                </Text>
                <Progress 
                  type="circle" 
                  percent={stats.totalMatches > 0 ? Math.round((stats.completedMatches / stats.totalMatches) * 100) : 0}
                  size={80}
                  strokeColor={stats.completedMatches === stats.totalMatches ? '#16a34a' : '#2563eb'}
                  className="animate-bounce-gentle"
                />
              </div>
            </Card>
          </div>

          {/* Knockout Bracket */}
          <Card>
            <Title level={3}>
              <ThunderboltOutlined style={{ marginRight: 8 }} />
              {t('tournament:bracket.bracket')}
            </Title>
            
            <div style={{ overflowX: 'auto', padding: '16px 0' }}>
              <Row gutter={[24, 16]} style={{ minWidth: '800px' }}>
                {Object.keys(brackets)
                  .sort((a, b) => parseInt(a) - parseInt(b)) // Sort rounds in ascending order (final on the right)
                  .map(roundNumber => {
                    const roundMatches = brackets[roundNumber];
                    // 分離季軍賽和常規比賽
                    const regularMatches = roundMatches.filter(match => match.tournament_stage !== 'third_place');
                    const thirdPlaceMatches = roundMatches.filter(match => match.tournament_stage === 'third_place');
                    
                    if (regularMatches.length === 0) return null; // 如果這一輪只有季軍賽，跳過
                    
                    const roundName = getRoundName(parseInt(roundNumber), stats.totalRounds);
                    
                    return (
                      <Col key={roundNumber} flex="1" style={{ minWidth: '300px' }}>
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                          <Title level={4} style={{ margin: 0 }}>
                            {roundName}
                          </Title>
                          <Text type="secondary">
                            {regularMatches.filter(m => m.match_status === 'completed').length} / {regularMatches.length} {t('common:stats.completed')}
                          </Text>
                        </div>
                        
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center',
                          gap: '16px'
                        }}>
                          {regularMatches.map(match => renderMatchCard(match))}
                        </div>
                      </Col>
                    );
                  })}
              </Row>
              
              {/* 季軍賽單獨顯示 */}
              {Object.values(brackets).some(roundMatches => 
                roundMatches.some(match => match.tournament_stage === 'third_place')
              ) && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <Title level={4} style={{ margin: 0, color: '#fa8c16' }}>
                      🥉 {t('tournament:rounds.thirdPlace')}
                    </Title>
                  </div>
                  <Row justify="center">
                    <Col>
                      {Object.values(brackets).map(roundMatches => 
                        roundMatches
                          .filter(match => match.tournament_stage === 'third_place')
                          .map(match => renderMatchCard(match))
                      )}
                    </Col>
                  </Row>
                </div>
              )}
            </div>
          </Card>

          {/* Champion Display */}
          {stats.champion && (
            <Card style={{ marginTop: 24, textAlign: 'center' }}>
              <Space direction="vertical" size="large">
                <Title level={2}>
                  <CrownOutlined style={{ color: '#faad14', marginRight: 8 }} />
                  {t('tournament:champion.tournament')}
                </Title>
                <div 
                  style={{ 
                    width: 120, 
                    height: 120, 
                    backgroundColor: stats.champion.color || '#faad14',
                    borderRadius: '50%',
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '4px solid #faad14'
                  }}
                >
                  <TrophyOutlined style={{ fontSize: '48px', color: 'white' }} />
                </div>
                <Title level={1} style={{ color: '#faad14', margin: 0 }}>
                  {stats.champion.name}
                </Title>
                <Text type="secondary" style={{ fontSize: '16px' }}>
                  {t('tournament:champion.congratulations', { tournament: tournament?.tournament_name })}
                </Text>
              </Space>
            </Card>
          )}
        </>
      ) : (
        /* No Knockout Data */
        <Card>
          <Empty
            image={<ThunderboltOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />}
            description={
              <Space direction="vertical" size="small">
                <Text type="secondary" style={{ fontSize: '16px' }}>
                  {t('tournament:messages.noKnockoutData')}
                </Text>
                <Text type="secondary">
                  {t('tournament:messages.noKnockoutDataDesc')}
                </Text>
              </Space>
            }
          >
            <Space>
              <Button type="primary" onClick={() => navigate('/matches')}>
                {t('tournament:actions.viewAllMatches')}
              </Button>
              <Button onClick={() => navigate('/groups')}>
                {t('tournament:actions.viewGroupStage')}
              </Button>
            </Space>
          </Empty>
        </Card>
      )}
    </div>
  );
};

export default ClientKnockoutBracket;