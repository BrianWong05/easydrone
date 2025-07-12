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
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;

const ClientTeamDetail = () => {
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
        setError('找不到可顯示的錦標賽');
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
      setError('載入隊伍詳情失敗');
    } finally {
      setLoading(false);
    }
  };

  const getMatchResult = (match) => {
    if (match.match_status !== 'completed') return '待進行';
    
    const isTeam1 = match.team1_id === parseInt(teamId);
    const teamScore = isTeam1 ? match.team1_score : match.team2_score;
    const opponentScore = isTeam1 ? match.team2_score : match.team1_score;
    
    if (teamScore > opponentScore) return '勝';
    if (teamScore < opponentScore) return '負';
    return '平';
  };

  const getMatchResultColor = (result) => {
    switch (result) {
      case '勝': return '#52c41a';
      case '負': return '#ff4d4f';
      case '平': return '#faad14';
      default: return '#666';
    }
  };

  const athleteColumns = [
    {
      title: '球員',
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
      title: '位置',
      dataIndex: 'position',
      key: 'position',
      render: (position) => {
        const positionMap = {
          'attacker': { text: '進攻手', color: 'red' },
          'defender': { text: '防守員', color: 'blue' },
          'substitute': { text: '替補', color: 'orange' }
        };
        const pos = positionMap[position] || { text: position, color: 'default' };
        return <Tag color={pos.color}>{pos.text}</Tag>;
      }
    },
    {
      title: '狀態',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '活躍' : '非活躍'}
        </Tag>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>載入隊伍詳情中...</Text>
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
        />
      </div>
    );
  }

  if (!team) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="隊伍不存在"
          description="找不到指定的隊伍資訊"
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
                          小組 {getDisplayGroupName(team.group_name)}
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
        <Card title="隊伍統計">
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="比賽場次"
                value={stats.totalMatches}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="積分"
                value={stats.points}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="進球"
                value={stats.goalsFor}
                prefix={<FireOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="失球"
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
                title="勝場"
                value={stats.wins}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="平局"
                value={stats.draws}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="敗場"
                value={stats.losses}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Col>
          </Row>
        </Card>

        {/* Team Information */}
        <Card title="隊伍資訊">
          <Descriptions column={2} bordered>
            <Descriptions.Item label="隊伍名稱">{getDisplayTeamName(team.team_name)}</Descriptions.Item>
            <Descriptions.Item label="隊伍顏色">
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
            <Descriptions.Item label="所屬小組">
              {team.group_name ? `小組 ${getDisplayGroupName(team.group_name)}` : '未分配'}
            </Descriptions.Item>
            <Descriptions.Item label="成員數量">{athletes.length} 人</Descriptions.Item>
            <Descriptions.Item label="創建時間">
              {moment(team.created_at).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="最後更新">
              {moment(team.updated_at).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Team Members */}
        <Card title={`隊伍成員 (${athletes.length})`}>
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
                    <Text type="secondary" style={{ fontSize: 16 }}>暫無隊員資料</Text>
                  </div>
                </div>
              )
            }}
          />
        </Card>

        {/* Recent Matches */}
        <Card title={`最近比賽 (${matches.length})`}>
          <List
            dataSource={matches.slice(0, 10)}
            locale={{
              emptyText: (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <CalendarOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                  <div>
                    <Text type="secondary" style={{ fontSize: 16 }}>暫無比賽記錄</Text>
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
                        <Text strong>{getDisplayTeamName(team.team_name)} vs {getDisplayTeamName(opponent)}</Text>
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
                            小組 {getDisplayGroupName(match.group_name)}
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