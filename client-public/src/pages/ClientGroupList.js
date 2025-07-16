import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Table, 
  Space, 
  Tag,
  Spin,
  Alert,
  Statistic,
  Row,
  Col,
  Progress,
  Button
} from 'antd';
import { 
  TeamOutlined,
  TrophyOutlined,
  CalendarOutlined,
  FireOutlined,
  UsergroupAddOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const { Title, Text } = Typography;

const ClientGroupList = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['group', 'common']);
  
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

  const [tournament, setTournament] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalTeams: 0,
    totalMatches: 0,
    completedMatches: 0
  });

  useEffect(() => {
    fetchGroupsData();
  }, []);

  const fetchGroupsData = async () => {
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
        setError(t('messages.noTournamentFound', { defaultValue: '找不到可顯示的錦標賽' }));
        return;
      }

      setTournament(tournamentData);
      const tournamentId = tournamentData.tournament_id;

      // Fetch groups data - try tournament-specific endpoint first, then fallback to general groups
      let groupsResponse;
      try {
        groupsResponse = await axios.get(`/api/tournaments/${tournamentId}/groups`);
      } catch (tournamentGroupsError) {
        // Fallback to general groups endpoint
        groupsResponse = await axios.get('/api/groups');
      }

      if (groupsResponse.data.success) {
        const groupsData = groupsResponse.data.data;
        const groupsList = Array.isArray(groupsData) ? groupsData : (groupsData.groups || []);
        
        // Filter groups for this tournament if using general endpoint
        const filteredGroups = groupsList.filter(group => 
          !group.tournament_id || group.tournament_id === tournamentId
        );

        // Fetch matches data for each group to calculate progress
        const groupsWithMatches = await Promise.all(
          filteredGroups.map(async (group) => {
            try {
              const matchesResponse = await axios.get(`/api/tournaments/${tournamentId}/groups/${group.group_id}/matches`);
              if (matchesResponse.data.success) {
                const matches = matchesResponse.data.data || [];
                const completedMatches = matches.filter(match => match.match_status === 'completed').length;
                return {
                  ...group,
                  matches,
                  completed_matches: completedMatches,
                  total_matches: matches.length
                };
              }
            } catch (error) {
              console.warn(`Failed to fetch matches for group ${group.group_id}:`, error);
            }
            return group;
          })
        );
        
        setGroups(groupsWithMatches);
        
        // Calculate statistics
        const totalTeams = groupsWithMatches.reduce((sum, group) => sum + (group.team_count || 0), 0);
        const totalMatches = groupsWithMatches.reduce((sum, group) => sum + (group.total_matches || 0), 0);
        const completedMatches = groupsWithMatches.reduce((sum, group) => sum + (group.completed_matches || 0), 0);
        
        setStats({
          totalGroups: groupsWithMatches.length,
          totalTeams,
          totalMatches,
          completedMatches
        });
      }

    } catch (error) {
      console.error('Error fetching groups data:', error);
      setError(t('messages.loadingGroups'));
    } finally {
      setLoading(false);
    }
  };

  const getGroupStatus = (group) => {
    const totalMatches = group.total_matches || 0;
    const completedMatches = group.completed_matches || 0;
    
    if (totalMatches === 0) {
      return { status: 'not-started', text: t('common:status.notStarted', { defaultValue: '未開始' }), color: 'default' };
    } else if (completedMatches === totalMatches) {
      return { status: 'completed', text: t('common:status.completed', { defaultValue: '已完成' }), color: 'success' };
    } else if (completedMatches > 0) {
      return { status: 'in-progress', text: t('common:status.inProgress', { defaultValue: '進行中' }), color: 'processing' };
    } else {
      return { status: 'scheduled', text: t('common:status.scheduled', { defaultValue: '已排程' }), color: 'warning' };
    }
  };

  const getMatchProgress = (group) => {
    const total = group.total_matches || 0;
    const completed = group.completed_matches || 0;
    
    // If completed_matches is not provided or is 0, but we have matches data, calculate it
    if (completed === 0 && group.matches && Array.isArray(group.matches)) {
      const calculatedCompleted = group.matches.filter(match => match.match_status === 'completed').length;
      return total > 0 ? Math.round((calculatedCompleted / total) * 100) : 0;
    }
    
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const columns = [
    {
      title: t('group:group.name'),
      dataIndex: 'group_name',
      key: 'group_name',
      render: (name, record) => (
        <Space direction="vertical" size="small">
          <Text strong style={{ fontSize: '16px' }}>{getDisplayGroupName(name)}</Text>
          {record.tournament_name && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.tournament_name}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: t('group:group.teams'),
      dataIndex: 'team_count',
      key: 'team_count',
      align: 'center',
      render: (count, record) => (
        <Space direction="vertical" size="small" style={{ textAlign: 'center' }}>
          <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
            {count || 0}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            / {record.max_teams || 4}
          </Text>
        </Space>
      ),
    },
    {
      title: t('group:group.progress'),
      key: 'match_progress',
      align: 'center',
      render: (_, record) => {
        const progress = getMatchProgress(record);
        const total = record.total_matches || 0;
        const completed = record.completed_matches || 0;
        
        return (
          <Space direction="vertical" size="small" style={{ textAlign: 'center' }}>
            <Progress 
              percent={progress} 
              size="small" 
              status={progress === 100 ? 'success' : 'active'}
              style={{ minWidth: '80px' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {completed} / {total}
            </Text>
          </Space>
        );
      },
    },
    {
      title: t('group:group.status'),
      key: 'status',
      align: 'center',
      render: (_, record) => {
        const status = getGroupStatus(record);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: t('common:actions.actions'),
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Button 
          type="primary" 
          size="small"
          icon={<TeamOutlined />}
          onClick={() => navigate(`/groups/${record.group_id}`)}
        >
          {t('common:actions.viewDetails')}
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>{t('messages.loadingGroups')}</Text>
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
            <Button size="small" onClick={fetchGroupsData}>
              {t('common:actions.reload')}
            </Button>
          }
        />
      </div>
    );
  }

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
                <Text type="secondary">{t('group:group.list')}</Text>
              </Space>
            </Col>
            <Col>
              <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
                {tournament.status === 'active' ? t('common:status.inProgress') : tournament.status}
              </Tag>
            </Col>
          </Row>
        </Card>
      )}

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('messages.totalGroups')}
              value={stats.totalGroups}
              prefix={<UsergroupAddOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('common:stats.totalTeams')}
              value={stats.totalTeams}
              prefix={<TeamOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('common:stats.totalMatches')}
              value={stats.totalMatches}
              prefix={<CalendarOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('common:stats.completedMatches')}
              value={stats.completedMatches}
              prefix={<PlayCircleOutlined style={{ color: '#f5222d' }} />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Groups Table */}
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={3}>
            <UsergroupAddOutlined style={{ marginRight: 8 }} />
            {t('group:group.list')}
          </Title>
        </div>
        
        <Table
          columns={columns}
          dataSource={groups}
          rowKey="group_id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              t('common:pagination.showTotal', { 
                start: range[0], 
                end: range[1], 
                total: total,
                defaultValue: `第 ${range[0]}-${range[1]} 項，共 ${total} 個小組`
              }),
            pageSizeOptions: ['10', '20', '50', '100'],
            defaultPageSize: 20
          }}
          locale={{
            emptyText: (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <UsergroupAddOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">{t('messages.noGroups')}</Text>
                </div>
              </div>
            )
          }}
        />
      </Card>
    </div>
  );
};

export default ClientGroupList;