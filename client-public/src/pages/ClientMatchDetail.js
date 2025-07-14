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
  Descriptions,
  Timeline,
  Statistic,
  Progress,
  Divider
} from 'antd';
import { 
  TeamOutlined,
  TrophyOutlined,
  CalendarOutlined,
  FireOutlined,
  ArrowLeftOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StarOutlined,
  ThunderboltOutlined,
  FieldTimeOutlined,
  FlagOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;

const ClientMatchDetail = () => {
  const navigate = useNavigate();
  const { matchId } = useParams();

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

  // Helper function to find the source match for a team position in knockout matches
  const findSourceMatch = (match, teamKey) => {
    if (!match || match.match_type !== 'knockout') return null;
    
    const currentMatchNumber = match.match_number;
    if (!currentMatchNumber) return null;
    
    // Define knockout progression mapping based on match numbers
    const knockoutProgression = {
      // Finals get teams from semifinals
      'FI01': { team1: 'SE01', team2: 'SE02' },
      
      // Semifinals get teams from quarterfinals
      'SE01': { team1: 'QU01', team2: 'QU02' },
      'SE02': { team1: 'QU03', team2: 'QU04' },
      
      // Quarterfinals get teams from round of 16 (if exists)
      'QU01': { team1: 'R16_01', team2: 'R16_02' },
      'QU02': { team1: 'R16_03', team2: 'R16_04' },
      'QU03': { team1: 'R16_05', team2: 'R16_06' },
      'QU04': { team1: 'R16_07', team2: 'R16_08' },
      
      // Round of 16 get teams from round of 32 (if exists)
      'R16_01': { team1: 'R32_01', team2: 'R32_02' },
      'R16_02': { team1: 'R32_03', team2: 'R32_04' },
      'R16_03': { team1: 'R32_05', team2: 'R32_06' },
      'R16_04': { team1: 'R32_07', team2: 'R32_08' },
      'R16_05': { team1: 'R32_09', team2: 'R32_10' },
      'R16_06': { team1: 'R32_11', team2: 'R32_12' },
      'R16_07': { team1: 'R32_13', team2: 'R32_14' },
      'R16_08': { team1: 'R32_15', team2: 'R32_16' }
    };
    
    try {
      const progression = knockoutProgression[currentMatchNumber];
      if (progression) {
        return progression[teamKey];
      }
      return null;
    } catch (error) {
      console.error('Error finding source match:', error);
      return null;
    }
  };

  // Enhanced team display function that shows match references for knockout matches
  const getTeamDisplayNameWithReference = (match, teamKey) => {
    const teamName = match[`${teamKey}_name`];
    if (teamName) return getDisplayTeamName(teamName);
    
    // For knockout matches, show match winner reference when team is not assigned
    if (match.match_type === 'knockout') {
      const teamId = match[`${teamKey}_id`];
      if (!teamId) {
        // Find the source match for this team position
        const sourceMatch = findSourceMatch(match, teamKey);
        if (sourceMatch) {
          return `${sourceMatch}勝者`;
        }
        // If no source match found, show generic placeholder
        return getKnockoutWinnerReference(match.match_number, teamKey) || '待定';
      }
    }
    
    // For non-knockout matches or when team is assigned but no name
    return teamName || '待定';
  };

  // 動態生成淘汰賽勝者引用
  const getKnockoutWinnerReference = (matchNumber, teamPosition) => {
    if (!matchNumber) return '待定';
    
    const matchNum = matchNumber.toUpperCase();
    
    // 定義淘汰賽進階映射
    const knockoutProgression = {
      // 決賽 (Finals) - 來自準決賽
      'FI01': { team1: 'SE01', team2: 'SE02' },
      'FI02': { team1: 'SE03', team2: 'SE04' },
      
      // 季軍賽 (Third Place) - 來自準決賽敗者
      'TP01': { team1: 'SE01', team2: 'SE02' },
      
      // 準決賽 (Semifinals) - 來自八強
      'SE01': { team1: 'QU01', team2: 'QU02' },
      'SE02': { team1: 'QU03', team2: 'QU04' },
      'SE03': { team1: 'QU05', team2: 'QU06' },
      'SE04': { team1: 'QU07', team2: 'QU08' },
      
      // 八強 (Quarterfinals) - 來自十六強
      'QU01': { team1: 'R16_01', team2: 'R16_02' },
      'QU02': { team1: 'R16_03', team2: 'R16_04' },
      'QU03': { team1: 'R16_05', team2: 'R16_06' },
      'QU04': { team1: 'R16_07', team2: 'R16_08' },
      'QU05': { team1: 'R16_09', team2: 'R16_10' },
      'QU06': { team1: 'R16_11', team2: 'R16_12' },
      'QU07': { team1: 'R16_13', team2: 'R16_14' },
      'QU08': { team1: 'R16_15', team2: 'R16_16' },
      
      // 十六強 (Round of 16) - 來自三十二強
      'R16_01': { team1: 'R32_01', team2: 'R32_02' },
      'R16_02': { team1: 'R32_03', team2: 'R32_04' },
      'R16_03': { team1: 'R32_05', team2: 'R32_06' },
      'R16_04': { team1: 'R32_07', team2: 'R32_08' },
      'R16_05': { team1: 'R32_09', team2: 'R32_10' },
      'R16_06': { team1: 'R32_11', team2: 'R32_12' },
      'R16_07': { team1: 'R32_13', team2: 'R32_14' },
      'R16_08': { team1: 'R32_15', team2: 'R32_16' },
      'R16_09': { team1: 'R32_17', team2: 'R32_18' },
      'R16_10': { team1: 'R32_19', team2: 'R32_20' },
      'R16_11': { team1: 'R32_21', team2: 'R32_22' },
      'R16_12': { team1: 'R32_23', team2: 'R32_24' },
      'R16_13': { team1: 'R32_25', team2: 'R32_26' },
      'R16_14': { team1: 'R32_27', team2: 'R32_28' },
      'R16_15': { team1: 'R32_29', team2: 'R32_30' },
      'R16_16': { team1: 'R32_31', team2: 'R32_32' }
    };
    
    const progression = knockoutProgression[matchNum];
    if (progression) {
      const sourceMatch = progression[teamPosition];
      // 季軍賽顯示敗者，其他比賽顯示勝者
      const resultType = matchNum === 'TP01' ? '敗者' : '勝者';
      return `${sourceMatch}${resultType}`;
    }
    
    // 如果是第一輪比賽（沒有來源），返回待定
    if (matchNum.startsWith('QU') || matchNum.startsWith('R16') || matchNum.startsWith('R32')) {
      return '待定';
    }
    
    return '待定';
  };

  // Helper function to get navigation target (team ID or source match number)
  const getNavigationTarget = (match, teamKey) => {
    const teamId = match[`${teamKey}_id`];
    const teamName = match[`${teamKey}_name`];
    
    // If team is assigned, navigate to team page
    if (teamId && teamName) {
      return { type: 'team', id: teamId };
    }
    
    // For knockout matches without assigned teams, navigate to source match
    if (match.match_type === 'knockout' && !teamId) {
      const sourceMatch = findSourceMatch(match, teamKey);
      if (sourceMatch) {
        return { type: 'match', matchNumber: sourceMatch };
      }
    }
    
    return null;
  };

  // Helper function to find match ID by match number
  const findMatchIdByNumber = async (matchNumber) => {
    try {
      console.log(`🔍 Searching for match: ${matchNumber}`);
      
      // Try to find the match in current tournament first
      if (match?.tournament_id) {
        console.log(`🏆 Searching in tournament: ${match.tournament_id}`);
        try {
          const tournamentResponse = await axios.get(`/api/tournaments/${match.tournament_id}/matches?limit=100`);
          if (tournamentResponse.data.success) {
            const matches = Array.isArray(tournamentResponse.data.data) ? 
              tournamentResponse.data.data : 
              (tournamentResponse.data.data.matches || []);
            
            console.log(`📋 Found ${matches.length} matches in tournament`);
            const foundMatch = matches.find(m => m.match_number === matchNumber);
            if (foundMatch) {
              console.log(`✅ Found match ${matchNumber} with ID: ${foundMatch.match_id}`);
              return foundMatch.match_id;
            }
          }
        } catch (tournamentError) {
          console.log('Tournament-specific search failed, trying general search');
        }
      }
      
      // Fallback to general matches endpoint
      console.log(`🌐 Searching in all matches`);
      const response = await axios.get(`/api/matches?limit=100`);
      if (response.data.success) {
        const matches = Array.isArray(response.data.data) ? 
          response.data.data : 
          (response.data.data.matches || []);
        
        console.log(`📋 Found ${matches.length} total matches`);
        const foundMatch = matches.find(m => m.match_number === matchNumber);
        if (foundMatch) {
          console.log(`✅ Found match ${matchNumber} with ID: ${foundMatch.match_id}`);
          return foundMatch.match_id;
        }
      }
      
      console.log(`❌ Match ${matchNumber} not found in any search`);
    } catch (error) {
      console.error('Error finding match by number:', error);
    }
    return null;
  };

  // Enhanced navigation handler
  const handleTeamNavigation = async (match, teamKey) => {
    const target = getNavigationTarget(match, teamKey);
    
    if (!target) {
      return; // No valid navigation target
    }
    
    if (target.type === 'team') {
      navigate(`/teams/${target.id}`);
    } else if (target.type === 'match') {
      // Find the match ID for the source match number
      const matchId = await findMatchIdByNumber(target.matchNumber);
      if (matchId) {
        navigate(`/matches/${matchId}`);
      } else {
        // Fallback: navigate to matches list with filter
        console.log(`Source match ${target.matchNumber} not found, redirecting to matches list`);
        navigate(`/matches?search=${target.matchNumber}`);
      }
    }
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

  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMatchDetail();
  }, [matchId]);

  const fetchMatchDetail = async () => {
    try {
      setLoading(true);
      
      // Fetch match detail
      const matchResponse = await axios.get(`/api/matches/${matchId}`);
      if (matchResponse.data.success) {
        const matchData = matchResponse.data.data;
        setMatch(matchData.match);
        setEvents(matchData.events || []);
      }

    } catch (error) {
      console.error('Error fetching match detail:', error);
      setError('載入比賽詳情失敗');
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
      <Tag color={statusInfo.color} icon={statusInfo.icon} style={{ fontSize: '14px', padding: '4px 12px' }}>
        {statusInfo.text}
      </Tag>
    );
  };

  const getMatchTypeTag = (type) => {
    const typeMap = {
      'group': { color: 'blue', text: '小組賽' },
      'knockout': { color: 'purple', text: '淘汰賽' },
      'friendly': { color: 'green', text: '友誼賽' }
    };
    
    const typeInfo = typeMap[type] || { color: 'default', text: type };
    return <Tag color={typeInfo.color} style={{ fontSize: '14px', padding: '4px 12px' }}>{typeInfo.text}</Tag>;
  };

  const getWinnerInfo = (match) => {
    if (match.match_status !== 'completed' || !match.winner_id) {
      return null;
    }

    const winnerName = match.winner_id === match.team1_id ? getTeamDisplayNameWithReference(match, 'team1') : getTeamDisplayNameWithReference(match, 'team2');
    const winnerColor = match.winner_id === match.team1_id ? match.team1_color : match.team2_color;
    
    const winReasonMap = {
      'score': '比分獲勝',
      'fouls': '犯規較少',
      'referee': '裁判判決',
      'draw': '平局'
    };

    return {
      name: winnerName,
      color: winnerColor,
      reason: winReasonMap[match.win_reason] || match.win_reason
    };
  };

  const getEventIcon = (eventType) => {
    const eventIcons = {
      'goal': <TrophyOutlined style={{ color: '#52c41a' }} />,
      'foul': <FlagOutlined style={{ color: '#f5222d' }} />,
      'start': <PlayCircleOutlined style={{ color: '#1890ff' }} />,
      'end': <CheckCircleOutlined style={{ color: '#722ed1' }} />,
      'timeout': <ClockCircleOutlined style={{ color: '#faad14' }} />
    };
    
    return eventIcons[eventType] || <StarOutlined style={{ color: '#d9d9d9' }} />;
  };

  const formatEventTime = (eventTime) => {
    if (!eventTime) return '';
    
    // Convert seconds to MM:SS format
    const minutes = Math.floor(eventTime / 60);
    const seconds = eventTime % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>載入比賽詳情中...</Text>
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
            <Button size="small" onClick={fetchMatchDetail}>
              重新載入
            </Button>
          }
        />
      </div>
    );
  }

  if (!match) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="比賽不存在"
          description="找不到指定的比賽資訊"
          type="warning"
          showIcon
        />
      </div>
    );
  }

  const winnerInfo = getWinnerInfo(match);
  const matchDuration = match.match_time ? `${Math.floor(match.match_time / 60)} 分鐘` : '10 分鐘';

  return (
    <div style={{ padding: 24 }}>
      {/* Back Button */}
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/matches')}
        style={{ marginBottom: 16 }}
      >
        返回比賽列表
      </Button>

      {/* Match Header */}
      <Card style={{ marginBottom: 24 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space direction="vertical" size="small">
              <Title level={2} style={{ margin: 0 }}>
                <PlayCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                {match.match_number}
              </Title>
              <Space>
                {getMatchTypeTag(match.match_type)}
                {match.group_name && (
                  <Tag color="cyan">{getDisplayGroupName(match.group_name)}</Tag>
                )}
              </Space>
            </Space>
          </Col>
          <Col>
            {getMatchStatusTag(match.match_status)}
          </Col>
        </Row>
      </Card>

      {/* Match Score and Teams */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[24, 24]} align="middle">
          {/* Team 1 */}
          <Col xs={24} md={8} style={{ textAlign: 'center' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div 
                style={{ 
                  width: 80, 
                  height: 80, 
                  backgroundColor: match.team1_color || '#1890ff',
                  borderRadius: '50%',
                  margin: '0 auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: winnerInfo && winnerInfo.name === getTeamDisplayNameWithReference(match, 'team1') ? '4px solid #faad14' : 'none'
                }}
              >
                <TeamOutlined style={{ fontSize: '32px', color: 'white' }} />
              </div>
              <div>
                <Button
                  type="link"
                  style={{ 
                    padding: 0, 
                    height: 'auto', 
                    fontSize: '24px', 
                    fontWeight: 'bold',
                    color: 'inherit'
                  }}
                  onClick={() => handleTeamNavigation(match, 'team1')}
                >
                  {getTeamDisplayNameWithReference(match, 'team1')}
                </Button>
                {winnerInfo && winnerInfo.name === getTeamDisplayNameWithReference(match, 'team1') && (
                  <Tag color="gold" icon={<TrophyOutlined />} style={{ marginTop: 8 }}>
                    獲勝
                  </Tag>
                )}
              </div>
            </Space>
          </Col>

          {/* Score */}
          <Col xs={24} md={8} style={{ textAlign: 'center' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {match.match_status === 'completed' ? (
                <div>
                  <Title level={1} style={{ margin: 0, fontSize: '48px', color: '#1890ff' }}>
                    {match.team1_score || 0} - {match.team2_score || 0}
                  </Title>
                  {winnerInfo && winnerInfo.reason && (
                    <Text type="secondary">({winnerInfo.reason})</Text>
                  )}
                </div>
              ) : match.match_status === 'active' ? (
                <div>
                  <Title level={1} style={{ margin: 0, fontSize: '48px', color: '#f5222d' }}>
                    {match.team1_score || 0} - {match.team2_score || 0}
                  </Title>
                  <Tag color="processing" icon={<PlayCircleOutlined />}>
                    比賽進行中
                  </Tag>
                </div>
              ) : (
                <div>
                  <Title level={1} style={{ margin: 0, fontSize: '48px', color: '#d9d9d9' }}>
                    - : -
                  </Title>
                  <Text type="secondary">比賽尚未開始</Text>
                </div>
              )}
            </Space>
          </Col>

          {/* Team 2 */}
          <Col xs={24} md={8} style={{ textAlign: 'center' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div 
                style={{ 
                  width: 80, 
                  height: 80, 
                  backgroundColor: match.team2_color || '#52c41a',
                  borderRadius: '50%',
                  margin: '0 auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: winnerInfo && winnerInfo.name === getTeamDisplayNameWithReference(match, 'team2') ? '4px solid #faad14' : 'none'
                }}
              >
                <TeamOutlined style={{ fontSize: '32px', color: 'white' }} />
              </div>
              <div>
                <Button
                  type="link"
                  style={{ 
                    padding: 0, 
                    height: 'auto', 
                    fontSize: '24px', 
                    fontWeight: 'bold',
                    color: 'inherit'
                  }}
                  onClick={() => handleTeamNavigation(match, 'team2')}
                >
                  {getTeamDisplayNameWithReference(match, 'team2')}
                </Button>
                {winnerInfo && winnerInfo.name === getTeamDisplayNameWithReference(match, 'team2') && (
                  <Tag color="gold" icon={<TrophyOutlined />} style={{ marginTop: 8 }}>
                    獲勝
                  </Tag>
                )}
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[24, 24]}>
        {/* Match Information */}
        <Col xs={24} lg={12}>
          <Card>
            <Title level={3}>
              <CalendarOutlined style={{ marginRight: 8 }} />
              比賽資訊
            </Title>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="比賽時間">
                {match.match_date ? moment(match.match_date).format('YYYY/MM/DD HH:mm') : '待定'}
              </Descriptions.Item>
              <Descriptions.Item label="比賽時長">
                {matchDuration}
              </Descriptions.Item>
              <Descriptions.Item label="比賽類型">
                {getMatchTypeTag(match.match_type)}
              </Descriptions.Item>
              {match.group_name && (
                <Descriptions.Item label="所屬小組">
                  <Tag color="cyan">{getDisplayGroupName(match.group_name)}</Tag>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="比賽狀態">
                {getMatchStatusTag(match.match_status)}
              </Descriptions.Item>
              {match.match_status === 'completed' && (
                <>
                  <Descriptions.Item label="開始時間">
                    {match.start_time ? moment(match.start_time).format('HH:mm:ss') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="結束時間">
                    {match.end_time ? moment(match.end_time).format('HH:mm:ss') : '-'}
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>
          </Card>
        </Col>

        {/* Match Statistics */}
        <Col xs={24} lg={12}>
          <Card>
            <Title level={3}>
              <ThunderboltOutlined style={{ marginRight: 8 }} />
              比賽統計
            </Title>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card size="small">
                  <Statistic
                    title={getTeamDisplayNameWithReference(match, 'team1')}
                    value={match.team1_score || 0}
                    prefix={<TrophyOutlined style={{ color: match.team1_color || '#1890ff' }} />}
                    valueStyle={{ color: match.team1_color || '#1890ff' }}
                    suffix="進球"
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <Statistic
                    title={getTeamDisplayNameWithReference(match, 'team2')}
                    value={match.team2_score || 0}
                    prefix={<TrophyOutlined style={{ color: match.team2_color || '#52c41a' }} />}
                    valueStyle={{ color: match.team2_color || '#52c41a' }}
                    suffix="進球"
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <Statistic
                    title={`${getTeamDisplayNameWithReference(match, 'team1')} 犯規次數`}
                    value={match.team1_fouls || 0}
                    prefix={<FlagOutlined style={{ color: '#f5222d' }} />}
                    valueStyle={{ color: '#f5222d' }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <Statistic
                    title={`${getTeamDisplayNameWithReference(match, 'team2')} 犯規次數`}
                    value={match.team2_fouls || 0}
                    prefix={<FlagOutlined style={{ color: '#f5222d' }} />}
                    valueStyle={{ color: '#f5222d' }}
                  />
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Match Events */}
      {events.length > 0 && (
        <Card style={{ marginTop: 24 }}>
          <Title level={3}>
            <FieldTimeOutlined style={{ marginRight: 8 }} />
            比賽事件
          </Title>
          <Timeline mode="left">
            {events.map((event, index) => (
              <Timeline.Item
                key={index}
                dot={getEventIcon(event.event_type)}
                label={formatEventTime(event.event_time)}
              >
                <Space direction="vertical" size="small">
                  <Text strong>
                    {getDisplayTeamName(event.team_name)} - {event.event_type}
                  </Text>
                  {event.athlete_name && (
                    <Text type="secondary">球員: {event.athlete_name}</Text>
                  )}
                  {event.description && (
                    <Text>{event.description}</Text>
                  )}
                </Space>
              </Timeline.Item>
            ))}
          </Timeline>
        </Card>
      )}

      {/* Quick Navigation */}
      <Card style={{ marginTop: 24 }}>
        <Title level={4}>相關頁面</Title>
        <Space wrap>
          <Button 
            type="primary" 
            icon={<TeamOutlined />}
            onClick={() => handleTeamNavigation(match, 'team1')}
          >
            查看 {getTeamDisplayNameWithReference(match, 'team1')}
          </Button>
          <Button 
            type="primary" 
            icon={<TeamOutlined />}
            onClick={() => handleTeamNavigation(match, 'team2')}
          >
            查看 {getTeamDisplayNameWithReference(match, 'team2')}
          </Button>
          {match.group_id && (
            <Button 
              icon={<TrophyOutlined />}
              onClick={() => navigate(`/groups/${match.group_id}`)}
            >
              查看小組詳情
            </Button>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default ClientMatchDetail;