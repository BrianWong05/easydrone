import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Space, Table, Tag, Descriptions, Row, Col, Statistic, message, Modal, Spin } from 'antd';
import { ArrowLeftOutlined, EditOutlined, UserAddOutlined, TrophyOutlined, TeamOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import moment from 'moment';
import axios from 'axios';

const { Title, Text } = Typography;

const TournamentTeamDetail = () => {
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
  const navigate = useNavigate();
  const { id: tournamentId, teamId } = useParams();
  const [loading, setLoading] = useState(true);
  const [teamData, setTeamData] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchTeamDetail();
  }, [teamId, tournamentId]);

  // Listen for match result updates and refresh data
  useEffect(() => {
    const handleStorageChange = () => {
      const matchResultUpdated = localStorage.getItem('matchResultUpdated');
      if (matchResultUpdated) {
        // Clear the flag and refresh data
        localStorage.removeItem('matchResultUpdated');
        console.log('🔄 Match result was updated, refreshing team data...');
        fetchTeamDetail();
      }
    };

    // Check on component mount
    handleStorageChange();

    // Listen for storage changes (when user navigates back from result edit)
    window.addEventListener('storage', handleStorageChange);
    
    // Also check when the window gains focus (when user returns to this tab)
    window.addEventListener('focus', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  const fetchTeamDetail = async () => {
    try {
      setLoading(true);
      
      // Fetch team details using tournament-scoped endpoint
      const teamResponse = await axios.get(`/api/teams/${teamId}`);
      if (teamResponse.data.success) {
        const teamData = teamResponse.data.data;
        const team = teamData.team || teamData;
        
        // Verify this team belongs to the current tournament
        if (team.tournament_id && team.tournament_id.toString() !== tournamentId) {
          message.error('隊伍不屬於當前錦標賽');
          navigate(`/tournaments/${tournamentId}/teams`);
          return;
        }
        
        setTeamData(team);
        
        // Fetch athletes for this team
        if (teamData.athletes) {
          setAthletes(teamData.athletes);
        }
        
        // Fetch matches for this team separately
        await fetchTeamMatches();
        
      } else {
        message.error('獲取隊伍詳情失敗');
        navigate(`/tournaments/${tournamentId}/teams`);
      }
    } catch (error) {
      console.error('獲取隊伍詳情錯誤:', error);
      message.error('獲取隊伍詳情失敗');
      navigate(`/tournaments/${tournamentId}/teams`);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMatches = async () => {
    try {
      // Fetch matches for this team in this tournament using tournament-scoped endpoint
      const response = await axios.get(`/api/tournaments/${tournamentId}/matches?team_id=${teamId}`);
      if (response.data.success) {
        const matchesData = response.data.data.matches || [];
        setMatches(matchesData);
        
        // Calculate team statistics with the fetched matches
        const teamStats = calculateTeamStats(matchesData);
        setStats(teamStats);
      }
    } catch (error) {
      console.error('獲取隊伍比賽錯誤:', error);
      message.error('無法載入比賽信息');
    }
  };

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
        
        // Use winner_id to determine result instead of calculating from scores
        // This ensures manual referee decisions are respected
        if (match.winner_id === parseInt(teamId)) {
          wins++;
          points += 3;
        } else if (match.winner_id === null) {
          draws++;
          points += 1;
        } else if (match.winner_id) {
          // Winner is the opponent
          losses++;
        } else {
          // Fallback to score-based calculation if winner_id is not set
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
      }
    });

    return {
      totalMatches,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      points
    };
  };

  const handleBack = () => {
    navigate(`/tournaments/${tournamentId}/teams`);
  };

  const handleEdit = () => {
    navigate(`/tournaments/${tournamentId}/teams/${teamId}/edit`);
  };

  const handleAddAthlete = () => {
    navigate(`/tournaments/${tournamentId}/athletes/create?teamId=${teamId}`);
  };

  const handleDeleteTeam = () => {
    Modal.confirm({
      title: '確認刪除',
      content: `確定要刪除隊伍 "${getDisplayTeamName(teamData.team_name)}" 嗎？此操作將同時刪除所有相關的運動員和比賽記錄，且無法撤銷。`,
      okText: '確定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await axios.delete(`/api/teams/${teamId}`);
          if (response.data.success) {
            message.success('隊伍刪除成功');
            navigate(`/tournaments/${tournamentId}/teams`);
          }
        } catch (error) {
          console.error('刪除隊伍錯誤:', error);
          message.error('刪除隊伍失敗');
        }
      }
    });
  };

  const getPositionText = (position) => {
    const positionMap = {
      'attacker': '進攻手',
      'defender': '防守員',
      'substitute': '替補'
    };
    return positionMap[position] || position;
  };

  const getPositionColor = (position) => {
    const colorMap = {
      'attacker': 'red',
      'defender': 'blue',
      'substitute': 'orange'
    };
    return colorMap[position] || 'default';
  };

  const getMatchResult = (match) => {
    if (match.match_status !== 'completed') return '-';
    
    // Use winner_id to determine result instead of calculating from scores
    // This ensures manual referee decisions are respected
    if (match.winner_id === parseInt(teamId)) {
      return '勝';
    } else if (match.winner_id === null) {
      return '平';
    } else if (match.winner_id) {
      return '負';
    } else {
      // Fallback to score-based calculation if winner_id is not set
      const isTeam1 = match.team1_id === parseInt(teamId);
      const teamScore = isTeam1 ? match.team1_score : match.team2_score;
      const opponentScore = isTeam1 ? match.team2_score : match.team1_score;
      
      if (teamScore > opponentScore) return '勝';
      if (teamScore === opponentScore) return '平';
      return '負';
    }
  };

  const getResultColor = (result) => {
    switch (result) {
      case '勝': return 'green';
      case '平': return 'orange';
      case '負': return 'red';
      default: return 'default';
    }
  };

  const athletesColumns = [
    {
      title: '球衣號碼',
      dataIndex: 'jersey_number',
      key: 'jersey_number',
      width: 100,
      sorter: (a, b) => (a.jersey_number || 0) - (b.jersey_number || 0),
      sortDirections: ['ascend', 'descend'],
      render: (number) => (
        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>#{number}</span>
      ),
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
      sortDirections: ['ascend', 'descend'],
      render: (name, record) => (
        <Space>
          <span 
            style={{ 
              color: '#1890ff',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
            onClick={() => navigate(`/tournaments/${tournamentId}/athletes/${record.athlete_id}`)}
          >
            {name}
          </span>
        </Space>
      ),
    },
    {
      title: '位置',
      dataIndex: 'position',
      key: 'position',
      sorter: (a, b) => (a.position || '').localeCompare(b.position || ''),
      sortDirections: ['ascend', 'descend'],
      render: (position) => (
        <Tag color={getPositionColor(position)}>
          {getPositionText(position)}
        </Tag>
      ),
    },
    {
      title: '年齡',
      dataIndex: 'age',
      key: 'age',
      width: 80,
      sorter: (a, b) => (a.age || 0) - (b.age || 0),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: '狀態',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      sorter: (a, b) => (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1),
      sortDirections: ['ascend', 'descend'],
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '活躍' : '非活躍'}
        </Tag>
      ),
    },
  ];

  // Custom sorting function for match numbers (e.g., A01, B01, C01, A02, B02, C02)
  const sortMatchNumbers = (a, b) => {
    const aNumber = a.match_number || '';
    const bNumber = b.match_number || '';
    
    // Extract letter and number parts
    const aLetter = aNumber.charAt(0) || '';
    const bLetter = bNumber.charAt(0) || '';
    const aNum = parseInt(aNumber.slice(1)) || 0;
    const bNum = parseInt(bNumber.slice(1)) || 0;
    
    // First sort by number (01, 02, 03...)
    if (aNum !== bNum) {
      return aNum - bNum;
    }
    
    // Then sort by group letter (A, B, C, D...)
    return aLetter.localeCompare(bLetter);
  };

  const matchesColumns = [
    {
      title: '比賽編號',
      dataIndex: 'match_number',
      key: 'match_number',
      width: 120,
      sorter: (a, b) => sortMatchNumbers(a, b),
      sortDirections: ['ascend', 'descend'],
      defaultSortOrder: 'ascend',
      render: (matchNumber, record) => (
        <span 
          style={{ 
            color: '#1890ff',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
          onClick={() => navigate(`/tournaments/${tournamentId}/matches/${record.match_id}`)}
        >
          {matchNumber}
        </span>
      ),
    },
    {
      title: '對手',
      key: 'opponent',
      sorter: (a, b) => {
        const aIsTeam1 = a.team1_id === parseInt(teamId);
        const bIsTeam1 = b.team1_id === parseInt(teamId);
        const aOpponent = aIsTeam1 ? a.team2_name : a.team1_name;
        const bOpponent = bIsTeam1 ? b.team2_name : b.team1_name;
        return (aOpponent || '').localeCompare(bOpponent || '');
      },
      sortDirections: ['ascend', 'descend'],
      render: (_, record) => {
        const isTeam1 = record.team1_id === parseInt(teamId);
        const opponentName = isTeam1 ? record.team2_name : record.team1_name;
        const opponentId = isTeam1 ? record.team2_id : record.team1_id;
        return (
          <span
            style={{
              color: '#1890ff',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
            onClick={() => navigate(`/tournaments/${tournamentId}/teams/${opponentId}`)}
          >
            {getDisplayTeamName(opponentName)}
          </span>
        );
      },
    },
    {
      title: '比分',
      key: 'score',
      width: 100,
      sorter: (a, b) => {
        if (a.match_status !== 'completed' && b.match_status !== 'completed') return 0;
        if (a.match_status !== 'completed') return 1;
        if (b.match_status !== 'completed') return -1;
        
        const aIsTeam1 = a.team1_id === parseInt(teamId);
        const bIsTeam1 = b.team1_id === parseInt(teamId);
        const aTeamScore = aIsTeam1 ? a.team1_score : a.team2_score;
        const bTeamScore = bIsTeam1 ? b.team1_score : b.team2_score;
        return (aTeamScore || 0) - (bTeamScore || 0);
      },
      sortDirections: ['ascend', 'descend'],
      render: (_, record) => {
        if (record.match_status !== 'completed') return '-';
        const isTeam1 = record.team1_id === parseInt(teamId);
        const teamScore = isTeam1 ? record.team1_score : record.team2_score;
        const opponentScore = isTeam1 ? record.team2_score : record.team1_score;
        return `${teamScore} : ${opponentScore}`;
      },
    },
    {
      title: '結果',
      key: 'result',
      width: 80,
      sorter: (a, b) => {
        const aResult = getMatchResult(a);
        const bResult = getMatchResult(b);
        const resultOrder = { '勝': 3, '平': 2, '負': 1, '-': 0 };
        return (resultOrder[aResult] || 0) - (resultOrder[bResult] || 0);
      },
      sortDirections: ['ascend', 'descend'],
      render: (_, record) => {
        const result = getMatchResult(record);
        return (
          <Tag color={getResultColor(result)}>
            {result}
          </Tag>
        );
      },
    },
    {
      title: '比賽時間',
      dataIndex: 'match_date',
      key: 'match_date',
      width: 150,
      sorter: (a, b) => new Date(a.match_date || 0) - new Date(b.match_date || 0),
      sortDirections: ['ascend', 'descend'],
      render: (date) => moment(date).format('MM-DD HH:mm'),
    },
    {
      title: '狀態',
      dataIndex: 'match_status',
      key: 'match_status',
      width: 100,
      sorter: (a, b) => {
        const statusOrder = { 'pending': 1, 'active': 2, 'completed': 3 };
        return (statusOrder[a.match_status] || 0) - (statusOrder[b.match_status] || 0);
      },
      sortDirections: ['ascend', 'descend'],
      render: (status) => {
        const statusMap = {
          'pending': { color: 'orange', text: '待開始' },
          'active': { color: 'green', text: '進行中' },
          'completed': { color: 'blue', text: '已完成' }
        };
        const config = statusMap[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!teamData) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Title level={4}>找不到隊伍資料</Title>
        <Button type="primary" onClick={handleBack}>
          返回隊伍列表
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 頁面標題和操作按鈕 */}
        <Card>
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
                  返回
                </Button>
                <Title level={3} style={{ margin: 0 }}>
                  隊伍詳情
                </Title>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button 
                  type="primary" 
                  icon={<UserAddOutlined />}
                  onClick={handleAddAthlete}
                >
                  新增運動員
                </Button>
                <Button 
                  icon={<EditOutlined />}
                  onClick={handleEdit}
                >
                  編輯隊伍
                </Button>
                <Button 
                  danger 
                  icon={<DeleteOutlined />}
                  onClick={handleDeleteTeam}
                >
                  刪除隊伍
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 隊伍基本信息 */}
        <Card 
          title={
            <Space>
              <div 
                style={{
                  width: 24,
                  height: 24,
                  backgroundColor: teamData.team_color || '#1890ff',
                  borderRadius: '4px',
                  border: '1px solid #d9d9d9'
                }}
              />
              <TeamOutlined />
              <span>{getDisplayTeamName(teamData.team_name)}</span>
              {teamData.group_name && (
                <Tag color="blue">
                  小組 {getDisplayGroupName(teamData.group_name)}
                </Tag>
              )}
            </Space>
          }
        >
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Statistic
                title="總比賽場次"
                value={stats.totalMatches}
                prefix={<TrophyOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="積分"
                value={stats.points}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="進球數"
                value={stats.goalsFor}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="失球數"
                value={stats.goalsAgainst}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Col>
          </Row>
        </Card>

        {/* 詳細信息 */}
        <Card title="隊伍詳情" extra={<TeamOutlined />}>
          <Descriptions bordered column={2}>
            <Descriptions.Item label="隊伍名稱">
              {getDisplayTeamName(teamData.team_name)}
            </Descriptions.Item>
            <Descriptions.Item label="隊伍顏色">
              <Space>
                <div 
                  style={{
                    width: 20,
                    height: 20,
                    backgroundColor: teamData.team_color || '#1890ff',
                    borderRadius: '4px',
                    border: '1px solid #d9d9d9'
                  }}
                />
                {teamData.team_color || '#1890ff'}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="所屬小組">
              {teamData.group_name ? (
                <Tag color="blue">小組 {getDisplayGroupName(teamData.group_name)}</Tag>
              ) : (
                <Text type="secondary">未分配</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="運動員數量">
              {athletes.length} 人
            </Descriptions.Item>
            <Descriptions.Item label="勝場">
              <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{stats.wins}</span>
            </Descriptions.Item>
            <Descriptions.Item label="平場">
              <span style={{ color: '#faad14', fontWeight: 'bold' }}>{stats.draws}</span>
            </Descriptions.Item>
            <Descriptions.Item label="負場">
              <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{stats.losses}</span>
            </Descriptions.Item>
            <Descriptions.Item label="淨勝球">
              <span style={{ 
                color: stats.goalDifference > 0 ? '#52c41a' : stats.goalDifference < 0 ? '#ff4d4f' : '#666',
                fontWeight: 'bold'
              }}>
                {stats.goalDifference > 0 ? '+' : ''}{stats.goalDifference}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="創建時間">
              {moment(teamData.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="更新時間">
              {moment(teamData.updated_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 運動員列表 */}
        <Card 
          title={
            <Space>
              <UserOutlined />
              <span>運動員名單 ({athletes.length})</span>
            </Space>
          }
          extra={
            <Button 
              type="primary" 
              icon={<UserAddOutlined />}
              onClick={handleAddAthlete}
            >
              新增運動員
            </Button>
          }
        >
          <Table
            columns={athletesColumns}
            dataSource={athletes}
            rowKey="athlete_id"
            pagination={false}
            size="small"
          />
          {athletes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <UserOutlined style={{ fontSize: '48px', marginBottom: 16 }} />
              <div>暫無運動員</div>
              <Button 
                type="primary" 
                icon={<UserAddOutlined />}
                onClick={handleAddAthlete}
                style={{ marginTop: 16 }}
              >
                新增第一位運動員
              </Button>
            </div>
          )}
        </Card>

        {/* 比賽記錄 */}
        <Card 
          title={
            <Space>
              <TrophyOutlined />
              <span>比賽記錄 ({matches.length})</span>
            </Space>
          }
        >
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
            size="small"
          />
          {matches.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <TrophyOutlined style={{ fontSize: '48px', marginBottom: 16 }} />
              <div>暫無比賽記錄</div>
            </div>
          )}
        </Card>
      </Space>
    </div>
  );
};

export default TournamentTeamDetail;