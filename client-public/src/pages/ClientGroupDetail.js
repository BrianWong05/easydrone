import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Space, 
  Tag,
  Spin,
  Alert,
  Statistic,
  Row,
  Col,
  Table,
  Descriptions,
  Divider,
  Button,
  Progress
} from 'antd';
import { 
  TeamOutlined,
  TrophyOutlined,
  CalendarOutlined,
  FireOutlined,
  ArrowLeftOutlined,
  StarOutlined,
  ThunderboltOutlined,
  UsergroupAddOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;

const ClientGroupDetail = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
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
        setError('找不到可顯示的錦標賽');
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
        setStandings(groupData.standings || []);
      }

    } catch (error) {
      console.error('Error fetching group detail:', error);
      setError('載入小組詳情失敗');
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
      'pending': { color: 'default', text: '待開始' },
      'in_progress': { color: 'processing', text: '進行中' },
      'completed': { color: 'success', text: '已完成' },
      'cancelled': { color: 'error', text: '已取消' }
    };
    
    const statusInfo = statusMap[status] || { color: 'default', text: status };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
  };

  const getResultTag = (result) => {
    const resultMap = {
      'win': { color: 'success', text: '勝' },
      'draw': { color: 'warning', text: '平' },
      'loss': { color: 'error', text: '負' }
    };
    
    if (!result) return null;
    const resultInfo = resultMap[result];
    return <Tag color={resultInfo.color}>{resultInfo.text}</Tag>;
  };

  // Standings table columns
  const standingsColumns = [
    {
      title: '排名',
      key: 'rank',
      align: 'center',
      width: 60,
      render: (_, record, index) => (
        <div style={{ 
          width: 30, 
          height: 30, 
          borderRadius: '50%', 
          backgroundColor: index < 2 ? '#faad14' : '#d9d9d9',
          color: index < 2 ? 'white' : '#666',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold'
        }}>
          {index + 1}
        </div>
      ),
    },
    {
      title: '隊伍',
      dataIndex: 'team_name',
      key: 'team_name',
      render: (name, record) => (
        <Space>
          <div 
            style={{ 
              width: 16, 
              height: 16, 
              backgroundColor: record.team_color || '#1890ff',
              borderRadius: '50%'
            }}
          />
          <Text 
            strong 
            style={{ 
              color: '#1890ff', 
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
            onClick={() => navigate(`/teams/${record.team_id}`)}
          >
            {getDisplayTeamName(name)}
          </Text>
        </Space>
      ),
    },
    {
      title: '賽',
      dataIndex: 'matches_played',
      key: 'matches_played',
      align: 'center',
      width: 50,
    },
    {
      title: '勝',
      dataIndex: 'wins',
      key: 'wins',
      align: 'center',
      width: 50,
    },
    {
      title: '平',
      dataIndex: 'draws',
      key: 'draws',
      align: 'center',
      width: 50,
    },
    {
      title: '負',
      dataIndex: 'losses',
      key: 'losses',
      align: 'center',
      width: 50,
    },
    {
      title: '進球',
      dataIndex: 'goals_for',
      key: 'goals_for',
      align: 'center',
      width: 60,
    },
    {
      title: '失球',
      dataIndex: 'goals_against',
      key: 'goals_against',
      align: 'center',
      width: 60,
    },
    {
      title: '淨勝球',
      key: 'goal_difference',
      align: 'center',
      width: 80,
      render: (_, record) => {
        const diff = (record.goals_for || 0) - (record.goals_against || 0);
        return (
          <Text style={{ color: diff > 0 ? '#52c41a' : diff < 0 ? '#f5222d' : '#666' }}>
            {diff > 0 ? '+' : ''}{diff}
          </Text>
        );
      },
    },
    {
      title: '積分',
      dataIndex: 'points',
      key: 'points',
      align: 'center',
      width: 60,
      render: (points) => <Text strong style={{ color: '#1890ff' }}>{points}</Text>,
    },
  ];

  // Matches table columns
  const matchesColumns = [
    {
      title: '場次',
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
      title: '對戰',
      key: 'teams',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Space>
            <Text strong>{getDisplayTeamName(record.team1_name)}</Text>
            <Text type="secondary">vs</Text>
            <Text strong>{getDisplayTeamName(record.team2_name)}</Text>
          </Space>
          {record.match_status === 'completed' && (
            <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
              {record.team1_score || 0} - {record.team2_score || 0}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '時間',
      dataIndex: 'match_date',
      key: 'match_date',
      render: (date) => date ? moment(date).format('MM/DD HH:mm') : '-',
    },
    {
      title: '狀態',
      dataIndex: 'match_status',
      key: 'match_status',
      align: 'center',
      render: (status) => getMatchStatusTag(status),
    },
    {
      title: '操作',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Button 
          type="link" 
          size="small"
          onClick={() => navigate(`/matches/${record.match_id}`)}
        >
          查看詳情
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>載入小組詳情中...</Text>
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
            <Button size="small" onClick={fetchGroupDetail}>
              重新載入
            </Button>
          }
        />
      </div>
    );
  }

  if (!group) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="小組不存在"
          description="找不到指定的小組資訊"
          type="warning"
          showIcon
        />
      </div>
    );
  }

  const completedMatches = matches.filter(m => m.match_status === 'completed').length;
  const totalMatches = matches.length;
  const matchProgress = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

  return (
    <div style={{ padding: 24 }}>
      {/* Back Button */}
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/groups')}
        style={{ marginBottom: 16 }}
      >
        返回小組列表
      </Button>

      {/* Group Header */}
      <Card style={{ marginBottom: 24 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space direction="vertical" size="small">
              <Title level={2} style={{ margin: 0 }}>
                <UsergroupAddOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                {getDisplayGroupName(group.group_name)}
              </Title>
              {tournament && (
                <Text type="secondary">{tournament.tournament_name}</Text>
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
                {teams.length} / {group.max_teams} 隊伍
              </Tag>
              <Tag color={matchProgress === 100 ? 'success' : 'processing'}>
                比賽進度 {matchProgress}%
              </Tag>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="參賽隊伍"
              value={teams.length}
              prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
              suffix={`/ ${group.max_teams}`}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="總比賽數"
              value={totalMatches}
              prefix={<CalendarOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已完成"
              value={completedMatches}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
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
                percent={matchProgress} 
                size={60}
                status={matchProgress === 100 ? 'success' : 'active'}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Group Standings */}
      <Card style={{ marginBottom: 24 }}>
        <Title level={3}>
          <TrophyOutlined style={{ marginRight: 8 }} />
          小組積分榜
        </Title>
        <Table
          columns={standingsColumns}
          dataSource={standings}
          rowKey="team_id"
          pagination={false}
          size="small"
          locale={{
            emptyText: (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <TrophyOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">暫無積分資料</Text>
                </div>
              </div>
            )
          }}
        />
      </Card>

      {/* Group Matches */}
      <Card>
        <Title level={3}>
          <PlayCircleOutlined style={{ marginRight: 8 }} />
          小組賽程
        </Title>
        <Table
          columns={matchesColumns}
          dataSource={matches}
          rowKey="match_id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 項，共 ${total} 場比賽`,
          }}
          locale={{
            emptyText: (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <CalendarOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">暫無比賽資料</Text>
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