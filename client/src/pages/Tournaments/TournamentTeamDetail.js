import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Space, Table, Tag, Descriptions, Row, Col, Statistic, message, Modal, Spin } from 'antd';
import { ArrowLeftOutlined, EditOutlined, UserAddOutlined, TrophyOutlined, TeamOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['team', 'athlete', 'match', 'common']);
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
          message.error(t('team:detail.teamNotBelongToTournament'));
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
        message.error(t('common:messages.loadFailed'));
        navigate(`/tournaments/${tournamentId}/teams`);
      }
    } catch (error) {
      console.error('獲取隊伍詳情錯誤:', error);
      message.error(t('common:messages.loadFailed'));
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
      message.error(t('team:detail.cannotLoadMatchInfo'));
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
      title: t('team:detail.deleteConfirmation'),
      content: t('team:detail.deleteWarning', { teamName: getDisplayTeamName(teamData.team_name) }),
      okText: t('common:actions.confirm'),
      cancelText: t('common:actions.cancel'),
      onOk: async () => {
        try {
          const response = await axios.delete(`/api/teams/${teamId}`);
          if (response.data.success) {
            message.success(t('team:messages.teamDeleted'));
            navigate(`/tournaments/${tournamentId}/teams`);
          }
        } catch (error) {
          console.error('刪除隊伍錯誤:', error);
          message.error(t('common:messages.operationFailed'));
        }
      }
    });
  };

  const getPositionText = (position) => {
    return t(`team:detail.positions.${position}`, { defaultValue: position });
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
      return t('team:detail.matchResults.win');
    } else if (match.winner_id === null) {
      return t('team:detail.matchResults.draw');
    } else if (match.winner_id) {
      return t('team:detail.matchResults.loss');
    } else {
      // Fallback to score-based calculation if winner_id is not set
      const isTeam1 = match.team1_id === parseInt(teamId);
      const teamScore = isTeam1 ? match.team1_score : match.team2_score;
      const opponentScore = isTeam1 ? match.team2_score : match.team1_score;
      
      if (teamScore > opponentScore) return t('team:detail.matchResults.win');
      if (teamScore === opponentScore) return t('team:detail.matchResults.draw');
      return t('team:detail.matchResults.loss');
    }
  };

  const getResultColor = (result) => {
    const winText = t('team:detail.matchResults.win');
    const drawText = t('team:detail.matchResults.draw');
    const lossText = t('team:detail.matchResults.loss');
    
    switch (result) {
      case winText: return 'green';
      case drawText: return 'orange';
      case lossText: return 'red';
      default: return 'default';
    }
  };

  const athletesColumns = [
    {
      title: t('team:detail.columns.jerseyNumber'),
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
      title: t('team:detail.columns.name'),
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
      title: t('team:detail.columns.position'),
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
      title: t('team:detail.columns.age'),
      dataIndex: 'age',
      key: 'age',
      width: 80,
      sorter: (a, b) => (a.age || 0) - (b.age || 0),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: t('team:detail.columns.status'),
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      sorter: (a, b) => (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1),
      sortDirections: ['ascend', 'descend'],
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? t('team:detail.status.active') : t('team:detail.status.inactive')}
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
      title: t('team:detail.columns.matchNumber'),
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
      title: t('team:detail.columns.opponent'),
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
      title: t('team:detail.columns.score'),
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
      title: t('team:detail.columns.result'),
      key: 'result',
      width: 80,
      sorter: (a, b) => {
        const aResult = getMatchResult(a);
        const bResult = getMatchResult(b);
        const winText = t('team:detail.matchResults.win');
        const drawText = t('team:detail.matchResults.draw');
        const lossText = t('team:detail.matchResults.loss');
        const resultOrder = { [winText]: 3, [drawText]: 2, [lossText]: 1, '-': 0 };
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
      title: t('team:detail.columns.matchTime'),
      dataIndex: 'match_date',
      key: 'match_date',
      width: 150,
      sorter: (a, b) => new Date(a.match_date || 0) - new Date(b.match_date || 0),
      sortDirections: ['ascend', 'descend'],
      render: (date) => moment(date).format('MM-DD HH:mm'),
    },
    {
      title: t('team:detail.columns.matchStatus'),
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
          'pending': { color: 'orange', text: t('team:detail.status.pending') },
          'inProgress': { color: 'green', text: t('team:detail.status.inProgress') },
          'completed': { color: 'blue', text: t('team:detail.status.completed') }
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
        <Title level={4}>{t('team:detail.teamNotFound')}</Title>
        <Button type="primary" onClick={handleBack}>
          {t('team:detail.backToTeamList')}
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
                  {t('team:detail.backToList')}
                </Button>
                <Title level={3} style={{ margin: 0 }}>
                  {t('team:detail.title')}
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
                  {t('team:detail.addAthlete')}
                </Button>
                <Button 
                  icon={<EditOutlined />}
                  onClick={handleEdit}
                >
                  {t('team:detail.editTeam')}
                </Button>
                <Button 
                  danger 
                  icon={<DeleteOutlined />}
                  onClick={handleDeleteTeam}
                >
                  {t('team:detail.deleteTeam')}
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
                  {t('team:detail.info.group')} {getDisplayGroupName(teamData.group_name)}
                </Tag>
              )}
            </Space>
          }
        >
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Statistic
                title={t('team:detail.stats.totalMatches')}
                value={stats.totalMatches}
                prefix={<TrophyOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={t('team:detail.stats.points')}
                value={stats.points}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={t('team:detail.stats.goalsFor')}
                value={stats.goalsFor}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={t('team:detail.stats.goalsAgainst')}
                value={stats.goalsAgainst}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Col>
          </Row>
        </Card>

        {/* 詳細信息 */}
        <Card title={t('team:detail.teamInfo')} extra={<TeamOutlined />}>
          <Descriptions bordered column={2}>
            <Descriptions.Item label={t('team:detail.info.teamName')}>
              {getDisplayTeamName(teamData.team_name)}
            </Descriptions.Item>
            <Descriptions.Item label={t('team:detail.info.teamColor')}>
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
            <Descriptions.Item label={t('team:detail.info.group')}>
              {teamData.group_name ? (
                <Tag color="blue">{t('team:detail.info.group')} {getDisplayGroupName(teamData.group_name)}</Tag>
              ) : (
                <Text type="secondary">{t('team:detail.info.unassigned')}</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label={t('team:detail.info.athleteCount')}>
              {athletes.length} {t('team:detail.info.people')}
            </Descriptions.Item>
            <Descriptions.Item label={t('team:detail.stats.wins')}>
              <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{stats.wins}</span>
            </Descriptions.Item>
            <Descriptions.Item label={t('team:detail.stats.draws')}>
              <span style={{ color: '#faad14', fontWeight: 'bold' }}>{stats.draws}</span>
            </Descriptions.Item>
            <Descriptions.Item label={t('team:detail.stats.losses')}>
              <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{stats.losses}</span>
            </Descriptions.Item>
            <Descriptions.Item label={t('team:detail.stats.goalDifference')}>
              <span style={{ 
                color: stats.goalDifference > 0 ? '#52c41a' : stats.goalDifference < 0 ? '#ff4d4f' : '#666',
                fontWeight: 'bold'
              }}>
                {stats.goalDifference > 0 ? '+' : ''}{stats.goalDifference}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label={t('team:detail.info.createdAt')}>
              {moment(teamData.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label={t('team:detail.info.updatedAt')}>
              {moment(teamData.updated_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            {teamData.description && (
              <Descriptions.Item label={t('team:detail.info.description')} span={2}>
                {teamData.description}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* 運動員列表 */}
        <Card 
          title={
            <Space>
              <UserOutlined />
              <span>{t('team:detail.athleteList')} ({athletes.length})</span>
            </Space>
          }
          extra={
            <Button 
              type="primary" 
              icon={<UserAddOutlined />}
              onClick={handleAddAthlete}
            >
              {t('team:detail.addAthlete')}
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
              <div>{t('team:detail.noAthletes')}</div>
              <Button 
                type="primary" 
                icon={<UserAddOutlined />}
                onClick={handleAddAthlete}
                style={{ marginTop: 16 }}
              >
                {t('team:detail.addFirstAthlete')}
              </Button>
            </div>
          )}
        </Card>

        {/* 比賽記錄 */}
        <Card 
          title={
            <Space>
              <TrophyOutlined />
              <span>{t('team:detail.matchRecords')} ({matches.length})</span>
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
                t('common:pagination.total', { start: range[0], end: range[1], total }),
            }}
            size="small"
          />
          {matches.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <TrophyOutlined style={{ fontSize: '48px', marginBottom: 16 }} />
              <div>{t('team:detail.noMatches')}</div>
            </div>
          )}
        </Card>
      </Space>
    </div>
  );
};

export default TournamentTeamDetail;