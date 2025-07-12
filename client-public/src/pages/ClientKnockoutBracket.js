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
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;

const ClientKnockoutBracket = () => {
  const navigate = useNavigate();
  
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
        setError('找不到可顯示的錦標賽');
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
                
                // Check if this is the final match (highest round number)
                if (match.round_number === maxRoundNumber && match.winner_name) {
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
      setError('載入淘汰賽資料失敗');
    } finally {
      setLoading(false);
    }
  };

  const getMatchStatusTag = (status) => {
    const statusMap = {
      'pending': { color: 'default', text: '待開始', icon: <ClockCircleOutlined /> },
      'active': { color: 'processing', text: '進行中', icon: <PlayCircleOutlined /> },
      'in_progress': { color: 'processing', text: '進行中', icon: <PlayCircleOutlined /> },
      'completed': { color: 'success', text: '已完成', icon: <CheckCircleOutlined /> },
      'cancelled': { color: 'error', text: '已取消', icon: <ClockCircleOutlined /> }
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
        return "決賽";
      case 2:
        return "準決賽";
      case 3:
        return "八強賽";
      case 4:
        return "十六強賽";
      default:
        return `第${roundNumber}輪`;
    }
  };

  const getTeamDisplayName = (match, teamKey) => {
    const teamName = match[`${teamKey}_name`];
    if (teamName) return getDisplayTeamName(teamName);
    
    // Show placeholder for teams that haven't advanced yet
    const teamId = match[`${teamKey}_id`];
    if (!teamId) {
      return '待定';
    }
    
    return `隊伍 ${teamId}`;
  };

  const renderMatchCard = (match) => {
    const isCompleted = match.match_status === 'completed';
    const team1Name = getTeamDisplayName(match, 'team1');
    const team2Name = getTeamDisplayName(match, 'team2');
    const isTeam1Winner = match.winner_id === match.team1_id;
    const isTeam2Winner = match.winner_id === match.team2_id;

    return (
      <Card 
        key={match.match_id}
        size="small" 
        style={{ 
          marginBottom: 16, 
          minWidth: 280,
          cursor: 'pointer',
          border: isCompleted ? '2px solid #52c41a' : '1px solid #d9d9d9'
        }}
        onClick={() => navigate(`/matches/${match.match_id}`)}
        hoverable
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {/* Match Header */}
          <Row justify="space-between" align="middle">
            <Col>
              <Text strong style={{ fontSize: '12px' }}>
                {match.match_number}
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
          <Text>載入淘汰賽資料中...</Text>
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
          action={
            <Button size="small" onClick={fetchKnockoutData}>
              重新載入
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
                <Text type="secondary">淘汰賽對戰表</Text>
              </Space>
            </Col>
            <Col>
              <Space>
                <Tag color="purple" style={{ fontSize: '14px', padding: '4px 12px' }}>
                  淘汰賽
                </Tag>
                {stats.champion && (
                  <Tag color="gold" icon={<CrownOutlined />} style={{ fontSize: '14px', padding: '4px 12px' }}>
                    冠軍: {stats.champion.name}
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
                  title="總比賽數"
                  value={stats.totalMatches}
                  prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="已完成"
                  value={stats.completedMatches}
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="總輪數"
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
                    比賽進度
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
              對戰表
            </Title>
            
            <div style={{ overflowX: 'auto', padding: '16px 0' }}>
              <Row gutter={[24, 16]} style={{ minWidth: '800px' }}>
                {Object.keys(brackets)
                  .sort((a, b) => parseInt(a) - parseInt(b)) // Sort rounds in ascending order (final on the right)
                  .map(roundNumber => {
                    const roundMatches = brackets[roundNumber];
                    const roundName = getRoundName(parseInt(roundNumber), stats.totalRounds);
                    
                    return (
                      <Col key={roundNumber} flex="1" style={{ minWidth: '300px' }}>
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                          <Title level={4} style={{ margin: 0 }}>
                            {roundName}
                          </Title>
                          <Text type="secondary">
                            {roundMatches.filter(m => m.match_status === 'completed').length} / {roundMatches.length} 已完成
                          </Text>
                        </div>
                        
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center',
                          gap: '16px'
                        }}>
                          {roundMatches.map(match => renderMatchCard(match))}
                        </div>
                      </Col>
                    );
                  })}
              </Row>
            </div>
          </Card>

          {/* Champion Display */}
          {stats.champion && (
            <Card style={{ marginTop: 24, textAlign: 'center' }}>
              <Space direction="vertical" size="large">
                <Title level={2}>
                  <CrownOutlined style={{ color: '#faad14', marginRight: 8 }} />
                  錦標賽冠軍
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
                  恭喜獲得 {tournament?.tournament_name} 冠軍！
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
                  暫無淘汰賽資料
                </Text>
                <Text type="secondary">
                  此錦標賽可能尚未開始淘汰賽階段，或採用其他賽制
                </Text>
              </Space>
            }
          >
            <Space>
              <Button type="primary" onClick={() => navigate('/matches')}>
                查看所有比賽
              </Button>
              <Button onClick={() => navigate('/groups')}>
                查看小組賽
              </Button>
            </Space>
          </Empty>
        </Card>
      )}
    </div>
  );
};

export default ClientKnockoutBracket;