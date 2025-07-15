import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Space, 
  Tag,
  Spin,
  Alert,
  Row,
  Col,
  Button,
  Statistic,
  Progress,
  Empty
} from 'antd';
import { 
  TeamOutlined,
  TrophyOutlined,
  CalendarOutlined,
  FireOutlined,
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
        style={{ 
          marginBottom: 16, 
          minWidth: 280,
          cursor: 'pointer',
          border: isThirdPlace ? '2px solid #ffa940' : (isCompleted ? '2px solid #52c41a' : '1px solid #d9d9d9'),
          backgroundColor: isThirdPlace ? '#fff7e6' : 'white'
        }}
        onClick={() => navigate(`/matches/${match.match_id}`)}
        hoverable
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {/* Match Header */}
          <Row justify="space-between" align="middle">
            <Col>
              <Text strong style={{ fontSize: '12px', color: isThirdPlace ? '#fa8c16' : 'inherit' }}>
                {getMatchDisplayName(match)}
              </Text>
            </Col>
            <Col>
              {getMatchStatusTag(match.match_status)}
            </Col>
          </Row>

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
        </Space>
      </Card>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>{t('tournament:messages.loadingKnockoutData')}</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message={t('common:messages.loadFailed')}
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchKnockoutData}>
              {t('common:actions.reload')}
            </Button>
          }
        />
      </div>
    );
  }

  const hasKnockoutData = Object.keys(brackets).length > 0;

  return (
    <div style={{ padding: 24 }}>
      {/* Tournament Header */}
      {tournament && (
        <Card style={{ marginBottom: 24 }}>
          <Row align="middle" justify="space-between">
            <Col>
              <Space direction="vertical" size="small">
                <Title level={2} style={{ margin: 0 }}>
                  <TrophyOutlined style={{ marginRight: 8, color: '#faad14' }} />
                  {tournament.tournament_name}
                </Title>
                <Text type="secondary">{t('tournament:bracket.title')}</Text>
              </Space>
            </Col>
            <Col>
              <Space>
                <Tag color="purple" style={{ fontSize: '14px', padding: '4px 12px' }}>
                  {t('tournament:bracket.knockout')}
                </Tag>
                {stats.champion && (
                  <Tag color="gold" icon={<CrownOutlined />} style={{ fontSize: '14px', padding: '4px 12px' }}>
                    {t('tournament:champion.title')}: {stats.champion.name}
                  </Tag>
                )}
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {hasKnockoutData ? (
        <>
          {/* Statistics Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t('common:stats.totalMatches')}
                  value={stats.totalMatches}
                  prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t('common:stats.completedMatches')}
                  value={stats.completedMatches}
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t('tournament:stats.totalRounds')}
                  value={stats.totalRounds}
                  prefix={<ThunderboltOutlined style={{ color: '#faad14' }} />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    {t('tournament:stats.progress')}
                  </Text>
                  <Progress 
                    type="circle" 
                    percent={stats.totalMatches > 0 ? Math.round((stats.completedMatches / stats.totalMatches) * 100) : 0}
                    size={60}
                    status={stats.completedMatches === stats.totalMatches ? 'success' : 'active'}
                  />
                </div>
              </Card>
            </Col>
          </Row>

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